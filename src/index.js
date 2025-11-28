// Core components
module.exports.ApiClient = require('./ApiClient');
module.exports.JobManager = require('./JobManager');
module.exports.ConfigManager = require('./ConfigManager');
module.exports.PerformanceMonitor = require('./PerformanceMonitor');
module.exports.Scraper = require('./Scraper');

// Loggers
const { logger, jobLogger } = require('./logger');
module.exports.logger = logger;
module.exports.jobLogger = jobLogger;

// Config
module.exports.CONFIG = require('./config');

// Tools (re-export from tools/index.js)
const tools = require('./tools');
module.exports.tools = tools;
module.exports.ToolRegistry = tools.ToolRegistry;
module.exports.Tool = tools.Tool;
module.exports.ConditionalGateTool = tools.ConditionalGateTool;
module.exports.FetchTool = tools.FetchTool;
module.exports.OffscreenTool = tools.OffscreenTool;
module.exports.FetchAndExtractTool = tools.FetchAndExtractTool;
module.exports.OPERATORS = tools.OPERATORS;
