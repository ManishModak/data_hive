const Tool = require('./Tool');

/**
 * OffscreenTool - Puppeteer-based web scraping tool
 * Extracts data from web pages using XPath selectors
 * 
 * Example usage:
 * {
 *   url: "https://example.com",
 *   rules: {
 *     fields: [
 *       { field_name: "title", xpath: "//h1/text()" },
 *       { field_name: "price", xpath: "//span[@class='price']/text()" }
 *     ]
 *   },
 *   output: "scraped_data"
 * }
 */
class OffscreenTool extends Tool {
    constructor(browser) {
        super('offscreen');
        this.browser = browser;
    }

    /**
     * Set the browser instance
     * This is called by JobManager after browser initialization
     */
    setBrowser(browser) {
        this.browser = browser;
    }

    /**
     * Execute web scraping
     * 
     * @param {Object} params
     * @param {string} params.url - URL to scrape
     * @param {Object} [params.rules] - Extraction rules
     * @param {Array} [params.rules.fields] - Field definitions with XPath
     * @param {number} [params.timeout=60000] - Page load timeout
     * @param {string} [params.waitUntil='networkidle2'] - Wait condition
     * @param {string} [params.output] - Variable name to store result
     * @param {Object} context
     * @returns {Promise<{result: Object, shouldContinue: boolean}>}
     */
    async execute(params, context) {
        const {
            url,
            rules,
            timeout = 60000,
            waitUntil = 'networkidle2',
            output
        } = params;

        const logger = context.logger || console;

        if (!this.browser) {
            throw new Error('Browser not initialized. Call setBrowser() first.');
        }

        logger.info(`[OffscreenTool] Scraping ${url}`);

        const page = await this.browser.newPage();

        try {
            // Navigate to URL
            logger.debug(`[OffscreenTool] Navigating to ${url}...`);
            await page.goto(url, { waitUntil, timeout });

            // Extract data using rules
            const result = await page.evaluate((rules) => {
                const data = {};

                /**
                 * Get element by XPath
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
                 * Get all elements by XPath
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

                // Process fields with XPath
                if (rules && rules.fields) {
                    for (const field of rules.fields) {
                        if (field.xpath) {
                            // Check if xpath ends with /text() - means single value
                            const isTextNode = field.xpath.endsWith('/text()');
                            const isSingleAttr = field.xpath.match(/@[\w-]+$/);

                            if (isTextNode || isSingleAttr) {
                                // Single value
                                const node = getByXPath(field.xpath);
                                if (node) {
                                    data[field.field_name] = node.textContent ? node.textContent.trim() : node.nodeValue;
                                } else {
                                    data[field.field_name] = null;
                                }
                            } else {
                                // Multiple values - get all matching nodes
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

                // If no rules or no fields, return full HTML and text
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

            logger.info(`[OffscreenTool] Extraction complete`);
            logger.debug(`[OffscreenTool] Extracted data:`, JSON.stringify(result).substring(0, 200));

            return {
                result,
                shouldContinue: true,
                output: output ? { [output]: result } : undefined
            };

        } catch (error) {
            logger.error(`[OffscreenTool] Scraping failed:`, error.message);
            throw error;
        } finally {
            await page.close();
        }
    }

    /**
     * Validate parameters
     */
    validate(params) {
        if (!params.url) {
            throw new Error('Missing required parameter: url');
        }

        // Basic URL validation
        try {
            new URL(params.url);
        } catch (error) {
            throw new Error(`Invalid URL: ${params.url}`);
        }

        // Validate rules if provided
        if (params.rules && params.rules.fields) {
            if (!Array.isArray(params.rules.fields)) {
                throw new Error('rules.fields must be an array');
            }

            for (const field of params.rules.fields) {
                if (!field.field_name) {
                    throw new Error('Each field must have a field_name');
                }
                if (!field.xpath) {
                    throw new Error(`Field ${field.field_name} is missing xpath`);
                }
            }
        }

        return true;
    }

    /**
     * Get tool metadata
     */
    getMetadata() {
        return {
            name: this.name,
            description: 'Scrapes web pages using Puppeteer and XPath selectors',
            parameters: {
                url: { type: 'string', required: true, description: 'URL to scrape' },
                rules: { type: 'object', required: false, description: 'Extraction rules with XPath' },
                timeout: { type: 'number', required: false, default: 60000, description: 'Page load timeout' },
                waitUntil: { type: 'string', required: false, default: 'networkidle2', description: 'Wait condition' },
                output: { type: 'string', required: false, description: 'Variable name for result' }
            },
            examples: [
                {
                    description: 'Extract product details',
                    params: {
                        url: 'https://example.com/product',
                        rules: {
                            fields: [
                                { field_name: 'title', xpath: '//h1/text()' },
                                { field_name: 'price', xpath: '//span[@class="price"]/text()' },
                                { field_name: 'description', xpath: '//div[@id="description"]//text()' }
                            ]
                        },
                        output: 'product_data'
                    }
                },
                {
                    description: 'Get full page content',
                    params: {
                        url: 'https://example.com',
                        output: 'page_content'
                    }
                }
            ]
        };
    }
}

module.exports = OffscreenTool;
