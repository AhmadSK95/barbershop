require('dotenv').config();
const { sendBookingConfirmationEmail } = require('./services/email');

// Test booking details
const testBookingDetails = {
  customerName: 'John Doe',
  date: 'December 15, 2025',
  time: '2:00 PM',
  barberName: 'Mike Johnson',
  services: 'Haircut, Beard Trim',
  totalPrice: '45.00'
};

const testEmail = process.env.TEST_EMAIL || 'test@example.com';

console.log('🧪 Testing Email Booking Confirmation...\n');
console.log('Test Details:');
console.log(`- Email: ${testEmail}`);
console.log(`- Customer: ${testBookingDetails.customerName}`);
console.log(`- Date: ${testBookingDetails.date}`);
console.log(`- Time: ${testBookingDetails.time}`);
console.log(`- Barber: ${testBookingDetails.barberName}`);
console.log(`- Services: ${testBookingDetails.services}`);
console.log(`- Total: $${testBookingDetails.totalPrice}\n`);

sendBookingConfirmationEmail(testEmail, testBookingDetails)
  .then((result) => {
    console.log('✅ Email sent successfully!');
    console.log(`Message ID: ${result.messageId}`);
    console.log('\n📬 Check your inbox at:', testEmail);
  })
  .catch((error) => {
    console.error('❌ Error sending email:', error.message);
    console.error('\nTroubleshooting:');
    console.error('- Check AWS_REGION is set in .env');
    console.error('- Verify AWS_ACCESS_KEY_ID is correct');
    console.error('- Verify AWS_SECRET_ACCESS_KEY is correct');
    console.error('- Ensure EMAIL_FROM is verified in AWS SES');
    console.error('- If in sandbox mode, verify recipient email in SES');
  });
