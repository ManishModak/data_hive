/**
 * Base Tool class for the DataHive tool system
 * All tools must extend this class and implement the execute method
 */
class Tool {
    /**
     * @param {string} name - Unique identifier for the tool
     */
    constructor(name) {
        if (!name) {
            throw new Error('Tool name is required');
        }
        this.name = name;
    }

    /**
     * Execute the tool with given parameters
     * Must be implemented by subclasses
     * 
     * @param {Object} params - Tool-specific parameters
     * @param {Object} context - Execution context
     * @param {string} context.jobId - ID of the current job
     * @param {Object} context.variables - Available variables for substitution
     * @param {Object} context.logger - Logger instance
     * @returns {Promise<{result: any, shouldContinue: boolean}>}
     */
    async execute(params, context) {
        throw new Error(`Tool ${this.name} must implement execute() method`);
    }

    /**
     * Validate tool parameters before execution
     * Override in subclasses for custom validation
     * 
     * @param {Object} params - Tool parameters to validate
     * @returns {boolean} True if valid
     * @throws {Error} If validation fails
     */
    validate(params) {
        // Default: no validation required
        return true;
    }

    /**
     * Get tool metadata (name, description, etc.)
     * Override in subclasses for custom metadata
     * 
     * @returns {Object} Tool metadata
     */
    getMetadata() {
        return {
            name: this.name,
            description: 'No description provided'
        };
    }
}

module.exports = Tool;
