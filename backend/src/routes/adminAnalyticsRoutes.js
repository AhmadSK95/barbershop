const express = require('express');
const router = express.Router();
const {
  exportBookingsCSV,
  getRevenueAnalytics,
  getBarberPerformance,
  getServiceAnalytics
} = require('../controllers/adminAnalyticsController');
const { protect, adminOnly } = require('../middleware/auth');

// All routes require admin access
router.use(protect, adminOnly);

// Export bookings to CSV
router.get('/bookings/export', exportBookingsCSV);

// Revenue analytics
router.get('/revenue', getRevenueAnalytics);

// Barber performance
router.get('/barbers', getBarberPerformance);

// Service analytics
router.get('/services', getServiceAnalytics);

module.exports = router;
