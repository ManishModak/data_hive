const Tool = require('./Tool');

/**
 * FetchAndExtractTool - Combined fetch + extract tool
 * Fetches HTML and extracts data using rules
 * Useful for simple scraping without full browser
 * 
 * Example usage:
 * {
 *   url: "https://example.com/api/data.html",
 *   rules: {
 *     fields: [
 *       { field_name: "title", selector: "h1", attribute: "text" }
 *     ]
 *   }
 * }
 */
class FetchAndExtractTool extends Tool {
    constructor() {
        super('fetch-and-extract');
    }

    /**
     * Execute fetch and extract
     * 
     * @param {Object} params
     * @param {string} params.url - URL to fetch
     * @param {Object} params.rules - Extraction rules
     * @param {Array} params.rules.fields - Field definitions
     * @param {Object} [params.headers] - HTTP headers
     * @param {number} [params.timeout=30000] - Request timeout
     * @param {string} [params.output] - Variable name to store result
     * @param {Object} context
     * @returns {Promise<{result: Object, shouldContinue: boolean}>}
     */
    async execute(params, context) {
        const {
            url,
            rules,
            headers = {},
            timeout = 30000,
            output
        } = params;

        const logger = context.logger || console;

        logger.info(`[FetchAndExtractTool] Fetching and extracting from ${url}`);

        // Use FetchTool to get the HTML
        const FetchTool = require('./FetchTool');
        const fetchTool = new FetchTool();

        const fetchResult = await fetchTool.execute({
            url,
            method: 'GET',
            headers,
            timeout
        }, context);

        const html = fetchResult.result.data;

        if (typeof html !== 'string') {
            throw new Error('Response is not HTML/text');
        }

        logger.debug(`[FetchAndExtractTool] Received ${html.length} bytes of HTML`);

        // Simple extraction using regex (basic implementation)
        // For production, you might want to use a proper HTML parser like cheerio
        const data = {};

        if (rules && rules.fields) {
            for (const field of rules.fields) {
                if (field.selector) {
                    // Very basic selector support (this is simplified - for real use, integrate cheerio)
                    // For now, just do simple regex matching
                    const pattern = `<${field.selector}[^>]*>([\\s\\S]*?)<\/${field.selector}>`;
                    const regex = new RegExp(pattern, 'i');
                    const match = html.match(regex);

                    if (match) {
                        // Remove HTML tags from content
                        const content = match[1].replace(/<[^>]+>/g, '').trim();
                        data[field.field_name] = content;
                    } else {
                        data[field.field_name] = null;
                    }
                }
            }
        }

        logger.info(`[FetchAndExtractTool] Extracted ${Object.keys(data).length} fields`);

        return {
            result: data,
            shouldContinue: true,
            output: output ? { [output]: data } : undefined
        };
    }

    /**
     * Validate parameters
     */
    validate(params) {
        if (!params.url) {
            throw new Error('Missing required parameter: url');
        }

        if (!params.rules || !params.rules.fields) {
            throw new Error('Missing required parameter: rules.fields');
        }

        return true;
    }

    /**
     * Get tool metadata
     */
    getMetadata() {
        return {
            name: this.name,
            description: 'Fetches HTML and extracts data using simple selectors',
            parameters: {
                url: { type: 'string', required: true, description: 'URL to fetch' },
                rules: { type: 'object', required: true, description: 'Extraction rules' },
                headers: { type: 'object', required: false, description: 'HTTP headers' },
                timeout: { type: 'number', required: false, default: 30000, description: 'Timeout in ms' },
                output: { type: 'string', required: false, description: 'Variable name for result' }
            },
            examples: [
                {
                    description: 'Extract title and description',
                    params: {
                        url: 'https://example.com',
                        rules: {
                            fields: [
                                { field_name: 'title', selector: 'h1' },
                                { field_name: 'description', selector: 'p' }
                            ]
                        }
                    }
                }
            ],
            notes: [
                'This is a simplified implementation using regex',
                'For production use, consider integrating cheerio for better HTML parsing',
                'For JavaScript-heavy sites, use OffscreenTool instead'
            ]
        };
    }
}

module.exports = FetchAndExtractTool;
