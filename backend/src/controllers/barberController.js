const pool = require('../config/database');
const { sendBarberBookingNotificationSMS } = require('../../services/sms');

// Get barber dashboard overview - today's schedule and stats
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get barber ID from user ID
    const barberResult = await pool.query(
      'SELECT id FROM barbers WHERE user_id = $1',
      [userId]
    );
    
    if (barberResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Barber profile not found'
      });
    }
    
    const barberId = barberResult.rows[0].id;
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's bookings
    const todayBookingsResult = await pool.query(`
      SELECT 
        b.id,
        b.booking_date,
        b.booking_time,
        b.total_price,
        b.status,
        b.notes,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        u.email as customer_email,
        u.phone as customer_phone,
        s.name as service_name,
        s.duration as service_duration,
        COALESCE(
          json_agg(
            json_build_object('name', a.name)
            ORDER BY a.name
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'
        ) as addons
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN services s ON b.service_id = s.id
      LEFT JOIN booking_addons ba ON b.id = ba.booking_id
      LEFT JOIN addons a ON ba.addon_id = a.id
      WHERE b.barber_id = $1
        AND b.booking_date = $2
        AND b.status != 'cancelled'
      GROUP BY b.id, u.first_name, u.last_name, u.email, u.phone, s.name, s.duration
      ORDER BY b.booking_time
    `, [barberId, today]);
    
    // Get upcoming bookings (next 7 days)
    const upcomingResult = await pool.query(`
      SELECT 
        b.id,
        b.booking_date,
        b.booking_time,
        b.total_price,
        b.status,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        s.name as service_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN services s ON b.service_id = s.id
      WHERE b.barber_id = $1
        AND b.booking_date > $2
        AND b.booking_date <= $3
        AND b.status IN ('pending', 'confirmed')
      ORDER BY b.booking_date, b.booking_time
      LIMIT 20
    `, [barberId, today, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]);
    
    // Calculate today's stats
    const todayRevenue = todayBookingsResult.rows
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + parseFloat(b.total_price), 0);
    
    const todayCount = todayBookingsResult.rows.length;
    const completedCount = todayBookingsResult.rows.filter(b => b.status === 'completed').length;
    
    res.json({
      success: true,
      data: {
        today: {
          bookings: todayBookingsResult.rows,
          stats: {
            total: todayCount,
            completed: completedCount,
            pending: todayBookingsResult.rows.filter(b => b.status === 'pending').length,
            confirmed: todayBookingsResult.rows.filter(b => b.status === 'confirmed').length,
            revenue: todayRevenue
          }
        },
        upcoming: upcomingResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching barber dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard'
    });
  }
};

// Get barber bookings with filters
const getBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, status } = req.query;
    
    // Get barber ID from user ID
    const barberResult = await pool.query(
      'SELECT id FROM barbers WHERE user_id = $1',
      [userId]
    );
    
    if (barberResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Barber profile not found'
      });
    }
    
    const barberId = barberResult.rows[0].id;
    
    // Build query with filters
    let query = `
      SELECT 
        b.id,
        b.booking_date,
        b.booking_time,
        b.total_price,
        b.status,
        b.notes,
        b.created_at,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        u.email as customer_email,
        u.phone as customer_phone,
        s.name as service_name,
        s.duration as service_duration
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN services s ON b.service_id = s.id
      WHERE b.barber_id = $1
    `;
    
    const params = [barberId];
    let paramIndex = 2;
    
    if (startDate) {
      query += ` AND b.booking_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND b.booking_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ' ORDER BY b.booking_date DESC, b.booking_time DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: { bookings: result.rows }
    });
  } catch (error) {
    console.error('Error fetching barber bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load bookings'
    });
  }
};

// Update booking status (barber can mark as completed/cancelled)
const updateBookingStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Validate status
    const allowedStatuses = ['confirmed', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed: confirmed, completed, cancelled'
      });
    }
    
    // Get barber ID
    const barberResult = await pool.query(
      'SELECT id FROM barbers WHERE user_id = $1',
      [userId]
    );
    
    if (barberResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Barber profile not found'
      });
    }
    
    const barberId = barberResult.rows[0].id;
    
    // Verify booking belongs to this barber
    const bookingCheck = await pool.query(
      'SELECT id FROM bookings WHERE id = $1 AND barber_id = $2',
      [id, barberId]
    );
    
    if (bookingCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own bookings'
      });
    }
    
    // Update booking
    const updateFields = ['status = $1'];
    const params = [status];
    let paramIndex = 2;
    
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      params.push(notes);
      paramIndex++;
    }
    
    params.push(id);
    
    await pool.query(
      `UPDATE bookings SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
      params
    );
    
    // Send SMS notification to barber if status is confirmed
    if (status === 'confirmed') {
      try {
        // Get booking details, customer info, and barber phone
        const bookingDetails = await pool.query(
          `SELECT b.booking_date, b.booking_time, b.total_price,
                  u.first_name as customer_first_name, u.last_name as customer_last_name,
                  s.name as service_name,
                  bu.phone as barber_phone
           FROM bookings b
           JOIN users u ON b.user_id = u.id
           LEFT JOIN services s ON b.service_id = s.id
           JOIN barbers bar ON b.barber_id = bar.id
           JOIN users bu ON bar.user_id = bu.id
           WHERE b.id = $1`,
          [id]
        );
        
        if (bookingDetails.rows.length > 0) {
          const booking = bookingDetails.rows[0];
          const barberPhone = booking.barber_phone;
          
          if (barberPhone) {
            const smsDetails = {
              customerName: `${booking.customer_first_name} ${booking.customer_last_name}`,
              service: booking.service_name,
              date: booking.booking_date,
              time: booking.booking_time,
              price: booking.total_price
            };
            
            await sendBarberBookingNotificationSMS(barberPhone, smsDetails);
            console.log(`📱 SMS sent to barber at ${barberPhone}`);
          } else {
            console.log('⚠️  Barber has no phone number configured');
          }
        }
      } catch (smsError) {
        console.error('Failed to send SMS to barber:', smsError);
        // Don't fail the booking status update if SMS fails
      }
    }
    
    res.json({
      success: true,
      message: 'Booking status updated successfully'
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status'
    });
  }
};

module.exports = {
  getDashboard,
  getBookings,
  updateBookingStatus
};
