require('dotenv').config();
const { logger } = require('./src/logger');
const ApiClient = require('./src/ApiClient');
const JobManager = require('./src/JobManager');

/**
 * DataHive.js Worker - Modular Architecture v2.0.0
 * Enterprise-grade job processor with 100% feature parity
 */

async function main() {
    logger.info('Starting DataHive.js Worker (Modular Architecture v2.0.0)...');
    logger.info('Initializing components...');

    const apiClient = new ApiClient();
    const jobManager = new JobManager(apiClient);

    // Graceful shutdown handlers
    process.on('SIGINT', async () => {
        logger.info('Received SIGINT, shutting down gracefully...');
        await jobManager.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM, shutting down gracefully...');
        await jobManager.stop();
        process.exit(0);
    });

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    await jobManager.start();
    logger.info('Worker started successfully');
}

main().catch(err => {
    logger.error('Fatal error:', err);
    process.exit(1);
});
