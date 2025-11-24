const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getBookings,
  updateBookingStatus
} = require('../controllers/barberController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and barber role
router.use(protect, authorize('barber'));

// Dashboard overview
router.get('/dashboard', getDashboard);

// Get bookings with filters
router.get('/bookings', getBookings);

// Update booking status
router.put('/bookings/:id/status', updateBookingStatus);

module.exports = router;
