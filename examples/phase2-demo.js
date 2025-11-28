/**
 * Demo for PerformanceMonitor and ConfigManager
 * Run with: node examples/phase2-demo.js
 */

const PerformanceMonitor = require('../src/PerformanceMonitor');
const ConfigManager = require('../src/ConfigManager');

// Mock API client for ConfigManager
const mockApiClient = {
    async getConfiguration() {
        // Simulate server response
        return {
            job_execution_delay: 60, // seconds
            reloadAfterJobs: 100,
            maxConcurrentJobs: 2,
            enablePerformanceTracking: true
        };
    }
};

async function runDemo() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  Phase 2: Performance Monitor & Config Manager Demo');
    console.log('═══════════════════════════════════════════════════\n');

    // ======================
    // Part 1: Performance Monitor
    // ======================
    console.log('─── Part 1: Performance Monitor ───\n');

    const perfMonitor = new PerformanceMonitor();

    // Show system info
    console.log('System Information:');
    const sysInfo = perfMonitor.getSystemInfo();
    console.log('  CPU:', sysInfo.cpuModel);
    console.log('  CPU Count:', sysInfo.cpuCount);
    console.log('  Total Memory:', sysInfo.totalMemory);
    console.log('  Free Memory:', sysInfo.freeMemory);
    console.log('  Platform:', sysInfo.platform, sysInfo.arch);
    console.log('  Node Version:', sysInfo.nodeVersion);
    console.log('  Uptime:', sysInfo.uptime);
    console.log();

    // Simulate job execution with monitoring
    console.log('Starting performance monitoring for job-123...\n');
    perfMonitor.startMeasurement('job-123');

    // Simulate some work
    console.log('Simulating job work (10 seconds)...');
    await simulateWork(10000);

    // Check current metrics
    console.log('\nCurrent metrics:');
    const currentMetrics = perfMonitor.getCurrentMetrics('job-123');
    if (currentMetrics) {
        console.log('  Duration:', currentMetrics.duration);
        console.log('  Samples:', currentMetrics.samples);
        console.log('  CPU Avg:', currentMetrics.cpu.avg.toFixed(2), 's');
        console.log('  Memory Avg:', currentMetrics.memory.avg.toFixed(0), 'MB');
    }
    console.log();

    // Stop monitoring
    const finalMetrics = perfMonitor.stopMeasurement('job-123');

    console.log('\n✓ Final Performance Metrics:');
    console.log('  Job ID:', finalMetrics.jobId);
    console.log('  Duration:', finalMetrics.durationSeconds, 'seconds');
    console.log('  Samples Collected:', finalMetrics.samples);
    console.log('  CPU Usage:');
    console.log('    Min:', finalMetrics.cpu.min.toFixed(2), 's');
    console.log('    Max:', finalMetrics.cpu.max.toFixed(2), 's');
    console.log('    Avg:', finalMetrics.cpu.avg.toFixed(2), 's');
    console.log('  Memory Usage:');
    console.log('    Min:', finalMetrics.memory.min.toFixed(0), 'MB');
    console.log('    Max:', finalMetrics.memory.max.toFixed(0), 'MB');
    console.log('    Avg:', finalMetrics.memory.avg.toFixed(0), 'MB');

    console.log('\n');

    // ======================
    // Part 2: Config Manager
    // ======================
    console.log('─── Part 2: Configuration Manager ───\n');

    const configManager = new ConfigManager(mockApiClient);

    // Show default config
    console.log('Default Configuration (from environment):');
    configManager.print();

    // Fetch config from "server"
    console.log('Fetching configuration from API...\n');
    await configManager.fetchConfiguration();

    // Show updated config
    console.log('Updated Configuration (from server):');
    configManager.print();

    // Get specific values
    console.log('Getting specific config values:');
    console.log('  Job Interval:', configManager.get('jobInterval'), 'ms');
    console.log('  Performance Tracking:', configManager.get('enablePerformanceTracking'));
    console.log('  Max Concurrent Jobs:', configManager.get('maxConcurrentJobs'));
    console.log();

    // Set a value locally
    console.log('Setting local value:');
    configManager.set('customSetting', 'custom-value');
    console.log('  Custom Setting:', configManager.get('customSetting'));
    console.log();

    // Get all config
    console.log('All Configuration:');
    const allConfig = configManager.getAll();
    Object.entries(allConfig).forEach(([key, value]) => {
        console.log(`  ${key}:`, value);
    });
    console.log();

    // ======================
    // Part 3: Integration Example
    // ======================
    console.log('─── Part 3: Integration Example ───\n');

    console.log('Simulating job with performance tracking...');

    // Start monitoring
    perfMonitor.startMeasurement('job-456');

    // Simulate job based on config
    const timeout = configManager.get('timeout', 30000);
    const workDuration = Math.min(5000, timeout); // 5 seconds or timeout

    console.log(`  Using timeout from config: ${timeout}ms`);
    console.log(`  Simulating work for: ${workDuration}ms`);

    await simulateWork(workDuration);

    // Stop and get metrics
    const metrics = perfMonitor.stopMeasurement('job-456');

    console.log('\n✓ Job completed with metrics:');
    console.log('  Duration:', metrics.durationSeconds, 's');
    console.log('  CPU:', metrics.cpu.avg.toFixed(2), 's avg');
    console.log('  Memory:', metrics.memory.avg.toFixed(0), 'MB avg');

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  Phase 2 Demo Complete!');
    console.log('═══════════════════════════════════════════════════');
}

/**
 * Simulate work by doing calculations
 * @param {number} duration - Duration in ms
 */
async function simulateWork(duration) {
    const start = Date.now();
    const operations = [];

    while (Date.now() - start < duration) {
        // Do some work to consume CPU
        const arr = new Array(1000).fill(0).map((_, i) => Math.random() * i);
        arr.sort((a, b) => a - b);
        operations.push(arr.reduce((a, b) => a + b, 0));

        // Small delay to allow sampling
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return operations.length;
}

// Run the demo
runDemo().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
});
