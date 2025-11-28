/**
 * Demo script to showcase the Tool Registry System and Conditional Gate Tool
 * Run with: node examples/tool-demo.js
 */

const { ToolRegistry, ConditionalGateTool, OPERATORS } = require('../src/tools');

// Mock logger for demo
const logger = {
    debug: (msg, ...args) => console.log(`[DEBUG] ${msg}`, ...args),
    info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args)
};

async function runDemo() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  DataHive Tool Registry System Demo');
    console.log('═══════════════════════════════════════════════════\n');

    // Create registry
    const registry = new ToolRegistry();

    // Register conditional gate tool
    const conditionalTool = new ConditionalGateTool();
    registry.register(conditionalTool);

    console.log('✓ Registered tools:', registry.list().join(', '));
    console.log();

    // Example context
    const context = {
        jobId: 'demo-job-123',
        logger: logger
    };

    // Demo 1: EQUALS operator
    console.log('─── Test 1: EQUALS Operator ───');
    try {
        const result1 = await registry.execute('conditional-gate', {
            rule: {
                value: 'success',
                operator: OPERATORS.EQUALS,
                expected: 'success'
            }
        }, context);
        console.log('✓ Result:', result1);
    } catch (error) {
        console.log('✗ Error:', error.message);
    }
    console.log();

    // Demo 2: MATCHES_PATTERN (Email validation)
    console.log('─── Test 2: Email Pattern Matching ───');
    try {
        const result2 = await registry.execute('conditional-gate', {
            rule: {
                value: 'user@example.com',
                operator: OPERATORS.MATCHES_PATTERN,
                expected: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$'
            }
        }, context);
        console.log('✓ Email is valid');
    } catch (error) {
        console.log('✗ Email is invalid:', error.message);
    }
    console.log();

    // Demo 3: CONTAINS operator (case-insensitive)
    console.log('─── Test 3: CONTAINS (Case-Insensitive) ───');
    try {
        const result3 = await registry.execute('conditional-gate', {
            rule: {
                value: 'Hello World',
                operator: OPERATORS.CONTAINS,
                expected: 'world',
                caseSensitive: false
            }
        }, context);
        console.log('✓ Contains "world"');
    } catch (error) {
        console.log('✗ Error:', error.message);
    }
    console.log();

    // Demo 4: GREATER_THAN operator
    console.log('─── Test 4: Number Comparison ───');
    try {
        const result4 = await registry.execute('conditional-gate', {
            rule: {
                value: 100,
                operator: OPERATORS.GREATER_THAN,
                expected: 50
            }
        }, context);
        console.log('✓ 100 is greater than 50');
    } catch (error) {
        console.log('✗ Error:', error.message);
    }
    console.log();

    // Demo 5: IS_NOT_EMPTY operator
    console.log('─── Test 5: IS_NOT_EMPTY ───');
    try {
        const result5 = await registry.execute('conditional-gate', {
            rule: {
                value: ['item1', 'item2'],
                operator: OPERATORS.IS_NOT_EMPTY
            }
        }, context);
        console.log('✓ Array is not empty');
    } catch (error) {
        console.log('✗ Error:', error.message);
    }
    console.log();

    // Demo 6: Failed condition (throwOnFailure = false)
    console.log('─── Test 6: Failed Condition (No Throw) ───');
    try {
        const result6 = await registry.execute('conditional-gate', {
            rule: {
                value: 'test',
                operator: OPERATORS.EQUALS,
                expected: 'different',
                throwOnFailure: false,
                errorMessage: 'Values do not match'
            }
        }, context);
        console.log('Result:', result6);
    } catch (error) {
        console.log('✗ Error:', error.message);
    }
    console.log();

    // Demo 7: Failed condition (throwOnFailure = true)
    console.log('─── Test 7: Failed Condition (With Throw) ───');
    try {
        const result7 = await registry.execute('conditional-gate', {
            rule: {
                value: 'test',
                operator: OPERATORS.EQUALS,
                expected: 'different',
                throwOnFailure: true,
                errorMessage: 'Custom error: Values must match!'
            }
        }, context);
        console.log('Result:', result7);
    } catch (error) {
        console.log('✗ Caught error:', error.message);
    }
    console.log();

    // Show all operators
    console.log('─── All Supported Operators ───');
    const metadata = conditionalTool.getMetadata();
    console.log('Operators:', metadata.operators.join(', '));
    console.log();

    // Show examples
    console.log('─── Example Usage ───');
    metadata.examples.forEach((example, i) => {
        console.log(`${i + 1}. ${example.description}`);
        console.log('   Rule:', JSON.stringify(example.rule, null, 2));
    });

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  Demo Complete!');
    console.log('═══════════════════════════════════════════════════');
}

// Run the demo
runDemo().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
});
