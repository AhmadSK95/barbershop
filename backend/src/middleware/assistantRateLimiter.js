const rateLimit = require('express-rate-limit');

// Stricter rate limiter for assistant queries
// 10 queries per minute per admin user
const assistantLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute
  message: {
    success: false,
    message: 'Too many assistant queries. Please wait a minute before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID as key if available (more accurate than IP)
  keyGenerator: (req) => {
    return req.user?.id ? `user:${req.user.id}` : req.ip;
  }
});

module.exports = {
  assistantLimiter
};
