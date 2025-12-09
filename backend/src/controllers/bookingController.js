const pool = require('../config/database');
// Use configured email service (AWS SES or SMTP/Gmail)
const { sendBookingConfirmationEmail } = require('../utils/emailService');
const { sendBookingConfirmationSMS, sendBookingCancellationSMS, sendBarberBookingNotificationSMS } = require('../../services/sns-sms');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
  const client = await pool.connect();
  try {
    let { serviceIds, barberId, bookingDate, bookingTime, notes, customerFirstName, customerLastName, customerEmail, customerPhone, stripeCustomerId, stripePaymentMethodId, cardBrand, cardLast4 } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('📋 Booking Request:', JSON.stringify({ serviceIds, barberId, bookingDate, bookingTime, customerEmail }, null, 2));
    
    // Determine if this is an admin/barber booking for a customer
    const isAdminOrBarberBooking = (userRole === 'admin' || userRole === 'barber') && customerEmail;
    
    // Use customer information if provided by admin/barber, otherwise use logged-in user
    const customerInfo = isAdminOrBarberBooking ? {
      firstName: customerFirstName,
      lastName: customerLastName,
      email: customerEmail,
      phone: customerPhone || null
    } : {
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.contactEmail || req.user.email,
      phone: req.user.phone
    };

    if (!serviceIds || serviceIds.length === 0 || !bookingDate || !bookingTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide services, date, and time'
      });
    }

    await client.query('BEGIN');

    // If no barber specified (Any Available), assign a random available barber
    if (!barberId || barberId === null || barberId === 'null') {
      const availableBarbers = await client.query(
        `SELECT b.id FROM barbers b
         WHERE b.is_available = true
         AND b.user_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM bookings bk
           WHERE bk.barber_id = b.id
           AND bk.booking_date = $1
           AND bk.booking_time = $2
           AND bk.status != 'cancelled'
         )
         ORDER BY RANDOM()
         LIMIT 1`,
        [bookingDate, bookingTime]
      );

      if (availableBarbers.rows.length > 0) {
        barberId = availableBarbers.rows[0].id;
        console.log(`✅ Auto-assigned barber ID ${barberId} for "Any Available" booking`);
      } else {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'No barbers available for the selected time slot'
        });
      }
    }

    // Get services prices
    const serviceResult = await client.query(
      'SELECT id, price, name FROM services WHERE id = ANY($1) AND is_active = true',
      [serviceIds]
    );

    if (serviceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Services not found'
      });
    }

    let totalPrice = 0;
    const serviceNames = [];
    serviceResult.rows.forEach(service => {
      totalPrice += parseFloat(service.price);
      serviceNames.push(service.name);
    });
    const servicesString = serviceNames.join(', ');

    // Check if time slot is available
    const conflictCheck = await client.query(
      'SELECT id FROM bookings WHERE barber_id = $1 AND booking_date = $2 AND booking_time = $3 AND status != $4',
      [barberId, bookingDate, bookingTime, 'cancelled']
    );

    if (conflictCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked'
      });
    }

    // Create booking (auto-confirmed) with optional Stripe payment info
    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, service_id, barber_id, booking_date, booking_time, total_price, notes, status, stripe_customer_id, stripe_payment_method_id, card_brand, card_last_4, payment_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [userId, serviceIds[0], barberId, bookingDate, bookingTime, totalPrice, notes, 'confirmed', stripeCustomerId || null, stripePaymentMethodId || null, cardBrand || null, cardLast4 || null, stripePaymentMethodId ? true : false]
    );

    const bookingId = bookingResult.rows[0].id;

    // Add additional services to booking_services table (if you have one)
    // Or store in notes for now

    await client.query('COMMIT');

    // Get assigned barber details including phone and contact email
    const barberResult = await client.query(
      'SELECT b.id, u.first_name, u.last_name, u.phone, u.contact_email, b.specialty FROM barbers b JOIN users u ON b.user_id = u.id WHERE b.id = $1',
      [barberId]
    );
    const assignedBarber = barberResult.rows[0];
    const barberName = assignedBarber
      ? `${assignedBarber.first_name} ${assignedBarber.last_name}`
      : 'Any Available';
    const barberPhone = assignedBarber?.phone;
    const barberEmail = assignedBarber?.contact_email || assignedBarber?.email;

    // Send confirmation email and SMS
    try {
      
      console.log(`👨‍💼 Barber for email - ID: ${barberId}, Name: ${barberName}`);

      const bookingDetails = {
        service: servicesString,
        barber: barberName,
        date: bookingDate,
        time: bookingTime,
        price: totalPrice.toFixed(2)
      };

      // Send email to customer (use customerInfo which works for both regular and admin/barber bookings)
      console.log(`📧 Sending confirmation to: ${customerInfo.email} (${customerInfo.firstName} ${customerInfo.lastName})`);
      await sendBookingConfirmationEmail(customerInfo.email, customerInfo.firstName, bookingDetails);
      
      // Send SMS to customer if phone number exists
      if (customerInfo.phone) {
        const smsDetails = {
          customerName: `${customerInfo.firstName} ${customerInfo.lastName || ''}`.trim(),
          date: bookingDetails.date,
          time: bookingDetails.time,
          barber: bookingDetails.barber
        };
        await sendBookingConfirmationSMS(customerInfo.phone, smsDetails).catch(err => {
          console.error('SMS notification failed (non-blocking):', err.message);
        });
      }
      
      // Send email to barber (if contact_email is set)
      if (barberEmail) {
        try {
          await sendBookingConfirmationEmail(barberEmail, assignedBarber.first_name, bookingDetails);
          console.log(`📧 Email sent to barber at ${barberEmail}`);
        } catch (emailError) {
          console.error('Failed to send email to barber:', emailError);
        }
      }
      
      // Send SMS to barber
      if (barberPhone) {
        const barberSMSDetails = {
          customerName: `${customerInfo.firstName} ${customerInfo.lastName || ''}`.trim(),
          service: servicesString,
          date: bookingDate,
          time: bookingTime,
          price: totalPrice.toFixed(2)
        };
        await sendBarberBookingNotificationSMS(barberPhone, barberSMSDetails).catch(err => {
          console.error('Barber SMS notification failed (non-blocking):', err.message);
        });
      }
    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError);
      // Don't fail the booking if notifications fail
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        bookingId,
        assignedBarber: assignedBarber ? {
          id: assignedBarber.id,
          firstName: assignedBarber.first_name,
          lastName: assignedBarber.last_name,
          name: `${assignedBarber.first_name} ${assignedBarber.last_name}`,
          specialty: assignedBarber.specialty
        } : null
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating booking'
    });
  } finally {
    client.release();
  }
};

