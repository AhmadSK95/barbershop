const express = require('express');
const { rescheduleBooking, getAvailableSlots: getAvailableSlotsForReschedule } = require('../controllers/rescheduleController');
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
  getBarberServices,
  previewAssignedBarber
} = require('../controllers/bookingController');
const { protect, adminOnly, verifiedOnly } = require('../middleware/auth');

// Public routes
router.get('/available-slots', getAvailableSlots);
router.get('/available-barbers', getAvailableBarbers);
router.get('/barbers', getAllBarbers);
router.get('/barber-services/:barberId', getBarberServices);
router.get('/preview-barber', previewAssignedBarber);

// Protected routes
router.post('/', protect, createBooking);
router.get('/', protect, getMyBookings);
router.put('/:id/cancel', protect, cancelBooking);

// Reschedule routes
router.post('/:id/reschedule', protect, rescheduleBooking);
router.get('/reschedule/available-slots', getAvailableSlotsForReschedule);

// Admin routes
router.get('/all', protect, adminOnly, getAllBookings);
router.put('/:id/status', protect, adminOnly, updateBookingStatus);

module.exports = router;
