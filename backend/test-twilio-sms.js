const { sendBarberBookingNotificationSMS } = require('./services/twilio-sms');

async function testTwilioSMS() {
  try {
    console.log('🧪 Testing Twilio SMS...\n');

    const testPhone = '3472957109'; // Barber's phone
    const bookingDetails = {
      customerName: 'Test Customer',
      service: 'Haircut - Master Barber',
      date: '2025-12-01',
      time: '15:30',
      price: '60.00'
    };

    console.log('📱 Sending test SMS to:', testPhone);
    console.log('Message details:', bookingDetails);

    const result = await sendBarberBookingNotificationSMS(testPhone, bookingDetails);
    
    if (result.success) {
      console.log('\n✅ SMS sent successfully via Twilio!');
      console.log('Message ID:', result.messageId);
    } else if (result.skipped) {
      console.log('\n⚠️  SMS not sent:', result.reason);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testTwilioSMS();
