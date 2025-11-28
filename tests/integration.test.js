/**
 * Integration Tests
 * Tests all components working together
 */

const {
    ToolRegistry,
    ConditionalGateTool,
    FetchTool,
    OffscreenTool,
    OPERATORS
} = require('../src/tools');
const PerformanceMonitor = require('../src/PerformanceMonitor');
const ConfigManager = require('../src/ConfigManager');

// Mock logger
const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Mock API client
const mockApiClient = {
    getConfiguration: jest.fn().mockResolvedValue({
        job_execution_delay: 60,
        reloadAfterJobs: 100,
        enablePerformanceTracking: true
    })
};

describe('Integration Tests', () => {
    let registry;
    let perfMonitor;
    let configManager;

    beforeEach(() => {
        registry = new ToolRegistry();
        perfMonitor = new PerformanceMonitor();
        configManager = new ConfigManager(mockApiClient);

        // Register tools
        registry.register(new ConditionalGateTool());
        registry.register(new FetchTool());
    });

    afterEach(() => {
        perfMonitor.clearAll();
    });

    describe('Tool Chain Execution', () => {
        it('should execute multiple tools in sequence', async () => {
            const context = { jobId: 'test-job', logger };

            // Step 1: Fetch data
            const fetchResult = await registry.execute('fetch', {
                url: 'https://jsonplaceholder.typicode.com/users/1'
            }, context);

            expect(fetchResult.result.status).toBe(200);
            expect(fetchResult.result.data).toHaveProperty('email');

            // Step 2: Validate email exists
            await registry.execute('conditional-gate', {
                rule: {
                    value: fetchResult.result.data.email,
                    operator: OPERATORS.IS_NOT_EMPTY
                }
            }, context);

            // Step 3: Validate email format
            await registry.execute('conditional-gate', {
                rule: {
                    value: fetchResult.result.data.email,
                    operator: OPERATORS.MATCHES_PATTERN,
                    expected: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$'
                }
            }, context);

            // If we got here, all validations passed
            expect(true).toBe(true);
        });

        it('should stop chain on failed validation', async () => {
            const context = { jobId: 'test-job-2', logger };

            // This should throw
            await expect(
                registry.execute('conditional-gate', {
                    rule: {
                        value: 'not-an-email',
                        operator: OPERATORS.MATCHES_PATTERN,
                        expected: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
                        throwOnFailure: true,
                        errorMessage: 'Invalid email format'
                    }
                }, context)
            ).rejects.toThrow('Invalid email format');
        });
    });

    describe('Performance Monitoring Integration', () => {
        it('should track tool execution performance', async () => {
            const jobId = 'perf-test-job';
            perfMonitor.startMeasurement(jobId);

            // Simulate some work
            const context = { jobId, logger };
            await registry.execute('fetch', {
                url: 'https://jsonplaceholder.typicode.com/posts/1'
            }, context);

            // Wait a bit for sampling
            await new Promise(resolve => setTimeout(resolve, 6000));

            const metrics = perfMonitor.stopMeasurement(jobId);

            expect(metrics).toBeDefined();
            expect(metrics.jobId).toBe(jobId);
            expect(metrics.duration).toBeGreaterThan(0);
            expect(metrics.cpu).toHaveProperty('avg');
            expect(metrics.memory).toHaveProperty('avg');
            expect(metrics.samples).toBeGreaterThan(0);
        });

        it('should handle performance tracking for failed jobs', async () => {
            const jobId = 'failed-job';
            perfMonitor.startMeasurement(jobId);

            try {
                const context = { jobId, logger };
                await registry.execute('conditional-gate', {
                    rule: {
                        value: 10,
                        operator: OPERATORS.GREATER_THAN,
                        expected: 100,
                        throwOnFailure: true
                    }
                }, context);
            } catch (error) {
                // Expected to fail
            }

            const metrics = perfMonitor.stopMeasurement(jobId);
            expect(metrics).toBeDefined();
            expect(metrics.jobId).toBe(jobId);
        });
    });

    describe('Configuration Management Integration', () => {
        it('should fetch and apply configuration', async () => {
            await configManager.fetchConfiguration();

            const jobInterval = configManager.get('jobInterval');
            const enableTracking = configManager.get('enablePerformanceTracking');

            expect(jobInterval).toBe(65000); // 60s + 5s buffer
            expect(enableTracking).toBe(true);
            expect(mockApiClient.getConfiguration).toHaveBeenCalled();
        });

        it('should use performance tracking based on config', async () => {
            await configManager.fetchConfiguration();

            const jobId = 'config-test-job';
            const shouldTrack = configManager.get('enablePerformanceTracking');

            if (shouldTrack) {
                perfMonitor.startMeasurement(jobId);
            }

            // Do some work
            const context = { jobId, logger };
            await registry.execute('fetch', {
                url: 'https://jsonplaceholder.typicode.com/todos/1'
            }, context);

            if (shouldTrack) {
                const metrics = perfMonitor.stopMeasurement(jobId);
                expect(metrics).toBeDefined();
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            const context = { jobId: 'error-test', logger };

            await expect(
                registry.execute('fetch', {
                    url: 'https://this-domain-definitely-does-not-exist-12345.com',
                    timeout: 5000
                }, context)
            ).rejects.toThrow();
        });

        it('should handle invalid tool parameters', async () => {
            const context = { jobId: 'invalid-params', logger };

            await expect(
                registry.execute('fetch', {
                    // Missing URL
                    method: 'GET'
                }, context)
            ).rejects.toThrow('Missing required parameter: url');
        });

        it('should handle non-existent tools', async () => {
            const context = { jobId: 'non-existent', logger };

            await expect(
                registry.execute('non-existent-tool', {}, context)
            ).rejects.toThrow('Tool not found');
        });
    });

    describe('Full Job Flow Simulation', () => {
        it('should simulate a complete job with all features', async () => {
            const jobId = 'complete-job-sim';

            // 1. Start performance tracking
            perfMonitor.startMeasurement(jobId);

            // 2. Fetch configuration
            await configManager.fetchConfiguration();

            const context = { jobId, logger, variables: {} };

            try {
                // 3. Fetch data
                const fetchResult = await registry.execute('fetch', {
                    url: 'https://jsonplaceholder.typicode.com/users/1',
                    output: 'userData'
                }, context);

                // 4. Validate response status
                await registry.execute('conditional-gate', {
                    rule: {
                        value: fetchResult.result.status,
                        operator: OPERATORS.EQUALS,
                        expected: 200,
                        errorMessage: 'Failed to fetch user data'
                    }
                }, context);

                // 5. Validate data structure
                await registry.execute('conditional-gate', {
                    rule: {
                        value: fetchResult.result.data.name,
                        operator: OPERATORS.IS_NOT_EMPTY,
                        errorMessage: 'User name is missing'
                    }
                }, context);

                // 6. Validate email format
                await registry.execute('conditional-gate', {
                    rule: {
                        value: fetchResult.result.data.email,
                        operator: OPERATORS.MATCHES_PATTERN,
                        expected: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
                        errorMessage: 'Invalid email format'
                    }
                }, context);

                // Wait for at least one sample
                await new Promise(resolve => setTimeout(resolve, 6000));

                // 7. Stop performance tracking
                const metrics = perfMonitor.stopMeasurement(jobId);

                // Verify everything worked
                expect(metrics).toBeDefined();
                expect(metrics.duration).toBeGreaterThan(0);
                expect(metrics.samples).toBeGreaterThan(0);
                expect(fetchResult.result.data).toHaveProperty('name');

            } catch (error) {
                perfMonitor.stopMeasurement(jobId);
                throw error;
            }
        });
    });
});
