const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL_NAME = process.env.OPENAI_MODEL || 'gpt-4o-mini'; // Fast and cost-effective
const REQUEST_TIMEOUT = 10000; // 10 seconds

if (!OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY not set. LLM features will use keyword fallback only.');
}

const openai = OPENAI_API_KEY ? new OpenAI({
  apiKey: OPENAI_API_KEY,
  timeout: REQUEST_TIMEOUT
}) : null;

/**
 * Call OpenAI LLM with a prompt
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Additional options
 * @returns {Promise<string>} - The LLM response
 */
async function callLLM(prompt, options = {}) {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        {
          role: 'system',
          content: 'You are a barbershop analytics assistant. Classify user questions into metric types. Be concise and precise.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options.temperature || 0.1, // Low temperature for factual responses
      max_tokens: options.max_tokens || 150, // Keep responses concise
      top_p: options.top_p || 0.9
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI LLM error:', error.message);
    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key');
    }
    if (error.status === 429) {
      throw new Error('OpenAI rate limit exceeded');
    }
    throw new Error(`LLM request failed: ${error.message}`);
  }
}

/**
 * Check if OpenAI service is available
 * @returns {Promise<boolean>}
 */
async function checkHealth() {
  if (!openai) {
    return false;
  }

  try {
    // Simple test call with minimal tokens
    await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 5
    });
    return true;
  } catch (error) {
    console.error('OpenAI health check failed:', error.message);
    return false;
  }
}

/**
 * Ensure the model is available (always true for OpenAI API)
 * @returns {Promise<boolean>}
 */
async function ensureModelLoaded() {
  return openai !== null;
}

module.exports = {
  callLLM,
  checkHealth,
  ensureModelLoaded,
  MODEL_NAME
};
