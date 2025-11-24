const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { submitRating, getBookingRating } = require('../controllers/ratingController');

// Submit rating (requires authentication)
router.post('/:bookingId', protect, submitRating);

// Get rating for a booking (requires authentication)
router.get('/:bookingId', protect, getBookingRating);

module.exports = router;