// @desc    Get user's bookings
// @route   GET /api/bookings
// @access  Private
const getMyBookings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.booking_date, b.booking_time, b.total_price, b.status, b.notes,
              b.payment_verified, b.payment_status, b.card_brand, b.card_last_4,
              b.stripe_customer_id, b.stripe_payment_method_id,
              s.name as service_name, s.duration,
              bar.id as barber_id,
              COALESCE(u.first_name, 'Any Available') as barber_first_name, 
              u.last_name as barber_last_name,
              bar.specialty as barber_specialty
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       LEFT JOIN barbers bar ON b.barber_id = bar.id
       LEFT JOIN users u ON bar.user_id = u.id
       WHERE b.user_id = $1
       ORDER BY b.booking_date DESC, b.booking_time DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        bookings: result.rows
      }
    });
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching bookings'
    });
  }
};

// @desc    Get all bookings (Admin)
// @route   GET /api/bookings/all
// @access  Private/Admin
const getAllBookings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.booking_date, b.booking_time, b.total_price, b.status, b.notes, b.created_at,
              b.stripe_customer_id, b.stripe_payment_method_id, b.card_brand, b.card_last_4,
              b.payment_status, b.payment_amount, b.payment_verified, b.stripe_charge_id,
              s.name as service_name,
              u1.first_name as customer_first_name, u1.last_name as customer_last_name, u1.email as customer_email,
              u2.first_name as barber_first_name, u2.last_name as barber_last_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u1 ON b.user_id = u1.id
       LEFT JOIN barbers bar ON b.barber_id = bar.id
       LEFT JOIN users u2 ON bar.user_id = u2.id
       ORDER BY b.booking_date DESC, b.booking_time DESC`
    );

    res.json({
      success: true,
      data: {
        bookings: result.rows
      }
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching bookings'
    });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private/Admin
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const result = await pool.query(
      'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      message: 'Booking status updated successfully'
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating booking status'
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Only allow user to cancel their own bookings, unless admin
    const query = isAdmin
      ? 'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id'
      : 'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING id';
    
    const params = isAdmin ? ['cancelled', id] : ['cancelled', id, userId];

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or you do not have permission to cancel it'
      });
    }

    // Send cancellation notifications
    try {
      const bookingDetails = await pool.query(
        `SELECT b.booking_date, b.booking_time, u.email, u.first_name, u.phone_number,
                u2.first_name as barber_first_name, u2.last_name as barber_last_name
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         LEFT JOIN barbers bar ON b.barber_id = bar.id
         LEFT JOIN users u2 ON bar.user_id = u2.id
         WHERE b.id = $1`,
        [id]
      );

      if (bookingDetails.rows.length > 0) {
        const details = bookingDetails.rows[0];
        const barberName = details.barber_first_name 
          ? `${details.barber_first_name} ${details.barber_last_name}`
          : 'Any Available';

        const cancelDetails = {
          customerName: details.first_name,
          date: details.booking_date,
          time: details.booking_time,
          barberName: barberName
        };

        // Send SMS if phone exists (non-blocking)
        if (details.phone_number) {
          await sendBookingCancellationSMS(details.phone_number, cancelDetails).catch(err => {
            console.error('Cancellation SMS failed (non-blocking):', err.message);
          });
        }
      }
    } catch (notificationError) {
      console.error('Failed to send cancellation notifications:', notificationError);
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cancelling booking'
    });
  }
};

// @desc    Get all barbers
// @route   GET /api/bookings/barbers
// @access  Public
const getAllBarbers = async (req, res) => {
  try {
    // Get all active barbers including "Any Available"
    const result = await pool.query(
      `SELECT b.id, u.first_name, u.last_name, b.specialty, b.rating
       FROM barbers b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.is_available = true
       ORDER BY 
         CASE WHEN b.user_id IS NULL THEN 0 ELSE 1 END,
         b.rating DESC NULLS LAST`
    );

    res.json({
      success: true,
      data: {
        barbers: result.rows
      }
    });
  } catch (error) {
    console.error('Get all barbers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching barbers'
    });
  }
};

// @desc    Get available barbers for date/time
// @route   GET /api/bookings/available-barbers
// @access  Public
const getAvailableBarbers = async (req, res) => {
  try {
    const { date, time } = req.query;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Please provide date and time'
      });
    }

    // Get all barbers that are NOT booked for this date/time
    const result = await pool.query(
      `SELECT b.id, u.first_name, u.last_name, b.specialty, b.rating
       FROM barbers b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.is_available = true
       AND (b.user_id IS NULL OR b.id NOT IN (
         SELECT barber_id FROM bookings
         WHERE booking_date = $1 
         AND booking_time = $2 
         AND status != 'cancelled'
         AND barber_id IS NOT NULL
       ))
       ORDER BY 
         CASE WHEN b.user_id IS NULL THEN 0 ELSE 1 END,
         b.rating DESC NULLS LAST`,
      [date, time]
    );

    res.json({
      success: true,
      data: {
        barbers: result.rows
      }
    });
  } catch (error) {
    console.error('Get available barbers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching available barbers'
    });
  }
};

// @desc    Get services by barber
// @route   GET /api/bookings/barber-services/:barberId
// @access  Public
const getBarberServices = async (req, res) => {
  try {
    const { barberId } = req.params;

    // If barberId is null or 'null' (Any Available), return all services
    if (!barberId || barberId === 'null') {
      const result = await pool.query(
        `SELECT id, name, description, price, duration
         FROM services
         WHERE is_active = true
         ORDER BY price DESC`
      );
      return res.json({
        success: true,
        data: {
          services: result.rows
        }
      });
    }

    // Get services for specific barber
    const result = await pool.query(
      `SELECT s.id, s.name, s.description, s.price, s.duration
       FROM services s
       JOIN barber_services bs ON s.id = bs.service_id
       WHERE bs.barber_id = $1 AND s.is_active = true
       ORDER BY s.price DESC`,
      [barberId]
    );

    res.json({
      success: true,
      data: {
        services: result.rows
      }
    });
  } catch (error) {
    console.error('Get barber services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching barber services'
    });
  }
};

// @desc    Get available time slots
// @route   GET /api/bookings/available-slots
// @access  Public
const getAvailableSlots = async (req, res) => {
  try {
    const { date, barberId } = req.query;

    if (!date || !barberId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide date and barber ID'
      });
    }

    // Get all bookings for the date and barber
    const result = await pool.query(
      'SELECT booking_time FROM bookings WHERE booking_date = $1 AND barber_id = $2 AND status != $3',
      [date, barberId, 'cancelled']
    );

    const bookedSlots = result.rows.map(row => row.booking_time);

    // Generate all possible time slots (9 AM to 7 PM)
    const allSlots = [];
    for (let hour = 9; hour < 19; hour++) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:00:00`);
      allSlots.push(`${hour.toString().padStart(2, '0')}:30:00`);
    }

    // Filter out booked slots
    const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

    res.json({
      success: true,
      data: {
        availableSlots
      }
    });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching available slots'
    });
  }
};

