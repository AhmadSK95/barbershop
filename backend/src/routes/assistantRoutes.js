const express = require('express');
const router = express.Router();
const {
  getAvailableMetrics,
  executeMetric,
  getDatabaseSchema
} = require('../controllers/assistantController');
const {
  streamChat,
  getChatHistory
} = require('../controllers/chatController');
const { protect, adminOnly } = require('../middleware/auth');
const { assistantLimiter } = require('../middleware/assistantRateLimiter');

// All routes require admin access
router.use(protect, adminOnly);

// Apply stricter rate limiting to assistant routes
router.use(assistantLimiter);

// Get list of available metrics
router.get('/metrics', getAvailableMetrics);

// Execute a metric query (with audit logging)
router.post('/query', executeMetric);

// Get database schema
router.get('/schema', getDatabaseSchema);

// ChatGPT-like streaming chat endpoint
router.post('/chat', streamChat);

// Get chat session history
router.get('/chat/:sessionId', getChatHistory);

module.exports = router;
