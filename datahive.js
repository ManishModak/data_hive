require('dotenv').config();
const axios = require('axios');
const winston = require('winston');
const os = require('os');
const puppeteer = require('puppeteer');
const yaml = require('js-yaml');

// Logger setup
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                })
            )
        }),
        new winston.transports.File({
            filename: 'datahive.log',
            maxsize: 10485760, // 10MB
            maxFiles: 3
        })
    ]
});

// Separate logger for job details (no color, writes to file)
const jobLogger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.File({ filename: 'jobs.log', maxsize: 5242880, maxFiles: 2 })
    ]
});

// Configuration
const CONFIG = {
    BASE_URL: 'https://api.datahive.ai/api',
    APP_VERSION: '0.2.4',
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    JOB_INTERVAL: 60000, // 60s
    PING_INTERVAL: 120000 // 2m
};

class ApiClient {
    constructor() {
        this.baseUrl = CONFIG.BASE_URL;
        this.jwt = process.env.DATAHIVE_JWT;
        this.deviceId = process.env.DATAHIVE_DEVICE_ID;

        if (!this.jwt || !this.deviceId) {
            logger.error("Missing JWT or DEVICE_ID in .env file");
            process.exit(1);
        }
    }

    async getHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-App-Version': CONFIG.APP_VERSION,
            'X-User-Agent': CONFIG.USER_AGENT,
            'X-Device-Type': 'extension',
            'Authorization': `Bearer ${this.jwt}`,
            'X-Device-Id': this.deviceId,
            // Device Info Headers for Dashboard Description
            'X-Device-OS': 'Windows 10',
            'X-User-Language': 'en-US',
            // Mock CPU headers
            'X-CPU-Architecture': 'amd64',
            'X-CPU-Model': 'Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz',
            'X-CPU-Processor-Count': '8'
        };
    }

    async makeRequest(endpoint, options = {}) {
        try {
            const headers = await this.getHeaders();
            const response = await axios({
                url: `${this.baseUrl}${endpoint}`,
                headers: { ...headers, ...options.headers },
                method: options.method || 'GET',
                data: options.body,
                validateStatus: () => true // Handle status manually
            });

            if (response.status >= 200 && response.status < 300) {
                return response.data;
            } else {
                throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            logger.error(`Request failed to ${endpoint}: ${error.message}`);
            throw error;
        }
    }

    async ping() {
        try {
            await this.makeRequest('/ping', { method: 'POST' });
            logger.info('Ping successful');
            return true;
        } catch (e) {
            return false;
        }
    }

    async getConfiguration() {
        return this.makeRequest('/configuration');
    }

    async getJob() {
        return this.makeRequest('/job');
    }

    async completeJob(jobId, result, metadata = {}) {
        return this.makeRequest(`/job/${jobId}`, {
            method: 'POST',
            body: {
                result,
                metadata,
                context: 'extension'
            }
        });
    }

    async reportError(jobId, error, metadata = {}) {
        return this.makeRequest(`/job/${jobId}/error`, {
            method: 'POST',
            body: {
                error,
                metadata,
                context: 'extension'
            }
        });
    }
}

class Scraper {
    constructor() {
        this.browser = null;
    }

