const axios = require('axios');
const os = require('os');
const { logger } = require('./logger');
const CONFIG = require('./config');

/**
 * API Client for DataHive API
 */
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
            'X-Device-OS': os.platform() + ' ' + os.release(),
            'X-User-Language': 'en-US',
            'X-CPU-Architecture': os.arch(),
            'X-CPU-Model': os.cpus()[0]?.model || 'Unknown',
            'X-CPU-Processor-Count': String(os.cpus().length)
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
                validateStatus: () => true
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

module.exports = ApiClient;
