const axios = require('axios');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://ollama:11434';
const MODEL_NAME = 'qwen2.5:7b-instruct-q4_k_m';
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Call Ollama LLM with a prompt
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Additional options
 * @returns {Promise<string>} - The LLM response
 */
async function callLLM(prompt, options = {}) {
  try {
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: MODEL_NAME,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.1, // Low temperature for factual responses
          top_p: options.top_p || 0.9,
          top_k: options.top_k || 40,
          num_predict: options.num_predict || 500,
          ...options.modelOptions
        }
      },
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.response;
  } catch (error) {
    console.error('Ollama LLM error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      throw new Error('LLM service unavailable. Please contact support.');
    }
    throw new Error(`LLM request failed: ${error.message}`);
  }
}

/**
 * Check if Ollama service is available
 * @returns {Promise<boolean>}
 */
async function checkHealth() {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 5000
    });
    return response.status === 200;
  } catch (error) {
    console.error('Ollama health check failed:', error.message);
    return false;
  }
}

/**
 * Ensure the model is loaded
 * @returns {Promise<boolean>}
 */
async function ensureModelLoaded() {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 5000
    });
    
    const models = response.data.models || [];
    const modelExists = models.some(m => m.name.includes(MODEL_NAME) || m.name.includes('qwen2.5:7b'));
    
    if (!modelExists) {
      console.warn(`Model ${MODEL_NAME} not found. Please pull it: ollama pull ${MODEL_NAME}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to check model:', error.message);
    return false;
  }
}

module.exports = {
  callLLM,
  checkHealth,
  ensureModelLoaded,
  MODEL_NAME
};