// @desc    Preview assigned barber for Any Available option
// @route   GET /api/bookings/preview-barber
// @access  Public
const previewAssignedBarber = async (req, res) => {
  try {
    const { date, time } = req.query;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Please provide date and time'
      });
    }

    // Get a random available barber (same logic as booking creation)
    const result = await pool.query(
      `SELECT b.id, u.first_name, u.last_name, b.specialty, b.rating
       FROM barbers b
       JOIN users u ON b.user_id = u.id
       WHERE b.is_available = true
       AND b.user_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM bookings bk
         WHERE bk.barber_id = b.id
         AND bk.booking_date = $1
         AND bk.booking_time = $2
         AND bk.status != 'cancelled'
       )
       ORDER BY RANDOM()
       LIMIT 1`,
      [date, time]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No barbers available for the selected time slot'
      });
    }

    const barber = result.rows[0];
    res.json({
      success: true,
      data: {
        barber: {
          id: barber.id,
          firstName: barber.first_name,
          lastName: barber.last_name,
          name: `${barber.first_name} ${barber.last_name}`,
          specialty: barber.specialty,
          rating: barber.rating
        }
      }
    });
  } catch (error) {
    console.error('Preview barber error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error previewing barber assignment'
    });
  }
};

module.exports = {
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
};
