/**
 * Application Configuration
 */
const CONFIG = {
    BASE_URL: 'https://api.datahive.ai/api',
    APP_VERSION: '0.2.4',
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    JOB_INTERVAL: parseInt(process.env.DATAHIVE_JOB_INTERVAL) || 60000,
    PING_INTERVAL: parseInt(process.env.DATAHIVE_PING_INTERVAL) || 120000
};

module.exports = CONFIG;
