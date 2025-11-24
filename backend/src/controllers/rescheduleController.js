const pool = require('../config/database');
const { sendEmail } = require('../../services/email');
const { sendSMS } = require('../../services/sms');

// Reschedule a booking
const rescheduleBooking = async (req, res) => {
  const { id } = req.params;
  const { newDate, newTime } = req.body;
  const userId = req.user.id;

  try {
    // Validate required fields
    if (!newDate || !newTime) {
      return res.status(400).json({
        success: false,
        message: 'New date and time are required'
      });
    }

    // Get reschedule policy window from settings
    const policyResult = await pool.query(
      "SELECT setting_value FROM settings WHERE setting_key = 'reschedule_window_hours'"
    );
    const windowHours = parseInt(policyResult.rows[0]?.setting_value || 2);

    // Get the booking
    const bookingResult = await pool.query(
      `SELECT b.*, u.email as customer_email, u.first_name, u.phone as customer_phone,
              barber_user.email as barber_email, barber_user.first_name as barber_first_name,
              s.name as service_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN barbers barber ON b.barber_id = barber.id
       LEFT JOIN users barber_user ON barber.user_id = barber_user.id
       LEFT JOIN services s ON b.service_id = s.id
       WHERE b.id = $1`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookingResult.rows[0];

    // Check if user owns this booking
    if (booking.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only reschedule your own bookings'
      });
    }

    // Check if booking can be rescheduled
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reschedule a cancelled booking'
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reschedule a completed booking'
      });
    }

    // Check if within policy window
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);

    if (hoursUntilBooking < windowHours) {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule within ${windowHours} hours of the appointment`
      });
    }

    // Validate new date is in the future
    const newDateTime = new Date(`${newDate}T${newTime}`);
    if (newDateTime <= now) {
      return res.status(400).json({
        success: false,
        message: 'New appointment time must be in the future'
      });
    }

    // Check if new slot is available (if barber is specified)
    if (booking.barber_id) {
      const conflictCheck = await pool.query(
        `SELECT id FROM bookings 
         WHERE barber_id = $1 
         AND booking_date = $2 
         AND booking_time = $3 
         AND status != 'cancelled'
         AND id != $4`,
        [booking.barber_id, newDate, newTime, id]
      );

      if (conflictCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'This time slot is no longer available with the selected barber'
        });
      }
    }

    // Update the booking
    await pool.query(
      `UPDATE bookings 
       SET booking_date = $1, 
           booking_time = $2, 
           status = 'pending',
           reminder_24h_sent = false,
           reminder_2h_sent = false,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newDate, newTime, id]
    );

    // Send notification emails
    try {
      // Email to customer
      const customerEmailBody = `
        <h2>Booking Rescheduled</h2>
        <p>Hi ${booking.first_name},</p>
        <p>Your booking has been successfully rescheduled.</p>
        <p><strong>Original:</strong> ${new Date(booking.booking_date).toLocaleDateString()} at ${booking.booking_time}</p>
        <p><strong>New Time:</strong> ${new Date(newDate).toLocaleDateString()} at ${newTime}</p>
        <p><strong>Service:</strong> ${booking.service_name}</p>
        <p><strong>Barber:</strong> ${booking.barber_first_name || 'Any Available'}</p>
        <p>We look forward to seeing you!</p>
      `;

      await sendEmail(
        booking.customer_email,
        'Booking Rescheduled - Balkan Barber',
        customerEmailBody
      );

      // Email to barber if assigned
      if (booking.barber_email) {
        const barberEmailBody = `
          <h2>Booking Rescheduled</h2>
          <p>Hi ${booking.barber_first_name},</p>
          <p>A booking has been rescheduled:</p>
          <p><strong>Customer:</strong> ${booking.first_name}</p>
          <p><strong>Original:</strong> ${new Date(booking.booking_date).toLocaleDateString()} at ${booking.booking_time}</p>
          <p><strong>New Time:</strong> ${new Date(newDate).toLocaleDateString()} at ${newTime}</p>
          <p><strong>Service:</strong> ${booking.service_name}</p>
        `;

        await sendEmail(
          booking.barber_email,
          'Booking Rescheduled Notification',
          barberEmailBody
        );
      }

      // Optional SMS notification
      if (booking.customer_phone) {
        const smsMessage = `Your booking at Balkan Barber has been rescheduled to ${new Date(newDate).toLocaleDateString()} at ${newTime}. See you then!`;
        await sendSMS(booking.customer_phone, smsMessage).catch(err => {
          console.error('SMS notification failed:', err);
        });
      }
    } catch (emailError) {
      console.error('Notification error:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Booking rescheduled successfully',
      data: {
        bookingId: id,
        newDate,
        newTime
      }
    });
  } catch (error) {
    console.error('Error rescheduling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule booking'
    });
  }
};

// Get available time slots for rescheduling
const getAvailableSlots = async (req, res) => {
  const { date, barberId } = req.query;

  try {
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    // Get business hours from settings
    const settingsResult = await pool.query(
      `SELECT setting_key, setting_value FROM settings 
       WHERE setting_key IN ('business_hours_start', 'business_hours_end', 'booking_slot_duration')`
    );

    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    const startHour = parseInt(settings.business_hours_start?.split(':')[0] || 10);
    const endHour = parseInt(settings.business_hours_end?.split(':')[0] || 19);
    const slotDuration = parseInt(settings.booking_slot_duration || 30);

    // Generate all possible time slots
    const slots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
        slots.push(timeStr);
      }
    }

    // Get booked slots for the date (and barber if specified)
    let bookedQuery = `
      SELECT booking_time 
      FROM bookings 
      WHERE booking_date = $1 
      AND status != 'cancelled'
    `;
    const params = [date];

    if (barberId) {
      bookedQuery += ' AND barber_id = $2';
      params.push(barberId);
    }

    const bookedResult = await pool.query(bookedQuery, params);
    const bookedTimes = new Set(bookedResult.rows.map(row => row.booking_time.substring(0, 8)));

    // Filter out booked slots and past times
    const now = new Date();
    const selectedDate = new Date(date);
    const isToday = selectedDate.toDateString() === now.toDateString();

    const availableSlots = slots.filter(slot => {
      // Remove booked slots
      if (bookedTimes.has(slot)) return false;

      // Remove past slots if today
      if (isToday) {
        const [hour, minute] = slot.split(':').map(Number);
        const slotTime = new Date();
        slotTime.setHours(hour, minute, 0, 0);
        if (slotTime <= now) return false;
      }

      return true;
    });

    res.json({
      success: true,
      data: {
        date,
        availableSlots: availableSlots.map(slot => slot.substring(0, 5)) // HH:MM format
      }
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available slots'
    });
  }
};

module.exports = {
  rescheduleBooking,
  getAvailableSlots
};
