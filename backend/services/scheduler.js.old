const cron = require('node-cron');
const pool = require('../src/config/database');
const { sendBookingReminderEmail } = require('./email');
const { sendBookingReminderSMS } = require('./sms');

// Get settings from database
const getSettings = async () => {
  try {
    const result = await pool.query(`
      SELECT setting_key, setting_value
      FROM settings
      WHERE setting_key IN (
        'reminders_enabled',
        'reminder_24h_enabled',
        'reminder_2h_enabled',
        'reminder_email_enabled',
        'reminder_sms_enabled'
      )
    `);
    
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value === 'true';
    });
    
    return settings;
  } catch (error) {
    console.error('Error fetching reminder settings:', error);
    // Default to safe settings
    return {
      reminders_enabled: true,
      reminder_24h_enabled: true,
      reminder_2h_enabled: false,
      reminder_email_enabled: true,
      reminder_sms_enabled: false
    };
  }
};

// Send 24-hour reminders
const send24HourReminders = async () => {
  try {
    const settings = await getSettings();
    
    if (!settings.reminders_enabled || !settings.reminder_24h_enabled) {
      return;
    }
    
    // Find bookings 24 hours from now that haven't received reminder
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0];
    
    const bookingsResult = await pool.query(`
      SELECT 
        b.id,
        b.booking_date,
        b.booking_time,
        b.total_price,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        s.name as service_name,
        barber_user.first_name as barber_first_name,
        barber_user.last_name as barber_last_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN services s ON b.service_id = s.id
      LEFT JOIN barbers barber ON b.barber_id = barber.id
      LEFT JOIN users barber_user ON barber.user_id = barber_user.id
      WHERE b.booking_date = $1
        AND b.status IN ('pending', 'confirmed')
        AND b.reminder_24h_sent = false
      ORDER BY b.booking_time
    `, [tomorrowDateStr]);
    
    let sentCount = 0;
    let errorCount = 0;
    
    for (const booking of bookingsResult.rows) {
      try {
        const barberName = booking.barber_first_name 
          ? `${booking.barber_first_name} ${booking.barber_last_name || ''}`
          : 'Any Available Barber';
        
        const bookingDetails = {
          customerName: booking.first_name,
          date: new Date(booking.booking_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          time: booking.booking_time.substring(0, 5),
          barberName,
          services: booking.service_name || 'Service',
          totalPrice: booking.total_price
        };
        
        // Send email reminder
        if (settings.reminder_email_enabled && booking.email) {
          await sendBookingReminderEmail(booking.email, bookingDetails);
        }
        
        // Send SMS reminder
        if (settings.reminder_sms_enabled && booking.phone) {
          await sendBookingReminderSMS(booking.phone, bookingDetails);
        }
        
        // Mark reminder as sent
        await pool.query(
          'UPDATE bookings SET reminder_24h_sent = true WHERE id = $1',
          [booking.id]
        );
        
        sentCount++;
      } catch (error) {
        console.error(`Error sending 24h reminder for booking ${booking.id}:`, error);
        errorCount++;
      }
    }
    
    if (sentCount > 0 || errorCount > 0) {
      console.log(`✅ 24-hour reminders: ${sentCount} sent, ${errorCount} errors`);
    }
  } catch (error) {
    console.error('Error in 24-hour reminder job:', error);
  }
};

// Send 2-hour reminders
const send2HourReminders = async () => {
  try {
    const settings = await getSettings();
    
    if (!settings.reminders_enabled || !settings.reminder_2h_enabled) {
      return;
    }
    
    // Find bookings 2 hours from now
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const todayDateStr = now.toISOString().split('T')[0];
    
    const bookingsResult = await pool.query(`
      SELECT 
        b.id,
        b.booking_date,
        b.booking_time,
        b.total_price,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        s.name as service_name,
        barber_user.first_name as barber_first_name,
        barber_user.last_name as barber_last_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN services s ON b.service_id = s.id
      LEFT JOIN barbers barber ON b.barber_id = barber.id
      LEFT JOIN users barber_user ON barber.user_id = barber_user.id
      WHERE b.booking_date = $1
        AND b.status IN ('pending', 'confirmed')
        AND b.reminder_2h_sent = false
        AND b.booking_time BETWEEN $2 AND $3
    `, [
      todayDateStr,
      twoHoursLater.toTimeString().substring(0, 8),
      new Date(twoHoursLater.getTime() + 15 * 60 * 1000).toTimeString().substring(0, 8)
    ]);
    
    let sentCount = 0;
    let errorCount = 0;
    
    for (const booking of bookingsResult.rows) {
      try {
        const barberName = booking.barber_first_name 
          ? `${booking.barber_first_name} ${booking.barber_last_name || ''}`
          : 'Any Available Barber';
        
        const bookingDetails = {
          customerName: booking.first_name,
          date: 'Today',
          time: booking.booking_time.substring(0, 5),
          barberName,
          services: booking.service_name || 'Service',
          totalPrice: booking.total_price
        };
        
        // Send email reminder
        if (settings.reminder_email_enabled && booking.email) {
          await sendBookingReminderEmail(booking.email, bookingDetails);
        }
        
        // Send SMS reminder
        if (settings.reminder_sms_enabled && booking.phone) {
          await sendBookingReminderSMS(booking.phone, bookingDetails);
        }
        
        // Mark reminder as sent
        await pool.query(
          'UPDATE bookings SET reminder_2h_sent = true WHERE id = $1',
          [booking.id]
        );
        
        sentCount++;
      } catch (error) {
        console.error(`Error sending 2h reminder for booking ${booking.id}:`, error);
        errorCount++;
      }
    }
    
    if (sentCount > 0 || errorCount > 0) {
      console.log(`✅ 2-hour reminders: ${sentCount} sent, ${errorCount} errors`);
    }
  } catch (error) {
    console.error('Error in 2-hour reminder job:', error);
  }
};

// Initialize scheduler
const initializeScheduler = () => {
  console.log('📅 Initializing reminder scheduler...');
  
  // Run 24-hour reminders every hour at :05 minutes
  cron.schedule('5 * * * *', () => {
    console.log('🔔 Running 24-hour reminder check...');
    send24HourReminders();
  });
  
  // Run 2-hour reminders every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    send2HourReminders();
  });
  
  console.log('✅ Reminder scheduler initialized');
  console.log('   • 24-hour reminders: Every hour at :05');
  console.log('   • 2-hour reminders: Every 15 minutes');
};

module.exports = {
  initializeScheduler,
  send24HourReminders,
  send2HourReminders
};
