require('dotenv').config();
const { 
  sendBookingConfirmationEmail, 
  sendVerificationEmail,
  sendPasswordResetEmail 
} = require('./src/utils/emailService');

async function testAllEmails() {
  console.log('📧 Testing AWS SES Email Service with info@balkan.thisisrikisart.com\n');
  console.log(`✉️  Sender: ${process.env.EMAIL_FROM}`);
  console.log(`🌍 Region: ${process.env.AWS_REGION}`);
  console.log(`📧 Service: ${process.env.EMAIL_SERVICE}\n`);

  const testRecipient = process.env.EMAIL_FROM; // Send to self for testing

  try {
    // Test 1: Booking Confirmation
    console.log('1️⃣  Testing Booking Confirmation Email...');
    await sendBookingConfirmationEmail(testRecipient, 'Test Customer', {
      service: 'Premium Haircut + Beard Trim',
      barber: 'Al - Master Barber',
      date: 'December 15, 2025',
      time: '2:00 PM',
      price: '75.00'
    });
    console.log('✅ Booking confirmation sent!\n');

    // Test 2: Email Verification
    console.log('2️⃣  Testing Email Verification...');
    await sendVerificationEmail(testRecipient, 'Test User', 'test-token-abc123');
    console.log('✅ Verification email sent!\n');

    // Test 3: Password Reset
    console.log('3️⃣  Testing Password Reset...');
    await sendPasswordResetEmail(testRecipient, 'Test User', 'reset-token-xyz789');
    console.log('✅ Password reset email sent!\n');

    console.log('🎉 All tests passed successfully!');
    console.log(`📬 Check inbox: ${testRecipient}`);
    console.log('\n✨ Your emails will now be sent from: info@balkan.thisisrikisart.com');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nPossible issues:');
    console.error('- Domain not verified in AWS SES console');
    console.error('- AWS SES still in sandbox mode (can only send to verified emails)');
    console.error('- Invalid AWS credentials');
    console.error('- Incorrect region configuration');
  }
}

testAllEmails();
