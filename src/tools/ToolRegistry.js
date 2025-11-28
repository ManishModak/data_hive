const Tool = require('./Tool');

/**
 * Registry for managing and executing tools
 * Provides centralized tool management and execution
 */
class ToolRegistry {
    constructor() {
        this.tools = new Map();
    }

    /**
     * Register a tool in the registry
     * 
     * @param {Tool} tool - Tool instance to register
     * @throws {Error} If tool is not a Tool instance or name already exists
     */
    register(tool) {
        if (!(tool instanceof Tool)) {
            throw new Error('Tool must extend the Tool base class');
        }

        if (this.tools.has(tool.name)) {
            throw new Error(`Tool with name '${tool.name}' is already registered`);
        }

        this.tools.set(tool.name, tool);
        console.log(`[ToolRegistry] Registered tool: ${tool.name}`);
    }

    /**
     * Register multiple tools at once
     * 
     * @param {Tool[]} tools - Array of tool instances
     */
    registerAll(tools) {
        for (const tool of tools) {
            this.register(tool);
        }
    }

    /**
     * Get a tool by name
     * 
     * @param {string} name - Tool name
     * @returns {Tool} Tool instance
     * @throws {Error} If tool not found
     */
    get(name) {
        const tool = this.tools.get(name);
        if (!tool) {
            const availableTools = Array.from(this.tools.keys()).join(', ');
            throw new Error(
                `Tool '${name}' not found. Available tools: ${availableTools || 'none'}`
            );
        }
        return tool;
    }

    /**
     * Check if a tool exists
     * 
     * @param {string} name - Tool name
     * @returns {boolean} True if tool exists
     */
    has(name) {
        return this.tools.has(name);
    }

    /**
     * List all registered tool names
     * 
     * @returns {string[]} Array of tool names
     */
    list() {
        return Array.from(this.tools.keys());
    }

    /**
     * Get all registered tools with their metadata
     * 
     * @returns {Object[]} Array of tool metadata
     */
    getAllMetadata() {
        return Array.from(this.tools.values()).map(tool => tool.getMetadata());
    }

    /**
     * Execute a tool by name
     * 
     * @param {string} name - Tool name
     * @param {Object} params - Tool parameters
     * @param {Object} context - Execution context
     * @returns {Promise<{result: any, shouldContinue: boolean}>}
     */
    async execute(name, params, context) {
        const tool = this.get(name);

        // Validate params before execution
        tool.validate(params);

        // Execute the tool
        const result = await tool.execute(params, context);

        return result;
    }

    /**
     * Clear all registered tools
     * Useful for testing
     */
    clear() {
        this.tools.clear();
    }

    /**
     * Get the number of registered tools
     * 
     * @returns {number} Tool count
     */
    get size() {
        return this.tools.size;
    }
}

module.exports = ToolRegistry;
