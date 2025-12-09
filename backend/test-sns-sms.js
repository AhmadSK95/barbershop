require('dotenv').config();
const { sendBarberBookingNotificationSMS, snsEnabled } = require('./services/sns-sms');

async function testSNS() {
  console.log('🧪 Testing AWS SNS SMS...\n');
  
  console.log('Configuration Status:');
  console.log('  AWS_REGION:', process.env.AWS_REGION || '❌ Not set');
  console.log('  AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set');
  console.log('  AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set');
  console.log('  AWS_SNS_SENDER_ID:', process.env.AWS_SNS_SENDER_ID || '❌ Not set (will use "Barbershop")');
  console.log('  SNS Enabled:', snsEnabled ? '✅ Yes' : '❌ No\n');
  
  if (!snsEnabled) {
    console.log('\n⚠️  AWS SNS is not configured. SMS notifications will be skipped.');
    console.log('This is expected behavior - the app will work without SMS.');
    process.exit(0);
  }
  
  // Test phone number (replace with yours for actual testing)
  const testPhone = process.env.TEST_PHONE || '3472957109';
  
  const bookingDetails = {
    customerName: 'Test Customer',
    service: 'Haircut - Master Barber',
    date: '2025-12-15',
    time: '15:30',
    price: '60.00'
  };
  
  console.log('\n📱 Attempting to send test SMS to:', testPhone);
  console.log('Message details:', bookingDetails);
  
  try {
    const result = await sendBarberBookingNotificationSMS(testPhone, bookingDetails);
    
    if (result.success) {
      console.log('\n✅ SMS sent successfully via AWS SNS!');
      console.log('Message ID:', result.messageId);
    } else if (result.skipped) {
      console.log('\n⚠️  SMS was skipped:', result.reason);
      console.log('Possible reasons:');
      console.log('  - sns_not_configured: AWS credentials missing');
      console.log('  - invalid_phone: Phone number format invalid');
      console.log('  - no_consent: User has not opted in to SMS');
      console.log('  - dnd: Phone number is on Do Not Disturb list');
    } else {
      console.log('\n❌ SMS failed but was handled gracefully');
      console.log('Error:', result.error);
    }
    
    console.log('\n✅ Test completed - app continues to work regardless of SMS status');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.log('Note: This should not happen - all errors should be caught gracefully');
    process.exit(1);
  }
}

testSNS();
