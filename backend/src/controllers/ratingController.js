const pool = require('../config/database');

// Submit a rating for a completed booking
const submitRating = async (req, res) => {
  const { bookingId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id;

  try {
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if booking exists and belongs to user
    const bookingResult = await pool.query(
      'SELECT id, user_id, barber_id, status FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookingResult.rows[0];

    // Check if booking belongs to user
    if (booking.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only rate your own bookings'
      });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'You can only rate completed bookings'
      });
    }

    // Check if rating already exists
    const existingRating = await pool.query(
      'SELECT id FROM ratings WHERE booking_id = $1',
      [bookingId]
    );

    if (existingRating.rows.length > 0) {
      // Update existing rating
      await pool.query(
        'UPDATE ratings SET rating = $1, comment = $2, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $3',
        [rating, comment || null, bookingId]
      );
    } else {
      // Insert new rating
      await pool.query(
        'INSERT INTO ratings (booking_id, user_id, barber_id, rating, comment) VALUES ($1, $2, $3, $4, $5)',
        [bookingId, userId, booking.barber_id, rating, comment || null]
      );
    }

    // Update barber's average rating
    await updateBarberRating(booking.barber_id);

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      data: { rating, comment }
    });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit rating'
    });
  }
};

// Get rating for a specific booking
const getBookingRating = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, rating, comment, created_at FROM ratings WHERE booking_id = $1',
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: { rating: null }
      });
    }

    res.json({
      success: true,
      data: { rating: result.rows[0] }
    });
  } catch (error) {
    console.error('Error fetching rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rating'
    });
  }
};

// Helper function to update barber's average rating
const updateBarberRating = async (barberId) => {
  try {
    const result = await pool.query(
      'SELECT AVG(rating) as avg_rating FROM ratings WHERE barber_id = $1',
      [barberId]
    );

    const avgRating = result.rows[0].avg_rating || 0;

    await pool.query(
      'UPDATE barbers SET rating = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [parseFloat(avgRating).toFixed(2), barberId]
    );
  } catch (error) {
    console.error('Error updating barber rating:', error);
  }
};

module.exports = {
  submitRating,
  getBookingRating
};
