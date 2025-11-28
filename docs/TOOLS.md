# Tool System Documentation

## Overview

The DataHive Tool Registry System provides a modular, extensible architecture for job processing. It includes a base `Tool` class, a `ToolRegistry` for managing tools, and a powerful `ConditionalGateTool` for data validation.

## Components

### 1. Tool (Base Class)

All tools must extend the `Tool` base class.

```javascript
const Tool = require('./tools/Tool');

class MyCustomTool extends Tool {
  constructor() {
    super('my-custom-tool');
  }
  
  async execute(params, context) {
    // Your tool logic here
    return {
      result: 'some data',
      shouldContinue: true
    };
  }
  
  validate(params) {
    // Validate params before execution
    return true;
  }
}
```

#### Methods

- `constructor(name)` - Set unique tool name
- `execute(params, context)` - Main execution logic (must implement)
- `validate(params)` - Parameter validation (optional)
- `getMetadata()` - Return tool metadata (optional)

#### Context Object

The `context` parameter provides:

- `jobId`: Current job ID
- `variables`: Available variables
- `logger`: Logger instance

### 2. ToolRegistry

Centralized tool management and execution.

```javascript
const { ToolRegistry } = require('./tools');

const registry = new ToolRegistry();

// Register tools
registry.register(new MyCustomTool());

// Execute tool
const result = await registry.execute('my-custom-tool', params, context);
```

#### Methods

- `register(tool)` - Register a single tool
- `registerAll(tools[])` - Register multiple tools
- `get(name)` - Retrieve tool by name
- `has(name)` - Check if tool exists
- `list()` - List all tool names
- `execute(name, params, context)` - Execute tool
- `getAllMetadata()` - Get metadata for all tools
- `clear()` - Remove all tools
- `size` - Number of registered tools

### 3. ConditionalGateTool

Validates data against conditions with 11 operators.

```javascript
const { ConditionalGateTool, OPERATORS } = require('./tools');

const tool = new ConditionalGateTool();

await tool.execute({
  rule: {
    value: 'test@example.com',
    operator: OPERATORS.MATCHES_PATTERN,
    expected: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
    caseSensitive: true,
    throwOnFailure: true,
    errorMessage: 'Invalid email format'
  }
}, context);
```

## Operators

### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `EQUALS` | Exact equality | `"test" == "test"` |
| `NOT_EQUALS` | Inequality | `"test" != "other"` |
| `GREATER_THAN` | Number > | `100 > 50` |
| `LESS_THAN` | Number < | `30 < 50` |
| `GREATER_THAN_OR_EQUAL` | Number >= | `50 >= 50` |
| `LESS_THAN_OR_EQUAL` | Number <= | `50 <= 50` |

### String Operators

| Operator | Description | Case Sensitive |
|----------|-------------|----------------|
| `CONTAINS` | Substring search | Optional |
| `NOT_CONTAINS` | Negative substring | Optional |
| `MATCHES_PATTERN` | Regex match | Optional |

### Existence Operators

| Operator | Description | Supports |
|----------|-------------|----------|
| `IS_EMPTY` | Check if empty | String, Array, Object, null, undefined |
| `IS_NOT_EMPTY` | Check if not empty | String, Array, Object, null, undefined |

## Usage Examples

### Example 1: Email Validation

```javascript
const result = await registry.execute('conditional-gate', {
  rule: {
    value: user.email,
    operator: OPERATORS.MATCHES_PATTERN,
    expected: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
    errorMessage: 'Invalid email format'
  }
}, context);
```

### Example 2: Status Check

```javascript
const result = await registry.execute('conditional-gate', {
  rule: {
    value: apiResponse.status,
    operator: OPERATORS.EQUALS,
    expected: 'success',
    throwOnFailure: true
  }
}, context);
```

### Example 3: Numeric Range Validation

```javascript
const result = await registry.execute('conditional-gate', {
  rule: {
    value: user.age,
    operator: OPERATORS.GREATER_THAN_OR_EQUAL,
    expected: 18,
    errorMessage: 'Must be 18 or older'
  }
}, context);
```

### Example 4: Case-Insensitive Search

```javascript
const result = await registry.execute('conditional-gate', {
  rule: {
    value: 'Hello World',
    operator: OPERATORS.CONTAINS,
    expected: 'hello',
    caseSensitive: false
  }
}, context);
```

### Example 5: Array Empty Check

```javascript
const result = await registry.execute('conditional-gate', {
  rule: {
    value: results,
    operator: OPERATORS.IS_NOT_EMPTY,
    errorMessage: 'No results found'
  }
}, context);
```

### Example 6: Soft Validation (No Throw)

```javascript
const result = await registry.execute('conditional-gate', {
  rule: {
    value: optionalField,
    operator: OPERATORS.IS_NOT_EMPTY,
    throwOnFailure: false  // Returns false instead of throwing
  }
}, context);

if (!result.shouldContinue) {
  // Handle validation failure gracefully
  logger.warn('Optional field is empty');
}
```

## Testing

### Run Unit Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Watch Mode

```bash
npm run test:watch
```

### Run Demo

```bash
npm run demo
```

## Files Created

```
src/tools/
├── Tool.js                    # Base tool class
├── ToolRegistry.js            # Tool registry
├── ConditionalGateTool.js     # Conditional validation tool
└── index.js                   # Exports

tests/tools/
├── ToolRegistry.test.js       # Registry tests
└── ConditionalGateTool.test.js # Conditional tool tests

examples/
└── tool-demo.js               # Interactive demo
```

## Integration with Job Processing

To integrate with your JobManager:

```javascript
// In JobManager
const { ToolRegistry, ConditionalGateTool } = require('./tools');

class JobManager {
  constructor(apiClient, scraper) {
    this.apiClient = apiClient;
    this.scraper = scraper;
    this.registry = new ToolRegistry();
    
    // Register tools
    this.registry.register(new ConditionalGateTool());
    // Register more tools...
  }
  
  async processJobStep(step, context) {
    const toolName = step.use; // e.g., 'conditional-gate'
    const params = step; // Step contains params
    
    return await this.registry.execute(toolName, params, context);
  }
}
```

## Error Handling

The `ConditionalGateTool` provides two error modes:

### 1. Throw Mode (Default)

```javascript
try {
  await tool.execute({
    rule: { value: 'test', operator: 'EQUALS', expected: 'other' }
  }, context);
} catch (error) {
  // Handle validation error
  logger.error('Validation failed:', error.message);
}
```

### 2. No-Throw Mode

```javascript
const result = await tool.execute({
  rule: {
    value: 'test',
    operator: 'EQUALS',
    expected: 'other',
    throwOnFailure: false
  }
}, context);

if (!result.shouldContinue) {
  // Validation failed, handle gracefully
}
```

## Best Practices

1. **Always validate params** before execution
2. **Use context.logger** for debugging
3. **Provide custom error messages** for better UX
4. **Use throwOnFailure: false** for optional validations
5. **Case-insensitive** comparisons when appropriate
6. **Test regex patterns** before deployment

## Next Steps

1. Migrate existing fetch logic to `FetchTool`
2. Migrate Puppeteer logic to `OffscreenTool`
3. Create `FetchAndExtractTool` combining fetch + parse
4. Update `JobManager` to use tool registry
5. Add performance monitoring tool
6. Create configuration management tool

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Tool Registry Pattern](https://refactoring.guru/design-patterns/registry)
- [Regex Testing](https://regex101.com/)
