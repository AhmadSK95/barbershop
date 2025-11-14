const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getAllBookings,
  updateBookingStatus,
  cancelBooking,
  getAvailableSlots,
  getAvailableBarbers,
  getAllBarbers,
  getBarberServices
} = require('../controllers/bookingController');
const { protect, adminOnly, verifiedOnly } = require('../middleware/auth');

// Public routes
router.get('/available-slots', getAvailableSlots);
router.get('/available-barbers', getAvailableBarbers);
router.get('/barbers', getAllBarbers);
router.get('/barber-services/:barberId', getBarberServices);

// Protected routes
router.post('/', protect, createBooking);
router.get('/', protect, getMyBookings);
router.put('/:id/cancel', protect, cancelBooking);

// Admin routes
router.get('/all', protect, adminOnly, getAllBookings);
router.put('/:id/status', protect, adminOnly, updateBookingStatus);

module.exports = router;
