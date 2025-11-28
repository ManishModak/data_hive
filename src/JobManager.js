const yaml = require('js-yaml');
const { logger, jobLogger } = require('./logger');
const CONFIG = require('./config');
const { ToolRegistry, ConditionalGateTool, FetchTool, OffscreenTool, FetchAndExtractTool } = require('./tools');
const PerformanceMonitor = require('./PerformanceMonitor');
const ConfigManager = require('./ConfigManager');
const Scraper = require('./Scraper');

/**
 * Modular Job Manager with Tool Registry
 */
class JobManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.isRunning = false;

        // Initialize modular components
        this.toolRegistry = new ToolRegistry();
        this.performanceMonitor = new PerformanceMonitor();
        this.configManager = new ConfigManager(apiClient);
        this.scraper = new Scraper();

        // Register all tools
        this.registerTools();

        logger.info('JobManager initialized with modular architecture');
        logger.info(`Registered tools: ${this.toolRegistry.list().join(', ')}`);
    }

    /**
     * Register all available tools
     */
    registerTools() {
        this.toolRegistry.register(new ConditionalGateTool());
        this.toolRegistry.register(new FetchTool());
        this.toolRegistry.register(new OffscreenTool(this.scraper));
        this.toolRegistry.register(new FetchAndExtractTool());
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        logger.info('Starting JobManager with modular tools...');

        // Fetch dynamic configuration
        await this.configManager.fetchConfiguration();
        this.configManager.print();

        // Setup ping interval
        setInterval(() => this.apiClient.ping(), CONFIG.PING_INTERVAL);
        this.apiClient.ping();

        // Start job loop
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

                // Use dynamic interval from config
                const interval = this.configManager.get('jobInterval', CONFIG.JOB_INTERVAL);
                await new Promise(resolve => setTimeout(resolve, interval));

            } catch (error) {
                logger.error('Error in job loop:', error.message);

                // Handle 429 Rate Limit
                if (error.message.includes('429')) {
                    const interval = this.configManager.get('jobInterval', CONFIG.JOB_INTERVAL);
                    logger.warn('Rate limit hit. Backing off...');
                    await new Promise(resolve => setTimeout(resolve, interval * 2));
                } else {
                    const interval = this.configManager.get('jobInterval', CONFIG.JOB_INTERVAL);
                    await new Promise(resolve => setTimeout(resolve, interval));
                }
            }
        }
    }

    /**
     * Replace variables in strings/objects
     */
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

    /**
     * Process job using modular tool system
     */
    async processJob(job) {
        const enableTracking = this.configManager.get('enablePerformanceTracking', false);

        // Start performance monitoring if enabled
        if (enableTracking) {
            this.performanceMonitor.startMeasurement(job.id);
        }

        try {
            logger.info('Processing job:', job.id);

            // Log full job to file
            jobLogger.info('='.repeat(80));
            jobLogger.info(`JOB ID: ${job.id}`);
            jobLogger.info('FULL JOB OBJECT:');
            jobLogger.info(JSON.stringify(job, null, 2));
            jobLogger.info('='.repeat(80));

            let result = null;
            let executed = false;

            // Extract variables
            const variables = job.vars || job.variables || job.params || {};
            logger.debug('Job variables:', JSON.stringify(variables));
            jobLogger.info(`EXTRACTED VARIABLES: ${JSON.stringify(variables, null, 2)}`);

            // Context for tool execution
            const context = {
                jobId: job.id,
                logger,
                variables: {}
            };

            // Parse and execute YAML rules using tool registry
            if (job.ruleCollection && job.ruleCollection.yamlRules) {
                try {
                    const parsedRules = yaml.load(job.ruleCollection.yamlRules);

                    if (parsedRules && parsedRules.steps) {
                        for (const step of parsedRules.steps) {
                            // Substitute variables in step configuration
                            const processedStep = this.replaceVariables(step, variables);

                            logger.info(`Executing step: ${processedStep.use}`);

                            // Execute using tool registry
                            const toolResult = await this.toolRegistry.execute(
                                processedStep.use,
                                processedStep,
                                context
                            );

                            // Store result
                            if (toolResult && toolResult.result) {
                                result = toolResult.result;
                                executed = true;
                            }

                            // Check if we should continue
                            if (toolResult && toolResult.shouldContinue === false) {
                                logger.info('Step indicated to stop processing');
                                break;
                            }
                        }
                    }
                } catch (e) {
                    logger.error('Failed to parse/execute YAML rules:', e);
                    throw e;
                }
            }

            // Fallback for legacy jobs
            if (!executed) {
                if (job.type === 'offscreen' || job.type === 'fetch-and-extract') {
                    let url = job.params?.url || job.url;
                    let rules = job.params?.rules || job.ruleCollection;

                    url = this.replaceVariables(url, variables);
                    rules = this.replaceVariables(rules, variables);

                    if (url) {
                        const toolResult = await this.toolRegistry.execute('offscreen', { url, rules }, context);
                        result = toolResult.result;
                    } else {
                        logger.warn('No URL for fallback job processing');
                    }
                } else {
                    logger.warn(`No executable steps found for job ${job.id}`);
                    result = { status: "skipped", reason: "no_steps" };
                }
            }

            // Stop performance monitoring and include metrics
            let metrics = {};
            if (enableTracking) {
                metrics = this.performanceMonitor.stopMeasurement(job.id);
            }

            // Complete job with result and metrics
            await this.apiClient.completeJob(job.id, result, metrics);
            logger.info(`Job ${job.id} completed successfully`);

        } catch (error) {
            logger.error(`Failed to process job ${job.id}:`, error);

            // Stop monitoring on error
            if (enableTracking) {
                this.performanceMonitor.stopMeasurement(job.id);
            }

            await this.apiClient.reportError(job.id, "PROCESSING_FAILED", { message: error.message });
        }
    }

    async stop() {
        this.isRunning = false;
        await this.scraper.close();
        this.performanceMonitor.clearAll();
        logger.info('JobManager stopped');
    }
}

module.exports = JobManager;
