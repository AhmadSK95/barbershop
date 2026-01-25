/**
 * Tool Executor
 * Validates tool calls and safely executes metrics
 */

const { getMetricDefinition } = require('../../config/metricsRegistry');
const { runMetric } = require('../../utils/assistantTools');

/**
 * Execute a tool call from OpenAI
 * @param {Object} toolCall - OpenAI tool call object
 * @param {boolean} revealPII - Whether to show PII
 * @returns {Promise<Object>} - Tool result
 */
async function executeTool(toolCall, revealPII = false) {
  const { name: toolName, arguments: toolArgs } = toolCall.function;
  
  try {
    // Parse arguments (they come as JSON string)
    const args = typeof toolArgs === 'string' ? JSON.parse(toolArgs) : toolArgs;
    
    // Validate tool exists in registry
    const metricDef = getMetricDefinition(toolName);
    if (!metricDef) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // Validate and normalize parameters
    const params = validateAndNormalizeParams(metricDef, args);

    // Execute the metric
    const startTime = Date.now();
    const result = await runMetric(toolName, params, revealPII);
    const executionTime = Date.now() - startTime;

    return {
      success: true,
      toolName,
      params,
      result: {
        ...result,
        executionTime
      }
    };

  } catch (error) {
    console.error(`Tool execution error for ${toolName}:`, error);
    return {
      success: false,
      toolName,
      error: error.message,
      details: error.stack
    };
  }
}

/**
 * Validate and normalize tool parameters
 * @param {Object} metricDef - Metric definition from registry
 * @param {Object} args - Raw arguments from OpenAI
 * @returns {Object} - Validated parameters
 */
function validateAndNormalizeParams(metricDef, args) {
  const params = {};

  for (const paramDef of metricDef.parameters) {
    const { name, type, required, default: defaultValue } = paramDef;
    
    let value = args[name];

    // Use default if not provided
    if (value === undefined || value === null) {
      if (required && !defaultValue) {
        throw new Error(`Required parameter missing: ${name}`);
      }
      value = defaultValue;
    }

    // Type validation
    if (value !== undefined && value !== null) {
      if (type === 'number' && typeof value !== 'number') {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
          throw new Error(`Parameter ${name} must be a number`);
        }
        value = parsed;
      }

      if (type === 'string' && typeof value !== 'string') {
        value = String(value);
      }
    }

    params[name] = value;
  }

  return params;
}

/**
 * Execute multiple tool calls in sequence
 * @param {Array} toolCalls - Array of tool call objects
 * @param {boolean} revealPII - Whether to show PII
 * @returns {Promise<Array>} - Array of results
 */
async function executeToolCalls(toolCalls, revealPII = false) {
  const results = [];

  for (const toolCall of toolCalls) {
    const result = await executeTool(toolCall, revealPII);
    results.push({
      toolCallId: toolCall.id,
      ...result
    });
  }

  return results;
}

/**
 * Format tool results for OpenAI API
 * @param {Array} toolResults - Results from executeToolCalls
 * @returns {Array} - Formatted for OpenAI messages
 */
function formatToolResultsForOpenAI(toolResults) {
  return toolResults.map(result => ({
    role: 'tool',
    tool_call_id: result.toolCallId,
    content: JSON.stringify({
      success: result.success,
      data: result.success ? result.result : null,
      error: result.error || null
    })
  }));
}

module.exports = {
  executeTool,
  executeToolCalls,
  formatToolResultsForOpenAI
};
