const express = require('express');
const router = express.Router();
const {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  logout,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { logAuthEvent } = require('../middleware/auditLogger');

// Public routes
router.post('/register', authLimiter, logAuthEvent('user_registered'), register);
router.post('/login', authLimiter, logAuthEvent('user_login'), login);
router.get('/verify-email/:token', logAuthEvent('email_verified'), verifyEmail);
router.post('/forgot-password', passwordResetLimiter, logAuthEvent('password_reset_requested'), forgotPassword);
router.post('/reset-password/:token', logAuthEvent('password_reset'), resetPassword);
router.post('/refresh-token', refreshAccessToken);

// Protected routes
router.post('/logout', protect, logAuthEvent('user_logout'), logout);
router.get('/me', protect, getMe);

module.exports = router;
