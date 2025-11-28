const os = require('os');
const v8 = require('v8');

/**
 * Performance Monitor
 * Tracks CPU and memory usage during job execution
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
    }

    /**
     * Start measuring performance for a job
     * @param {string} jobId - Job identifier
     */
    startMeasurement(jobId) {
        const startTime = Date.now();
        const startCpu = process.cpuUsage();
        const startMemory = process.memoryUsage();

        this.metrics.set(jobId, {
            startTime,
            startCpu,
            startMemory,
            samples: [],
            interval: null
        });

        // Sample performance every 5 seconds during execution
        const interval = setInterval(() => {
            this.samplePerformance(jobId);
        }, 5000);

        this.metrics.get(jobId).interval = interval;

        console.log(`[PerformanceMonitor] Started monitoring job ${jobId}`);
    }

    /**
     * Take a performance sample
     * @param {string} jobId - Job identifier
     */
    samplePerformance(jobId) {
        const metric = this.metrics.get(jobId);
        if (!metric) return;

        const cpuUsage = process.cpuUsage(metric.startCpu);
        const memoryUsage = process.memoryUsage();
        const heapStats = v8.getHeapStatistics();

        metric.samples.push({
            timestamp: Date.now(),
            cpu: {
                user: cpuUsage.user / 1000000, // Convert to seconds
                system: cpuUsage.system / 1000000
            },
            memory: {
                rss: memoryUsage.rss / 1024 / 1024, // MB
                heapUsed: memoryUsage.heapUsed / 1024 / 1024,
                heapTotal: memoryUsage.heapTotal / 1024 / 1024,
                external: memoryUsage.external / 1024 / 1024
            },
            heap: {
                totalHeapSize: heapStats.total_heap_size / 1024 / 1024,
                usedHeapSize: heapStats.used_heap_size / 1024 / 1024,
                heapSizeLimit: heapStats.heap_size_limit / 1024 / 1024
            }
        });
    }

    /**
     * Stop measuring and return metrics
     * @param {string} jobId - Job identifier
     * @returns {Object|null} Performance metrics
     */
    stopMeasurement(jobId) {
        const metric = this.metrics.get(jobId);
        if (!metric) return null;

        // Clear interval
        if (metric.interval) {
            clearInterval(metric.interval);
        }

        // Take final sample
        this.samplePerformance(jobId);

        const endTime = Date.now();
        const duration = endTime - metric.startTime;

        // Calculate statistics
        const stats = this.calculateStats(metric.samples);

        const result = {
            jobId,
            duration,
            durationSeconds: (duration / 1000).toFixed(2),
            cpu: stats.cpu,
            memory: stats.memory,
            samples: metric.samples.length,
            systemInfo: this.getSystemInfo()
        };

        // Clean up
        this.metrics.delete(jobId);

        console.log(`[PerformanceMonitor] Job ${jobId} completed in ${result.durationSeconds}s`);
        console.log(`  CPU: ${stats.cpu.avg.toFixed(2)}s avg, ${stats.cpu.max.toFixed(2)}s peak`);
        console.log(`  Memory: ${stats.memory.avg.toFixed(0)} MB avg, ${stats.memory.max.toFixed(0)} MB peak`);

        return result;
    }

    /**
     * Calculate statistics from samples
     * @param {Array} samples - Performance samples
     * @returns {Object} Statistics
     */
    calculateStats(samples) {
        if (samples.length === 0) {
            return {
                cpu: { min: 0, max: 0, avg: 0 },
                memory: { min: 0, max: 0, avg: 0 }
            };
        }

        const cpuValues = samples.map(s => s.cpu.user + s.cpu.system);
        const memoryValues = samples.map(s => s.memory.heapUsed);

        return {
            cpu: {
                min: Math.min(...cpuValues),
                max: Math.max(...cpuValues),
                avg: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length
            },
            memory: {
                min: Math.min(...memoryValues),
                max: Math.max(...memoryValues),
                avg: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length
            }
        };
    }

    /**
     * Get system information
     * @returns {Object} System info
     */
    getSystemInfo() {
        const cpus = os.cpus();

        return {
            cpuCount: cpus.length,
            cpuModel: cpus[0] ? cpus[0].model : 'Unknown',
            totalMemory: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
            freeMemory: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            uptime: (os.uptime() / 3600).toFixed(1) + ' hours'
        };
    }

    /**
     * Get current metrics for a job (without stopping)
     * @param {string} jobId - Job identifier
     * @returns {Object|null} Current metrics
     */
    getCurrentMetrics(jobId) {
        const metric = this.metrics.get(jobId);
        if (!metric) return null;

        const duration = Date.now() - metric.startTime;
        const stats = this.calculateStats(metric.samples);

        return {
            jobId,
            duration: (duration / 1000).toFixed(2) + 's',
            samples: metric.samples.length,
            cpu: stats.cpu,
            memory: stats.memory
        };
    }

    /**
     * Check if job is being monitored
     * @param {string} jobId - Job identifier
     * @returns {boolean} True if monitoring
     */
    isMonitoring(jobId) {
        return this.metrics.has(jobId);
    }

    /**
     * Clear all metrics
     */
    clearAll() {
        for (const [jobId, metric] of this.metrics) {
            if (metric.interval) {
                clearInterval(metric.interval);
            }
        }
        this.metrics.clear();
    }
}

module.exports = PerformanceMonitor;
