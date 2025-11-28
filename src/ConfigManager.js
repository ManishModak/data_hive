/**
 * Configuration Manager
 * Manages dynamic configuration from server and environment variables
 */
class ConfigManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.config = {
            // Default values from environment
            jobInterval: parseInt(process.env.DATAHIVE_JOB_INTERVAL) || 60000,
            pingInterval: parseInt(process.env.DATAHIVE_PING_INTERVAL) || 120000,
            reloadAfterJobs: parseInt(process.env.DATAHIVE_RELOAD_AFTER_JOBS) || 0,
            enablePerformanceTracking: process.env.DATAHIVE_ENABLE_PERFORMANCE_TRACKING === 'true',
            maxConcurrentJobs: parseInt(process.env.DATAHIVE_MAX_CONCURRENT_JOBS) || 1,
            timeout: parseInt(process.env.DATAHIVE_TIMEOUT) || 60000,
        };
        this.lastFetch = null;
        this.fetchInterval = 5 * 60 * 1000; // Fetch config every 5 minutes
    }

    /**
     * Fetch configuration from API
     * @returns {Promise<Object>} Updated configuration
     */
    async fetchConfiguration() {
        try {
            console.log('[ConfigManager] Fetching configuration from API...');

            const config = await this.apiClient.getConfiguration();

            // Update config with server values
            let updated = false;

            if (config.job_execution_delay !== undefined) {
                const newInterval = (config.job_execution_delay * 1000) + 5000; // Add 5s buffer
                if (this.config.jobInterval !== newInterval) {
                    this.config.jobInterval = newInterval;
                    console.log(`[ConfigManager] Updated jobInterval to ${newInterval}ms`);
                    updated = true;
                }
            }

            if (config.reloadAfterJobs !== undefined && this.config.reloadAfterJobs !== config.reloadAfterJobs) {
                this.config.reloadAfterJobs = config.reloadAfterJobs;
                console.log(`[ConfigManager] Updated reloadAfterJobs to ${config.reloadAfterJobs}`);
                updated = true;
            }

            if (config.maxConcurrentJobs !== undefined && this.config.maxConcurrentJobs !== config.maxConcurrentJobs) {
                this.config.maxConcurrentJobs = config.maxConcurrentJobs;
                console.log(`[ConfigManager] Updated maxConcurrentJobs to ${config.maxConcurrentJobs}`);
                updated = true;
            }

            if (config.enablePerformanceTracking !== undefined && this.config.enablePerformanceTracking !== config.enablePerformanceTracking) {
                this.config.enablePerformanceTracking = config.enablePerformanceTracking;
                console.log(`[ConfigManager] Updated enablePerformanceTracking to ${config.enablePerformanceTracking}`);
                updated = true;
            }

            if (!updated) {
                console.log('[ConfigManager] No configuration changes');
            }

            this.lastFetch = Date.now();
            return this.config;

        } catch (error) {
            console.error('[ConfigManager] Failed to fetch configuration:', error.message);
            console.log('[ConfigManager] Using existing/default configuration');
            return this.config;
        }
    }

    /**
     * Get configuration (fetches from API if stale)
     * @param {boolean} force - Force fetch from API
     * @returns {Promise<Object>} Configuration
     */
    async getConfig(force = false) {
        // Fetch if never fetched, too old, or forced
        if (force || !this.lastFetch || Date.now() - this.lastFetch > this.fetchInterval) {
            await this.fetchConfiguration();
        }

        return this.config;
    }

    /**
     * Get a specific config value
     * @param {string} key - Config key
     * @param {*} defaultValue - Default if key doesn't exist
     * @returns {*} Config value
     */
    get(key, defaultValue = undefined) {
        return this.config[key] !== undefined ? this.config[key] : defaultValue;
    }

    /**
     * Set a config value (local only, not persisted to server)
     * @param {string} key - Config key
     * @param {*} value - Config value
     */
    set(key, value) {
        this.config[key] = value;
        console.log(`[ConfigManager] Set ${key} = ${value}`);
    }

    /**
     * Get all configuration
     * @returns {Object} Full configuration
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * Reset to defaults
     */
    reset() {
        this.config = {
            jobInterval: parseInt(process.env.DATAHIVE_JOB_INTERVAL) || 60000,
            pingInterval: parseInt(process.env.DATAHIVE_PING_INTERVAL) || 120000,
            reloadAfterJobs: parseInt(process.env.DATAHIVE_RELOAD_AFTER_JOBS) || 0,
            enablePerformanceTracking: process.env.DATAHIVE_ENABLE_PERFORMANCE_TRACKING === 'true',
            maxConcurrentJobs: parseInt(process.env.DATAHIVE_MAX_CONCURRENT_JOBS) || 1,
            timeout: parseInt(process.env.DATAHIVE_TIMEOUT) || 60000,
        };
        this.lastFetch = null;
        console.log('[ConfigManager] Reset to defaults');
    }

    /**
     * Print current configuration
     */
    print() {
        console.log('\n[ConfigManager] Current Configuration:');
        console.log('  Job Interval:', this.config.jobInterval, 'ms');
        console.log('  Ping Interval:', this.config.pingInterval, 'ms');
        console.log('  Reload After Jobs:', this.config.reloadAfterJobs);
        console.log('  Performance Tracking:', this.config.enablePerformanceTracking);
        console.log('  Max Concurrent Jobs:', this.config.maxConcurrentJobs);
        console.log('  Timeout:', this.config.timeout, 'ms');
        console.log('  Last Fetch:', this.lastFetch ? new Date(this.lastFetch).toISOString() : 'Never');
        console.log();
    }
}

module.exports = ConfigManager;
