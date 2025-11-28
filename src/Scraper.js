const puppeteer = require('puppeteer');

/**
 * Enhanced Scraper with Header Interception
 * Strips headers that block iframe embedding (X-Frame-Options, CSP, etc.)
 */
class Scraper {
    constructor() {
        this.browser = null;
        this.headersToStrip = [
            'x-frame-options',
            'frame-options',
            'content-security-policy',
            'content-security-policy-report-only'
        ];
    }

    /**
     * Initialize the browser
     */
    async init() {
        if (!this.browser) {
            console.log('[Scraper] Launching Puppeteer browser...');
            this.browser = await puppeteer.launch({
                headless: "new",
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security', // Helps with CORS
                    '--disable-features=IsolateOrigins,site-per-process' // Helps with frames
                ]
            });
        }
    }

    /**
     * Create a new page with header interception
     * @returns {Promise<Page>} Puppeteer page with request interception enabled
     */
    async createPage() {
        await this.init();
        const page = await this.browser.newPage();

        // Enable request interception
        await page.setRequestInterception(true);

        // Intercept and modify requests
        page.on('request', (interceptedRequest) => {
            const headers = { ...interceptedRequest.headers() };

            // Remove headers that might cause issues
            delete headers['sec-fetch-dest'];
            delete headers['sec-fetch-mode'];
            delete headers['sec-fetch-site'];
            delete headers['sec-fetch-user'];

            // Continue with modified headers
            interceptedRequest.continue({ headers });
        });

        console.log('[Scraper] Created page with request interception');

        return page;
    }

    /**
     * Extract data from a URL using XPath rules
     * @param {string} url - URL to scrape
     * @param {Object} rules - Extraction rules
     * @param {Array} rules.fields - Field definitions with XPath
     * @returns {Promise<Object>} Extracted data
     */
    async extractData(url, rules) {
        const page = await this.createPage();

        try {
            console.log(`[Scraper] Navigating to ${url}...`);
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });

            // Extract data using XPath in browser context
            const result = await page.evaluate((rules) => {
                const data = {};

                /**
                 * Evaluate XPath and get single node
                 */
                const getByXPath = (xpath, context = document) => {
                    const result = document.evaluate(
                        xpath,
                        context,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    );
                    return result.singleNodeValue;
                };

                /**
                 * Evaluate XPath and get all matching nodes
                 */
                const getAllByXPath = (xpath, context = document) => {
                    const result = document.evaluate(
                        xpath,
                        context,
                        null,
                        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                        null
                    );
                    const nodes = [];
                    for (let i = 0; i < result.snapshotLength; i++) {
                        nodes.push(result.snapshotItem(i));
                    }
                    return nodes;
                };

                // Process extraction rules
                if (rules && rules.fields) {
                    for (const field of rules.fields) {
                        if (field.xpath) {
                            // Determine if we want single or multiple values
                            const isTextNode = field.xpath.endsWith('/text()');
                            const isSingleAttr = field.xpath.match(/@[\w-]+$/);

                            if (isTextNode || isSingleAttr) {
                                // Single value extraction
                                const node = getByXPath(field.xpath);
                                if (node) {
                                    data[field.field_name] = node.textContent ?
                                        node.textContent.trim() :
                                        node.nodeValue;
                                } else {
                                    data[field.field_name] = null;
                                }
                            } else {
                                // Multiple value extraction
                                const nodes = getAllByXPath(field.xpath);
                                if (nodes.length > 0) {
                                    data[field.field_name] = nodes.map(node =>
                                        node.textContent ? node.textContent.trim() : node.nodeValue
                                    );
                                } else {
                                    data[field.field_name] = null;
                                }
                            }
                        }
                    }
                }

                // If no rules, return full page content
                if (!rules || !rules.fields || rules.fields.length === 0) {
                    return {
                        html: document.documentElement.outerHTML,
                        text: document.body.innerText,
                        url: document.location.href,
                        title: document.title
                    };
                }

                return data;

            }, rules);

            console.log('[Scraper] Extraction complete');
            return result;

        } catch (error) {
            console.error(`[Scraper] Failed to scrape ${url}:`, error.message);
            throw error;
        } finally {
            await page.close();
        }
    }

    /**
     * Close the browser
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('[Scraper] Browser closed');
        }
    }
}

module.exports = Scraper;
