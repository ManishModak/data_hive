const winston = require('winston');

// Mock logger
const logger = winston.createLogger({
    level: 'debug',
    transports: [new winston.transports.Console()]
});

class JobManager {
    constructor() { }

    // Helper to replace variables in strings/objects
    replaceVariables(target, variables) {
        if (typeof target === 'string') {
            return target.replace(/\{\{\s*vars\.(.*?)\s*\}\}/g, (_, key) => {
                const trimmedKey = key.trim();
                if (variables.hasOwnProperty(trimmedKey)) {
                    return variables[trimmedKey];
                }
                logger.warn(`Variable not found: ${trimmedKey}`);
                return `{{vars.${trimmedKey}}}`;
            });
        } else if (Array.isArray(target)) {
            return target.map(item => this.replaceVariables(item, variables));
        } else if (typeof target === 'object' && target !== null) {
            const newObj = {};
            for (const key in target) {
                newObj[key] = this.replaceVariables(target[key], variables);
            }
            return newObj;
        }
        return target;
    }
}

const manager = new JobManager();
const variables = {
    url: 'https://example.com',
    name: 'Test Job'
};

const tests = [
    { input: '{{vars.url}}', expected: 'https://example.com' },
    { input: '{{ vars.url }}', expected: 'https://example.com' },
    { input: '{{  vars.url  }}', expected: 'https://example.com' },
    { input: 'Visit {{vars.url}} now', expected: 'Visit https://example.com now' },
    { input: { link: '{{vars.url}}', id: 123 }, expected: { link: 'https://example.com', id: 123 } },
    { input: ['{{vars.name}}', '{{vars.url}}'], expected: ['Test Job', 'https://example.com'] },
    { input: '{{vars.missing}}', expected: '{{vars.missing}}' } // Should warn
];

let passed = 0;
let failed = 0;

console.log('--- Running Tests ---');
tests.forEach((test, index) => {
    const result = manager.replaceVariables(test.input, variables);
    const resultStr = JSON.stringify(result);
    const expectedStr = JSON.stringify(test.expected);

    if (resultStr === expectedStr) {
        console.log(`Test ${index + 1} PASSED`);
        passed++;
    } else {
        console.error(`Test ${index + 1} FAILED`);
        console.error(`  Input: ${JSON.stringify(test.input)}`);
        console.error(`  Expected: ${expectedStr}`);
        console.error(`  Actual:   ${resultStr}`);
        failed++;
    }
});

console.log(`\nSummary: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
