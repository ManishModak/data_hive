const Tool = require('./Tool');

/**
 * Operators supported by ConditionalGateTool
 */
const OPERATORS = {
    EQUALS: 'EQUALS',
    NOT_EQUALS: 'NOT_EQUALS',
    CONTAINS: 'CONTAINS',
    NOT_CONTAINS: 'NOT_CONTAINS',
    GREATER_THAN: 'GREATER_THAN',
    LESS_THAN: 'LESS_THAN',
    GREATER_THAN_OR_EQUAL: 'GREATER_THAN_OR_EQUAL',
    LESS_THAN_OR_EQUAL: 'LESS_THAN_OR_EQUAL',
    MATCHES_PATTERN: 'MATCHES_PATTERN', // regex
    IS_EMPTY: 'IS_EMPTY',
    IS_NOT_EMPTY: 'IS_NOT_EMPTY'
};

/**
 * Conditional Gate Tool
 * Validates data against conditions and controls flow execution
 * 
 * Example usage:
 * {
 *   rule: {
 *     value: "test@example.com",
 *     operator: "MATCHES_PATTERN",
 *     expected: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$",
 *     caseSensitive: false,
 *     throwOnFailure: true,
 *     errorMessage: "Invalid email format"
 *   }
 * }
 */
class ConditionalGateTool extends Tool {
    constructor() {
        super('conditional-gate');
    }

    /**
     * Execute the conditional validation
     * 
     * @param {Object} params - Tool parameters
     * @param {Object} params.rule - Validation rule
     * @param {*} params.rule.value - Value to test
     * @param {string} params.rule.operator - Comparison operator (see OPERATORS)
     * @param {*} params.rule.expected - Expected value (not needed for IS_EMPTY/IS_NOT_EMPTY)
     * @param {boolean} [params.rule.caseSensitive=true] - Case sensitive comparison
     * @param {boolean} [params.rule.throwOnFailure=true] - Throw error or return false
     * @param {string} [params.rule.errorMessage] - Custom error message
     * @param {Object} context - Execution context
     * @returns {Promise<{result: boolean, shouldContinue: boolean}>}
     */
    async execute(params, context) {
        const { rule } = params;
        const {
            value,
            operator,
            expected,
            caseSensitive = true,
            throwOnFailure = true,
            errorMessage
        } = rule;

        const logger = context.logger || console;

        logger.debug(`[ConditionalGate] Testing: ${JSON.stringify(value)} ${operator} ${JSON.stringify(expected)}`);

        try {
            const result = this.evaluate(value, operator, expected, caseSensitive);

            if (!result) {
                const message = errorMessage ||
                    `Condition failed: ${JSON.stringify(value)} ${operator} ${JSON.stringify(expected)}`;

                if (throwOnFailure) {
                    throw new Error(message);
                }

                logger.warn(`[ConditionalGate] ${message}`);
                return { result: false, shouldContinue: false };
            }

            logger.info(`[ConditionalGate] Condition passed ✓`);
            return { result: true, shouldContinue: true };

        } catch (error) {
            logger.error(`[ConditionalGate] Evaluation error:`, error);

            if (throwOnFailure) {
                throw error;
            }

            return { result: false, shouldContinue: false };
        }
    }

