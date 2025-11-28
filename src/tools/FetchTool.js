const Tool = require('./Tool');
const axios = require('axios');

/**
 * FetchTool - HTTP request tool
 * Fetches data from a URL using axios
 * 
 * Example usage:
 * {
 *   url: "https://api.example.com/data",
 *   method: "GET",
 *   headers: { "Authorization": "Bearer token" },
 *   body: { key: "value" },
 *   output: "api_response"
 * }
 */
class FetchTool extends Tool {
    constructor() {
        super('fetch');
    }

    /**
     * Execute HTTP fetch
     * 
     * @param {Object} params
     * @param {string} params.url - URL to fetch
     * @param {string} [params.method='GET'] - HTTP method
     * @param {Object} [params.headers] - HTTP headers
     * @param {Object} [params.body] - Request body (for POST, PUT, etc.)
     * @param {number} [params.timeout=30000] - Request timeout in ms
     * @param {boolean} [params.followRedirects=true] - Follow redirects
     * @param {string} [params.output] - Variable name to store result
     * @param {Object} context
     * @returns {Promise<{result: Object, shouldContinue: boolean}>}
     */
    async execute(params, context) {
        const {
            url,
            method = 'GET',
            headers = {},
            body,
            timeout = 30000,
            followRedirects = true,
            output
        } = params;

        const logger = context.logger || console;

        logger.info(`[FetchTool] ${method} ${url}`);

        try {
            const response = await axios({
                url,
                method,
                headers,
                data: body,
                timeout,
                maxRedirects: followRedirects ? 5 : 0,
                validateStatus: () => true // Don't throw on any status
            });

            const result = {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: response.data
            };

            logger.info(`[FetchTool] Response: ${response.status} ${response.statusText}`);
            logger.debug(`[FetchTool] Data:`, JSON.stringify(result.data).substring(0, 200));

            // Check for HTTP errors
            if (response.status >= 400) {
                logger.warn(`[FetchTool] HTTP error ${response.status}: ${response.statusText}`);
                // Don't throw - let conditional gates handle this
            }

            return {
                result,
                shouldContinue: true,
                output: output ? { [output]: result } : undefined
            };

        } catch (error) {
            logger.error(`[FetchTool] Request failed:`, error.message);

            // Categorize error
            if (error.code === 'ECONNABORTED') {
                throw new Error(`Request timeout after ${timeout}ms`);
            } else if (error.code === 'ENOTFOUND') {
                throw new Error(`Host not found: ${url}`);
            } else if (error.code === 'ECONNREFUSED') {
                throw new Error(`Connection refused: ${url}`);
            } else {
                throw new Error(`Network error: ${error.message}`);
            }
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

        // Validate method
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
        if (params.method && !validMethods.includes(params.method.toUpperCase())) {
            throw new Error(`Invalid HTTP method: ${params.method}`);
        }

        return true;
    }

    /**
     * Get tool metadata
     */
    getMetadata() {
        return {
            name: this.name,
            description: 'Fetches data from a URL using HTTP',
            parameters: {
                url: { type: 'string', required: true, description: 'URL to fetch' },
                method: { type: 'string', required: false, default: 'GET', description: 'HTTP method' },
                headers: { type: 'object', required: false, description: 'HTTP headers' },
                body: { type: 'object', required: false, description: 'Request body' },
                timeout: { type: 'number', required: false, default: 30000, description: 'Timeout in ms' },
                output: { type: 'string', required: false, description: 'Variable name for result' }
            },
            examples: [
                {
                    description: 'Simple GET request',
                    params: {
                        url: 'https://api.example.com/data',
                        output: 'api_data'
                    }
                },
                {
                    description: 'POST with JSON body',
                    params: {
                        url: 'https://api.example.com/submit',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: {
                            key: 'value'
                        }
                    }
                }
            ]
        };
    }
}

module.exports = FetchTool;
