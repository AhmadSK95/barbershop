const pool = require('./src/config/database');
const { sendBarberBookingNotificationSMS } = require('./services/sms');

async function testSMSNotification() {
  try {
    console.log('🧪 Testing SMS notification for booking confirmation...\n');

    // Get a pending booking with barber phone
    const result = await pool.query(`
      SELECT b.id, b.booking_date, b.booking_time, b.total_price, b.status,
             u.first_name as customer_first_name, u.last_name as customer_last_name,
             s.name as service_name,
             bu.phone as barber_phone,
             bu.first_name as barber_first_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN services s ON b.service_id = s.id
      JOIN barbers bar ON b.barber_id = bar.id
      JOIN users bu ON bar.user_id = bu.id
      WHERE b.status = 'pending' AND bu.phone IS NOT NULL
      ORDER BY b.created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ No pending bookings with barber phone found');
      process.exit(1);
    }

    const booking = result.rows[0];
    console.log('📋 Found booking:', {
      id: booking.id,
      customer: `${booking.customer_first_name} ${booking.customer_last_name}`,
      barber: booking.barber_first_name,
      phone: booking.barber_phone,
      date: booking.booking_date,
      time: booking.booking_time,
      status: booking.status
    });

    // Update booking status to confirmed
    await pool.query(
      'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['confirmed', booking.id]
    );
    console.log('\n✅ Updated booking status to: confirmed');

    // Send SMS notification
    const smsDetails = {
      customerName: `${booking.customer_first_name} ${booking.customer_last_name}`,
      service: booking.service_name,
      date: booking.booking_date,
      time: booking.booking_time,
      price: booking.total_price
    };

    console.log('\n📱 Sending SMS to:', booking.barber_phone);
    console.log('Message details:', smsDetails);

    const smsResult = await sendBarberBookingNotificationSMS(booking.barber_phone, smsDetails);
    
    if (smsResult.success) {
      console.log('\n✅ SMS sent successfully!');
      console.log('Message ID:', smsResult.messageId);
    } else if (smsResult.skipped) {
      console.log('\n⚠️  SMS not sent:', smsResult.reason);
    }

    await pool.end();
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testSMSNotification();
