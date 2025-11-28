/**
 * Demo for the full tool system
 * Shows FetchTool, OffscreenTool, and FetchAndExtractTool in action
 * Run with: node examples/all-tools-demo.js
 */

const {
    ToolRegistry,
    ConditionalGateTool,
    FetchTool,
    OffscreenTool,
    FetchAndExtractTool,
    OPERATORS
} = require('../src/tools');
const Scraper = require('../src/Scraper');

const logger = {
    debug: (msg, ...args) => console.log(`[DEBUG] ${msg}`, ...args),
    info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args)
};

async function runDemo() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  DataHive Full Tool System Demo');
    console.log('═══════════════════════════════════════════════════\n');

    // Create registry and register all tools
    const registry = new ToolRegistry();

    // Initialize scraper for OffscreenTool
    const scraper = new Scraper();
    await scraper.init();

    // Register tools
    registry.register(new ConditionalGateTool());
    registry.register(new FetchTool());

    const offscreenTool = new OffscreenTool();
    offscreenTool.setBrowser(scraper.browser);
    registry.register(offscreenTool);

    registry.register(new FetchAndExtractTool());

    console.log('✓ Registered tools:', registry.list().join(', '));
    console.log();

    const context = {
        jobId: 'demo-job-456',
        logger: logger,
        variables: {}
    };

    // Demo 1: FetchTool - Get JSON data
    console.log('─── Test 1: FetchTool (JSON API) ───');
    try {
        const result1 = await registry.execute('fetch', {
            url: 'https://jsonplaceholder.typicode.com/posts/1',
            method: 'GET',
            output: 'api_data'
        }, context);

        console.log('✓ Fetch successful');
        console.log('  Status:', result1.result.status);
        console.log('  Data:', JSON.stringify(result1.result.data, null, 2).substring(0, 200) + '...');
    } catch (error) {
        console.log('✗ Error:', error.message);
    }
    console.log();

    // Demo 2: ConditionalGateTool - Validate HTTP status
    console.log('─── Test 2: Validate API Response Status ───');
    try {
        const result2 = await registry.execute('conditional-gate', {
            rule: {
                value: 200,
                operator: OPERATORS.EQUALS,
                expected: 200,
                errorMessage: 'API returned non-200 status'
            }
        }, context);
        console.log('✓ Status validation passed');
    } catch (error) {
        console.log('✗ Validation failed:', error.message);
    }
    console.log();

    // Demo 3: OffscreenTool - Scrape a real website
    console.log('─── Test 3: OffscreenTool (Web Scraping) ───');
    try {
        const result3 = await registry.execute('offscreen', {
            url: 'https://example.com',
            rules: {
                fields: [
                    { field_name: 'title', xpath: '//h1/text()' },
                    { field_name: 'paragraphs', xpath: '//p' }
                ]
            },
            output: 'scraped_data'
        }, context);

        console.log('✓ Scraping successful');
        console.log('  Title:', result3.result.title);
        console.log('  Paragraphs:', result3.result.paragraphs ? result3.result.paragraphs.length : 0);
    } catch (error) {
        console.log('✗ Error:', error.message);
    }
    console.log();

    // Demo 4: FetchAndExtractTool - Simple HTML parsing
    console.log('─── Test 4: FetchAndExtractTool (HTML Parse) ───');
    try {
        const result4 = await registry.execute('fetch-and-extract', {
            url: 'https://example.com',
            rules: {
                fields: [
                    { field_name: 'title', selector: 'h1' },
                    { field_name: 'content', selector: 'p' }
                ]
            },
            output: 'html_data'
        }, context);

        console.log('✓ Fetch and extract successful');
        console.log('  Extracted fields:', Object.keys(result4.result).join(', '));
    } catch (error) {
        console.log('✗ Error:', error.message);
    }
    console.log();

    // Demo 5: Chain multiple tools
    console.log('─── Test 5: Tool Chain (Fetch → Validate → Process) ───');
    try {
        // Step 1: Fetch data
        const fetchResult = await registry.execute('fetch', {
            url: 'https://jsonplaceholder.typicode.com/users/1',
            output: 'user_data'
        }, context);

        console.log('✓ Step 1: Fetched user data');

        // Step 2: Validate email field exists
        const validateResult = await registry.execute('conditional-gate', {
            rule: {
                value: fetchResult.result.data.email,
                operator: OPERATORS.IS_NOT_EMPTY,
                errorMessage: 'Email field is missing'
            }
        }, context);

        console.log('✓ Step 2: Email field validated');

        // Step 3: Validate email format
        const emailValidation = await registry.execute('conditional-gate', {
            rule: {
                value: fetchResult.result.data.email,
                operator: OPERATORS.MATCHES_PATTERN,
                expected: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
                errorMessage: 'Invalid email format'
            }
        }, context);

        console.log('✓ Step 3: Email format validated');
        console.log('  Email:', fetchResult.result.data.email);
    } catch (error) {
        console.log('✗ Chain failed:', error.message);
    }
    console.log();

    // Clean up
    await scraper.close();

    // Show registry stats
    console.log('─── Registry Statistics ───');
    console.log('Total tools registered:', registry.size);
    console.log('Available tools:', registry.list());

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  Demo Complete!');
    console.log('═══════════════════════════════════════════════════');
}

// Run the demo
runDemo().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
});
