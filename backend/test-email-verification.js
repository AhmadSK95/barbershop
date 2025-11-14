require('dotenv').config();
const { sendVerificationEmail } = require('./src/utils/email');

async function testEmail() {
  console.log('📧 Testing email configuration...');
  console.log(`SMTP Host: ${process.env.EMAIL_HOST}`);
  console.log(`SMTP Port: ${process.env.EMAIL_PORT}`);
  console.log(`Email User: ${process.env.EMAIL_USER}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log('');

  try {
    const testEmail = process.env.EMAIL_USER; // Send to self
    const testToken = 'test-verification-token-12345';
    
    console.log(`Sending verification email to: ${testEmail}`);
    await sendVerificationEmail(testEmail, 'Test User', testToken);
    console.log('✅ Email sent successfully!');
    console.log(`Verification URL: ${process.env.FRONTEND_URL}/verify-email/${testToken}`);
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    console.error('Full error:', error);
  }
}

testEmail();
