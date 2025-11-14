require('dotenv').config();
const { sendVerificationEmail, sendBookingConfirmationEmail } = require('./src/utils/sesEmail');

async function testSESEmail() {
  console.log('📧 Testing AWS SES Email...');
  console.log(`Region: ${process.env.AWS_REGION}`);
  console.log(`Sender: ${process.env.EMAIL_FROM}`);
  console.log('');

  try {
    const testEmail = process.env.EMAIL_FROM || 'ahmad@mail.com'; // Send to self for testing
    const testToken = 'test-verification-token-12345';
    
    console.log(`Sending verification email to: ${testEmail}`);
    await sendVerificationEmail(testEmail, 'Test User', testToken);
    console.log('✅ Verification email sent successfully!');
    console.log(`Verification URL: ${process.env.FRONTEND_URL}/verify-email/${testToken}`);
    console.log('');

    console.log('Sending booking confirmation email...');
    await sendBookingConfirmationEmail(testEmail, 'Test User', {
      service: 'Haircut - Master Barber',
      barber: 'Al',
      date: '2025-11-15',
      time: '10:00 AM',
      price: '60.00'
    });
    console.log('✅ Booking confirmation email sent successfully!');
    console.log('');
    
    console.log('🎉 All emails sent successfully via AWS SES!');
    console.log('Check your inbox:', testEmail);
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    console.error('');
    console.error('Common issues:');
    console.error('- Email address not verified in AWS SES (run: node verify-ses-email.js)');
    console.error('- AWS SES still in sandbox mode (can only send to verified addresses)');
    console.error('- Invalid AWS credentials');
    console.error('- Wrong AWS region');
  }
}

testSESEmail();
