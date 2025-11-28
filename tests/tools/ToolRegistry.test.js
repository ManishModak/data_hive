const ToolRegistry = require('../../src/tools/ToolRegistry');
const Tool = require('../../src/tools/Tool');

// Mock tool for testing
class MockTool extends Tool {
    constructor(name = 'mock-tool') {
        super(name);
        this.executeCalled = false;
    }

    async execute(params, context) {
        this.executeCalled = true;
        return { result: 'mock result', shouldContinue: true };
    }

    validate(params) {
        if (params.requiresValidation && !params.value) {
            throw new Error('Value is required');
        }
        return true;
    }
}

describe('ToolRegistry', () => {
    let registry;

    beforeEach(() => {
        registry = new ToolRegistry();
    });

    describe('Tool Registration', () => {
        test('should register a tool successfully', () => {
            const tool = new MockTool();
            registry.register(tool);

            expect(registry.has('mock-tool')).toBe(true);
            expect(registry.size).toBe(1);
        });

        test('should register multiple tools', () => {
            const tool1 = new MockTool('tool1');
            const tool2 = new MockTool('tool2');

            registry.registerAll([tool1, tool2]);

            expect(registry.size).toBe(2);
            expect(registry.has('tool1')).toBe(true);
            expect(registry.has('tool2')).toBe(true);
        });

        test('should throw error when registering non-Tool instance', () => {
            expect(() => {
                registry.register({ name: 'fake-tool' });
            }).toThrow('Tool must extend the Tool base class');
        });

        test('should throw error when registering duplicate tool name', () => {
            const tool1 = new MockTool('duplicate');
            const tool2 = new MockTool('duplicate');

            registry.register(tool1);

            expect(() => {
                registry.register(tool2);
            }).toThrow("Tool with name 'duplicate' is already registered");
        });
    });

    describe('Tool Retrieval', () => {
        test('should retrieve registered tool', () => {
            const tool = new MockTool();
            registry.register(tool);

            const retrieved = registry.get('mock-tool');
            expect(retrieved).toBe(tool);
        });

        test('should throw error for non-existent tool', () => {
            expect(() => {
                registry.get('non-existent');
            }).toThrow("Tool 'non-existent' not found");
        });

        test('should list error message include available tools', () => {
            const tool1 = new MockTool('tool1');
            const tool2 = new MockTool('tool2');
            registry.registerAll([tool1, tool2]);

            expect(() => {
                registry.get('non-existent');
            }).toThrow('Available tools: tool1, tool2');
        });

        test('should check if tool exists', () => {
            const tool = new MockTool();
            registry.register(tool);

            expect(registry.has('mock-tool')).toBe(true);
            expect(registry.has('non-existent')).toBe(false);
        });
    });

    describe('Tool Listing', () => {
        test('should list all tool names', () => {
            const tool1 = new MockTool('tool1');
            const tool2 = new MockTool('tool2');
            const tool3 = new MockTool('tool3');

            registry.registerAll([tool1, tool2, tool3]);

            const names = registry.list();
            expect(names).toHaveLength(3);
            expect(names).toContain('tool1');
            expect(names).toContain('tool2');
            expect(names).toContain('tool3');
        });

        test('should return empty array when no tools registered', () => {
            expect(registry.list()).toEqual([]);
        });

        test('should get all metadata', () => {
            const tool1 = new MockTool('tool1');
            const tool2 = new MockTool('tool2');

            registry.registerAll([tool1, tool2]);

            const metadata = registry.getAllMetadata();
            expect(metadata).toHaveLength(2);
            expect(metadata[0].name).toBe('tool1');
            expect(metadata[1].name).toBe('tool2');
        });
    });

    describe('Tool Execution', () => {
        test('should execute tool successfully', async () => {
            const tool = new MockTool();
            registry.register(tool);

            const result = await registry.execute('mock-tool', {}, {});

            expect(result.result).toBe('mock result');
            expect(result.shouldContinue).toBe(true);
            expect(tool.executeCalled).toBe(true);
        });

        test('should validate params before execution', async () => {
            const tool = new MockTool();
            registry.register(tool);

            await expect(
                registry.execute('mock-tool', { requiresValidation: true }, {})
            ).rejects.toThrow('Value is required');
        });

        test('should throw error when executing non-existent tool', async () => {
            await expect(
                registry.execute('non-existent', {}, {})
            ).rejects.toThrow("Tool 'non-existent' not found");
        });

        test('should pass context to tool execution', async () => {
            class ContextCheckTool extends Tool {
                constructor() {
                    super('context-tool');
                }

                async execute(params, context) {
                    return {
                        result: { jobId: context.jobId },
                        shouldContinue: true
                    };
                }
            }

            const tool = new ContextCheckTool();
            registry.register(tool);

            const result = await registry.execute(
                'context-tool',
                {},
                { jobId: 'test-123' }
            );

            expect(result.result.jobId).toBe('test-123');
        });
    });

    describe('Registry Management', () => {
        test('should clear all tools', () => {
            const tool1 = new MockTool('tool1');
            const tool2 = new MockTool('tool2');

            registry.registerAll([tool1, tool2]);
            expect(registry.size).toBe(2);

            registry.clear();
            expect(registry.size).toBe(0);
            expect(registry.list()).toEqual([]);
        });

        test('should return correct size', () => {
            expect(registry.size).toBe(0);

            registry.register(new MockTool('tool1'));
            expect(registry.size).toBe(1);

            registry.register(new MockTool('tool2'));
            expect(registry.size).toBe(2);
        });
    });
});
