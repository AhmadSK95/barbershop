const cron = require('node-cron');
const pool = require('../src/config/database');
const { sendBookingReminderEmail } = require('../src/utils/emailService');

// Track sent reminders to prevent duplicates
const sentReminders = new Set();

// Format date for display
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

// Format time for display
const formatTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Send 24-hour reminders
const send24HourReminders = async () => {
  try {
    // Check if 24h reminders are enabled
    const settingsResult = await pool.query(
      `SELECT setting_value FROM settings 
       WHERE setting_key IN ('reminders_enabled', 'reminder_24h_enabled', 'reminder_email_enabled')
       AND setting_value = 'true'`
    );
    
    // If any required setting is disabled, skip
    if (settingsResult.rows.length < 3) {
      console.log('⏭️  24h reminders disabled in settings');
      return;
    }

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    // Query bookings for tomorrow that haven't been sent a 24h reminder
    const result = await pool.query(`
      SELECT 
        b.id,
        b.booking_date,
        b.booking_time,
        u.email,
        u.first_name,
        s.name as service_name,
        COALESCE(bu.first_name || ' ' || bu.last_name, 'Any Available') as barber_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN services s ON b.service_id = s.id
      LEFT JOIN barbers br ON b.barber_id = br.id
      LEFT JOIN users bu ON br.user_id = bu.id
      WHERE b.booking_date = $1
        AND b.status IN ('pending', 'confirmed')
        AND b.reminder_24h_sent IS NOT TRUE
      ORDER BY b.booking_time
    `, [tomorrowDate]);

    console.log(`📅 Found ${result.rows.length} bookings for 24h reminders`);

    for (const booking of result.rows) {
      const reminderKey = `24h-${booking.id}`;
      
      // Skip if already sent (in-memory check)
      if (sentReminders.has(reminderKey)) {
        continue;
      }

      try {
        await sendBookingReminderEmail(
          booking.email,
          booking.first_name,
          {
            service: booking.service_name,
            barber: booking.barber_name,
            date: formatDate(booking.booking_date),
            time: formatTime(booking.booking_time)
          },
          24
        );

        // Mark as sent in database
        await pool.query(
          'UPDATE bookings SET reminder_24h_sent = TRUE WHERE id = $1',
          [booking.id]
        );

        // Track in memory
        sentReminders.add(reminderKey);
        
        console.log(`✅ 24h reminder sent for booking #${booking.id} to ${booking.email}`);
      } catch (error) {
        console.error(`❌ Failed to send 24h reminder for booking #${booking.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Error in 24h reminder job:', error);
  }
};

// Send 2-hour reminders
const send2HourReminders = async () => {
  try {
    // Check if 2h reminders are enabled
    const settingsResult = await pool.query(
      `SELECT setting_value FROM settings 
       WHERE setting_key IN ('reminders_enabled', 'reminder_2h_enabled', 'reminder_email_enabled')
       AND setting_value = 'true'`
    );
    
    // If any required setting is disabled, skip
    if (settingsResult.rows.length < 3) {
      console.log('⏭️  2h reminders disabled in settings');
      return;
    }

    // Get current time + 2 hours window (1.5h to 2.5h from now)
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const twoAndHalfHoursLater = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);
    
    const todayDate = now.toISOString().split('T')[0];
    const startTime = twoHoursLater.toTimeString().slice(0, 8);
    const endTime = twoAndHalfHoursLater.toTimeString().slice(0, 8);

    // Query bookings in the next 2-2.5 hours that haven't been sent a 2h reminder
    const result = await pool.query(`
      SELECT 
        b.id,
        b.booking_date,
        b.booking_time,
        u.email,
        u.first_name,
        s.name as service_name,
        COALESCE(bu.first_name || ' ' || bu.last_name, 'Any Available') as barber_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN services s ON b.service_id = s.id
      LEFT JOIN barbers br ON b.barber_id = br.id
      LEFT JOIN users bu ON br.user_id = bu.id
      WHERE b.booking_date = $1
        AND b.booking_time >= $2
        AND b.booking_time <= $3
        AND b.status IN ('pending', 'confirmed')
        AND b.reminder_2h_sent IS NOT TRUE
      ORDER BY b.booking_time
    `, [todayDate, startTime, endTime]);

    console.log(`⏰ Found ${result.rows.length} bookings for 2h reminders`);

    for (const booking of result.rows) {
      const reminderKey = `2h-${booking.id}`;
      
      // Skip if already sent (in-memory check)
      if (sentReminders.has(reminderKey)) {
        continue;
      }

      try {
        await sendBookingReminderEmail(
          booking.email,
          booking.first_name,
          {
            service: booking.service_name,
            barber: booking.barber_name,
            date: formatDate(booking.booking_date),
            time: formatTime(booking.booking_time)
          },
          2
        );

        // Mark as sent in database
        await pool.query(
          'UPDATE bookings SET reminder_2h_sent = TRUE WHERE id = $1',
          [booking.id]
        );

        // Track in memory
        sentReminders.add(reminderKey);
        
        console.log(`✅ 2h reminder sent for booking #${booking.id} to ${booking.email}`);
      } catch (error) {
        console.error(`❌ Failed to send 2h reminder for booking #${booking.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Error in 2h reminder job:', error);
  }
};

// Initialize scheduler
const startReminderScheduler = () => {
  console.log('🔔 Starting reminder scheduler...');

  // Run 24h reminders every day at 10 AM
  cron.schedule('0 10 * * *', () => {
    console.log('⏰ Running 24h reminder job...');
    send24HourReminders();
  });

  // Run 2h reminders every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    console.log('⏰ Running 2h reminder job...');
    send2HourReminders();
  });

  console.log('✅ Reminder scheduler started');
  console.log('   - 24h reminders: Daily at 10:00 AM');
  console.log('   - 2h reminders: Every 15 minutes');
  
  // Run immediately on startup for testing
  setTimeout(() => {
    console.log('🚀 Running initial reminder check...');
    send24HourReminders();
    send2HourReminders();
  }, 5000);
};

module.exports = {
  startReminderScheduler,
  send24HourReminders,
  send2HourReminders
};
