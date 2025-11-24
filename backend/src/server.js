const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Load .env files: root first (defaults), then backend (overrides)
const rootEnvPath = path.join(__dirname, '../../.env');
const backendEnvPath = path.join(__dirname, '../.env');

if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
}
if (fs.existsSync(backendEnvPath)) {
  require('dotenv').config({ path: backendEnvPath, override: true });
}

const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes = require('./routes/userRoutes');
const configRoutes = require('./routes/configRoutes');
const smsRoutes = require('./routes/smsRoutes');
const careersRoutes = require('./routes/careersRoutes');
const barberRoutes = require('./routes/barberRoutes');
const adminAnalyticsRoutes = require('./routes/adminAnalyticsRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost',
      'http://localhost:80',
      'http://localhost:3000',
      'http://localhost:3001', // Allow common dev ports
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // In development, allow localhost with specific ports only (3000-3010)
    if (process.env.NODE_ENV !== 'production') {
      const localhostMatch = origin.match(/^http:\/\/localhost:(\d+)$/);
      if (localhostMatch) {
        const port = parseInt(localhostMatch[1]);
        if (port >= 3000 && port <= 3010) {
          return callback(null, true);
        }
      }
    }
    
    // For production, also allow any origin from the same host as FRONTEND_URL
    const frontendHost = process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).hostname : null;
    if (frontendHost && origin.includes(frontendHost)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
// Request body size limits (prevent DoS)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(morgan('dev')); // Logging

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/config', configRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/careers', careersRoutes);
app.use('/api/barbers', barberRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/ratings', ratingRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5002;

// Initialize reminder scheduler
if (process.env.NODE_ENV !== 'test') {
  const { initializeScheduler } = require('../services/scheduler');
  initializeScheduler();
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