    async init() {
        if (!this.browser) {
            logger.info('Launching Puppeteer browser...');
            this.browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async extractData(url, rules) {
        await this.init();
        const page = await this.browser.newPage();
        try {
            logger.info(`Navigating to ${url}...`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            const result = await page.evaluate((rules) => {
                const data = {};

                const getByXPath = (xpath, context = document) => {
                    const result = document.evaluate(xpath, context, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    return result.singleNodeValue;
                };

                if (rules && rules.fields) {
                    for (const field of rules.fields) {
                        if (field.xpath) {
                            const node = getByXPath(field.xpath);
                            if (node) {
                                data[field.field_name] = node.textContent.trim();
                            }
                        }
                    }
                }

                if (!rules || !rules.fields || rules.fields.length === 0) {
                    return {
                        html: document.documentElement.outerHTML,
                        text: document.body.innerText
                    };
                }

                return data;
            }, rules);

            return result;

        } catch (error) {
            logger.error(`Scraping failed for ${url}: ${error.message}`);
            throw error;
        } finally {
            await page.close();
        }
    }
}

class JobManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.isRunning = false;
        this.scraper = new Scraper();
        this.jobInterval = CONFIG.JOB_INTERVAL;
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        logger.info('Starting JobManager...');

        // Fetch configuration to get dynamic job interval
        try {
            const config = await this.apiClient.getConfiguration();
            if (config && config.job_execution_delay) {
                // Add 5 seconds buffer to be safe
                this.jobInterval = (config.job_execution_delay * 1000) + 5000;
                logger.info(`Updated job interval to ${this.jobInterval}ms from server config (with 5s buffer)`);
            }
        } catch (e) {
            logger.warn('Failed to fetch configuration, using default interval:', e.message);
        }

        setInterval(() => this.apiClient.ping(), CONFIG.PING_INTERVAL);
        this.apiClient.ping();

        this.jobLoop();
    }

    async jobLoop() {
        while (this.isRunning) {
            try {
                const job = await this.apiClient.getJob();

                if (job && job.id) {
                    logger.info(`Received job: ${job.id}`);
                    await this.processJob(job);
                } else {
                    logger.debug('No job received');
                }

                await new Promise(resolve => setTimeout(resolve, this.jobInterval));

            } catch (error) {
                logger.error('Error in job loop:', error.message);

                // Handle 429 Rate Limit specifically
                if (error.message.includes('429')) {
                    logger.warn('Rate limit hit. Backing off for double the interval...');
                    await new Promise(resolve => setTimeout(resolve, this.jobInterval * 2));
                } else {
                    // Normal error, wait normal interval
                    await new Promise(resolve => setTimeout(resolve, this.jobInterval));
                }
            }
        }
    }

    // Helper to replace variables in strings/objects
    replaceVariables(target, variables) {
        if (typeof target === 'string') {
            return target.replace(/\{\{\s*vars\.(.*?)\s*\}\}/g, (_, key) => {
                const trimmedKey = key.trim();
                if (variables.hasOwnProperty(trimmedKey)) {
                    return variables[trimmedKey];
                }
                logger.warn(`Variable not found: ${trimmedKey}`);
                return `{{vars.${trimmedKey}}}`;
            });
        } else if (Array.isArray(target)) {
            return target.map(item => this.replaceVariables(item, variables));
        } else if (typeof target === 'object' && target !== null) {
            const newObj = {};
            for (const key in target) {
                newObj[key] = this.replaceVariables(target[key], variables);
            }
            return newObj;
        }
        return target;
    }

    async processJob(job) {
        try {
            logger.info('Processing job:', job.id);

            // Log full job to file for debugging
            jobLogger.info('='.repeat(80));
            jobLogger.info(`JOB ID: ${job.id}`);
            jobLogger.info('FULL JOB OBJECT:');
            jobLogger.info(JSON.stringify(job, null, 2));
            jobLogger.info('='.repeat(80));

            let result = null;
            let executed = false;

            // Extract variables from job (job.vars is the actual property name!)
            const variables = job.vars || job.variables || job.params || {};
            logger.debug('Job variables:', JSON.stringify(variables));
            jobLogger.info(`EXTRACTED VARIABLES: ${JSON.stringify(variables, null, 2)}`);

            if (job.ruleCollection && job.ruleCollection.yamlRules) {
                try {
                    const parsedRules = yaml.load(job.ruleCollection.yamlRules);

                    if (parsedRules && parsedRules.steps) {
                        for (const step of parsedRules.steps) {
                            // Substitute variables in the step configuration
                            const processedStep = this.replaceVariables(step, variables);

                            logger.info(`Executing step: ${processedStep.use}`);

                            if (processedStep.use === 'offscreen' || processedStep.use === 'fetch-and-extract') {
                                const url = processedStep.url || job.url;
                                const rules = processedStep.rules;

                                if (url) {
                                    result = await this.scraper.extractData(url, rules);
                                    executed = true;
                                } else {
                                    logger.warn('No URL found for offscreen step');
                                }
                            } else if (processedStep.use === 'fetch') {
                                logger.info(`Fetching ${processedStep.url}...`);
                                const response = await axios.get(processedStep.url);
                                result = { data: response.data };
                                executed = true;
                            } else {
                                logger.warn(`Unsupported step type: ${processedStep.use}`);
                            }
                        }
                    }
                } catch (e) {
                    logger.error('Failed to parse/execute YAML rules:', e);
                    // Don't throw here, try fallback
                }
            }

            if (!executed) {
                // Fallback for legacy/undefined job types
                if (job.type === 'offscreen' || job.type === 'fetch-and-extract') {
                    let url = job.params?.url || job.url;
                    let rules = job.params?.rules || job.ruleCollection;

                    // Apply substitution
                    url = this.replaceVariables(url, variables);
                    rules = this.replaceVariables(rules, variables);

                    if (url) {
                        result = await this.scraper.extractData(url, rules);
                    } else {
                        logger.warn('No URL for fallback job processing');
                    }
                } else {
                    logger.warn(`No executable steps found for job ${job.id}. Returning placeholder.`);
                    result = { status: "skipped", reason: "no_steps" };
                }
            }

            await this.apiClient.completeJob(job.id, result);
            logger.info(`Job ${job.id} completed successfully.`);

        } catch (error) {
            logger.error(`Failed to process job ${job.id}:`, error);
            await this.apiClient.reportError(job.id, "PROCESSING_FAILED", { message: error.message });
        }
    }
}

async function main() {
    const apiClient = new ApiClient();
    const jobManager = new JobManager(apiClient);

    await jobManager.start();
}

main().catch(err => {
    logger.error('Fatal error:', err);
    process.exit(1);
});