    /**
     * Evaluate a condition
     * 
     * @param {*} value - Value to test
     * @param {string} operator - Comparison operator
     * @param {*} expected - Expected value
     * @param {boolean} caseSensitive - Case sensitive comparison
     * @returns {boolean} True if condition passes
     */
    evaluate(value, operator, expected, caseSensitive) {
        // Normalize for case-insensitive comparison
        const normalize = (val) => {
            if (!caseSensitive && typeof val === 'string') {
                return val.toLowerCase();
            }
            return val;
        };

        const normalizedValue = normalize(value);
        const normalizedExpected = normalize(expected);

        switch (operator) {
            case OPERATORS.EQUALS:
                return normalizedValue === normalizedExpected;

            case OPERATORS.NOT_EQUALS:
                return normalizedValue !== normalizedExpected;

            case OPERATORS.CONTAINS:
                if (typeof normalizedValue !== 'string') {
                    throw new Error(`CONTAINS operator requires string value, got ${typeof value}`);
                }
                if (typeof normalizedExpected !== 'string') {
                    throw new Error(`CONTAINS operator requires string expected, got ${typeof expected}`);
                }
                return normalizedValue.includes(normalizedExpected);

            case OPERATORS.NOT_CONTAINS:
                if (typeof normalizedValue !== 'string') {
                    throw new Error(`NOT_CONTAINS operator requires string value, got ${typeof value}`);
                }
                if (typeof normalizedExpected !== 'string') {
                    throw new Error(`NOT_CONTAINS operator requires string expected, got ${typeof expected}`);
                }
                return !normalizedValue.includes(normalizedExpected);

            case OPERATORS.GREATER_THAN:
                return Number(value) > Number(expected);

            case OPERATORS.LESS_THAN:
                return Number(value) < Number(expected);

            case OPERATORS.GREATER_THAN_OR_EQUAL:
                return Number(value) >= Number(expected);

            case OPERATORS.LESS_THAN_OR_EQUAL:
                return Number(value) <= Number(expected);

            case OPERATORS.MATCHES_PATTERN:
                try {
                    if (typeof expected !== 'string') {
                        throw new Error(`MATCHES_PATTERN operator requires regex pattern string, got ${typeof expected}`);
                    }
                    const regex = new RegExp(expected, caseSensitive ? '' : 'i');
                    return regex.test(String(value));
                } catch (error) {
                    throw new Error(`Invalid regex pattern '${expected}': ${error.message}`);
                }

            case OPERATORS.IS_EMPTY:
                // Check for null, undefined, empty string, empty array
                if (value === null || value === undefined) return true;
                if (typeof value === 'string') return value.length === 0;
                if (Array.isArray(value)) return value.length === 0;
                if (typeof value === 'object') return Object.keys(value).length === 0;
                return false;

            case OPERATORS.IS_NOT_EMPTY:
                // Inverse of IS_EMPTY
                if (value === null || value === undefined) return false;
                if (typeof value === 'string') return value.length > 0;
                if (Array.isArray(value)) return value.length > 0;
                if (typeof value === 'object') return Object.keys(value).length > 0;
                return true;

            default:
                throw new Error(`Unsupported operator: ${operator}`);
        }
    }

    /**
     * Validate parameters before execution
     * 
     * @param {Object} params - Parameters to validate
     * @returns {boolean} True if valid
     * @throws {Error} If validation fails
     */
    validate(params) {
        if (!params || !params.rule) {
            throw new Error('Missing required parameter: rule');
        }

        const { rule } = params;

        if (!rule.operator) {
            throw new Error('Missing required rule property: operator');
        }

        if (!Object.values(OPERATORS).includes(rule.operator)) {
            const validOperators = Object.values(OPERATORS).join(', ');
            throw new Error(
                `Invalid operator '${rule.operator}'. Valid operators: ${validOperators}`
            );
        }

        // value is required
        if (rule.value === undefined) {
            throw new Error('Missing required rule property: value');
        }

        // expected is required for most operators (except IS_EMPTY/IS_NOT_EMPTY)
        if (rule.operator !== OPERATORS.IS_EMPTY &&
            rule.operator !== OPERATORS.IS_NOT_EMPTY &&
            rule.expected === undefined) {
            throw new Error(`Operator '${rule.operator}' requires 'expected' property`);
        }

        return true;
    }

    /**
     * Get tool metadata
     * 
     * @returns {Object} Tool metadata with supported operators
     */
    getMetadata() {
        return {
            name: this.name,
            description: 'Validates data against conditions and controls flow execution',
            operators: Object.values(OPERATORS),
            examples: [
                {
                    description: 'Check if value equals expected',
                    rule: {
                        value: 'test',
                        operator: 'EQUALS',
                        expected: 'test'
                    }
                },
                {
                    description: 'Check if email matches pattern',
                    rule: {
                        value: 'test@example.com',
                        operator: 'MATCHES_PATTERN',
                        expected: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$'
                    }
                },
                {
                    description: 'Check if value is not empty',
                    rule: {
                        value: 'some value',
                        operator: 'IS_NOT_EMPTY'
                    }
                },
                {
                    description: 'Check if number is greater than threshold',
                    rule: {
                        value: 100,
                        operator: 'GREATER_THAN',
                        expected: 50
                    }
                }
            ]
        };
    }
}

module.exports = { ConditionalGateTool, OPERATORS };
