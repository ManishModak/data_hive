const { ConditionalGateTool, OPERATORS } = require('../../src/tools/ConditionalGateTool');

describe('ConditionalGateTool', () => {
    let tool;
    let mockContext;

    beforeEach(() => {
        tool = new ConditionalGateTool();
        mockContext = {
            jobId: 'test-job-123',
            logger: {
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            }
        };
    });

    describe('Tool Initialization', () => {
        test('should have correct name', () => {
            expect(tool.name).toBe('conditional-gate');
        });

        test('should provide metadata', () => {
            const metadata = tool.getMetadata();
            expect(metadata.name).toBe('conditional-gate');
            expect(metadata.operators).toHaveLength(11);
            expect(metadata.examples).toBeDefined();
        });
    });

    describe('EQUALS Operator', () => {
        test('should pass when values are equal', async () => {
            const result = await tool.execute({
                rule: {
                    value: 'test',
                    operator: OPERATORS.EQUALS,
                    expected: 'test'
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
            expect(result.result).toBe(true);
        });

        test('should fail when values are not equal', async () => {
            const result = await tool.execute({
                rule: {
                    value: 'test',
                    operator: OPERATORS.EQUALS,
                    expected: 'different',
                    throwOnFailure: false
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(false);
            expect(result.result).toBe(false);
        });

        test('should be case-insensitive when specified', async () => {
            const result = await tool.execute({
                rule: {
                    value: 'Test',
                    operator: OPERATORS.EQUALS,
                    expected: 'test',
                    caseSensitive: false
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('should throw error when throwOnFailure is true', async () => {
            await expect(tool.execute({
                rule: {
                    value: 'test',
                    operator: OPERATORS.EQUALS,
                    expected: 'different',
                    throwOnFailure: true,
                    errorMessage: 'Custom error'
                }
            }, mockContext)).rejects.toThrow('Custom error');
        });
    });

    describe('NOT_EQUALS Operator', () => {
        test('should pass when values are not equal', async () => {
            const result = await tool.execute({
                rule: {
                    value: 'test',
                    operator: OPERATORS.NOT_EQUALS,
                    expected: 'different'
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('should fail when values are equal', async () => {
            const result = await tool.execute({
                rule: {
                    value: 'test',
                    operator: OPERATORS.NOT_EQUALS,
                    expected: 'test',
                    throwOnFailure: false
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(false);
        });
    });

    describe('CONTAINS Operator', () => {
        test('should pass when value contains expected', async () => {
            const result = await tool.execute({
                rule: {
                    value: 'hello world',
                    operator: OPERATORS.CONTAINS,
                    expected: 'world'
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('should fail when value does not contain expected', async () => {
            const result = await tool.execute({
                rule: {
                    value: 'hello world',
                    operator: OPERATORS.CONTAINS,
                    expected: 'foo',
                    throwOnFailure: false
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(false);
        });

        test('should be case-insensitive when specified', async () => {
            const result = await tool.execute({
                rule: {
                    value: 'Hello World',
                    operator: OPERATORS.CONTAINS,
                    expected: 'world',
                    caseSensitive: false
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('should throw error for non-string value', async () => {
            await expect(tool.execute({
                rule: {
                    value: 123,
                    operator: OPERATORS.CONTAINS,
                    expected: '12'
                }
            }, mockContext)).rejects.toThrow();
        });
    });

    describe('NOT_CONTAINS Operator', () => {
        test('should pass when value does not contain expected', async () => {
            const result = await tool.execute({
                rule: {
                    value: 'hello world',
                    operator: OPERATORS.NOT_CONTAINS,
                    expected: 'foo'
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('should fail when value contains expected', async () => {
            const result = await tool.execute({
                rule: {
                    value: 'hello world',
                    operator: OPERATORS.NOT_CONTAINS,
                    expected: 'world',
                    throwOnFailure: false
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(false);
        });
    });

    describe('Comparison Operators', () => {
        test('GREATER_THAN should compare numbers correctly', async () => {
            const result = await tool.execute({
                rule: {
                    value: 100,
                    operator: OPERATORS.GREATER_THAN,
                    expected: 50
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('LESS_THAN should compare numbers correctly', async () => {
            const result = await tool.execute({
                rule: {
                    value: 30,
                    operator: OPERATORS.LESS_THAN,
                    expected: 50
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('GREATER_THAN_OR_EQUAL should work with equal values', async () => {
            const result = await tool.execute({
                rule: {
                    value: 50,
                    operator: OPERATORS.GREATER_THAN_OR_EQUAL,
                    expected: 50
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('LESS_THAN_OR_EQUAL should work with equal values', async () => {
            const result = await tool.execute({
                rule: {
                    value: 50,
                    operator: OPERATORS.LESS_THAN_OR_EQUAL,
                    expected: 50
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });
    });

    describe('MATCHES_PATTERN Operator', () => {
        test('should match valid email pattern', async () => {
            const result = await tool.execute({
                rule: {
                    value: 'test@example.com',
                    operator: OPERATORS.MATCHES_PATTERN,
                    expected: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$'
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('should reject invalid email pattern', async () => {
            const result = await tool.execute({
                rule: {
                    value: 'invalid-email',
                    operator: OPERATORS.MATCHES_PATTERN,
                    expected: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
                    throwOnFailure: false
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(false);
        });

        test('should work with simple patterns', async () => {
            const result = await tool.execute({
                rule: {
                    value: 'abc123',
                    operator: OPERATORS.MATCHES_PATTERN,
                    expected: '^[a-z]+\\d+$'
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('should support case-insensitive regex', async () => {
            const result = await tool.execute({
                rule: {
                    value: 'ABC123',
                    operator: OPERATORS.MATCHES_PATTERN,
                    expected: '^[a-z]+\\d+$',
                    caseSensitive: false
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('should throw error for invalid regex', async () => {
            await expect(tool.execute({
                rule: {
                    value: 'test',
                    operator: OPERATORS.MATCHES_PATTERN,
                    expected: '[invalid(regex'
                }
            }, mockContext)).rejects.toThrow();
        });
    });

    describe('IS_EMPTY Operator', () => {
        test('should pass for empty string', async () => {
            const result = await tool.execute({
                rule: {
                    value: '',
                    operator: OPERATORS.IS_EMPTY
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('should pass for empty array', async () => {
            const result = await tool.execute({
                rule: {
                    value: [],
                    operator: OPERATORS.IS_EMPTY
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('should pass for empty object', async () => {
            const result = await tool.execute({
                rule: {
                    value: {},
                    operator: OPERATORS.IS_EMPTY
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('should pass for null', async () => {
            const result = await tool.execute({
                rule: {
                    value: null,
                    operator: OPERATORS.IS_EMPTY
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('should pass for undefined', async () => {
            const result = await tool.execute({
                rule: {
                    value: undefined,
                    operator: OPERATORS.IS_EMPTY
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('should fail for non-empty string', async () => {
            const result = await tool.execute({
                rule: {
                    value: 'test',
                    operator: OPERATORS.IS_EMPTY,
                    throwOnFailure: false
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(false);
        });
    });

    describe('IS_NOT_EMPTY Operator', () => {
        test('should pass for non-empty string', async () => {
            const result = await tool.execute({
                rule: {
                    value: 'test',
                    operator: OPERATORS.IS_NOT_EMPTY
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('should pass for non-empty array', async () => {
            const result = await tool.execute({
                rule: {
                    value: [1, 2, 3],
                    operator: OPERATORS.IS_NOT_EMPTY
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(true);
        });

        test('should fail for empty string', async () => {
            const result = await tool.execute({
                rule: {
                    value: '',
                    operator: OPERATORS.IS_NOT_EMPTY,
                    throwOnFailure: false
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(false);
        });

        test('should fail for null', async () => {
            const result = await tool.execute({
                rule: {
                    value: null,
                    operator: OPERATORS.IS_NOT_EMPTY,
                    throwOnFailure: false
                }
            }, mockContext);

            expect(result.shouldContinue).toBe(false);
        });
    });

    describe('Validation', () => {
        test('should throw error for missing rule', () => {
            expect(() => tool.validate({})).toThrow('Missing required parameter: rule');
        });

        test('should throw error for missing operator', () => {
            expect(() => tool.validate({ rule: { value: 'test' } }))
                .toThrow('Missing required rule property: operator');
        });

        test('should throw error for invalid operator', () => {
            expect(() => tool.validate({
                rule: { value: 'test', operator: 'INVALID' }
            })).toThrow('Invalid operator');
        });

        test('should throw error for missing value', () => {
            expect(() => tool.validate({
                rule: { operator: OPERATORS.EQUALS }
            })).toThrow('Missing required rule property: value');
        });

        test('should throw error for missing expected (when required)', () => {
            expect(() => tool.validate({
                rule: { value: 'test', operator: OPERATORS.EQUALS }
            })).toThrow("requires 'expected' property");
        });

        test('should not require expected for IS_EMPTY', () => {
            expect(() => tool.validate({
                rule: { value: 'test', operator: OPERATORS.IS_EMPTY }
            })).not.toThrow();
        });

        test('should not require expected for IS_NOT_EMPTY', () => {
            expect(() => tool.validate({
                rule: { value: 'test', operator: OPERATORS.IS_NOT_EMPTY }
            })).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('should use custom error message', async () => {
            const customMessage = 'This is a custom error';

            await expect(tool.execute({
                rule: {
                    value: 'test',
                    operator: OPERATORS.EQUALS,
                    expected: 'different',
                    errorMessage: customMessage
                }
            }, mockContext)).rejects.toThrow(customMessage);
        });

        test('should use default error message', async () => {
            await expect(tool.execute({
                rule: {
                    value: 'test',
                    operator: OPERATORS.EQUALS,
                    expected: 'different'
                }
            }, mockContext)).rejects.toThrow('Condition failed');
        });
    });
});
