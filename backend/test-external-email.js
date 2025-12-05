require('dotenv').config();
const { sendBookingConfirmationEmail } = require('./src/utils/emailService');

async function testExternalEmail() {
  const externalEmail = 'ahmad2609.as@gmail.com'; // Test with your verified email
  
  console.log('📧 Testing external email delivery...\n');
  console.log(`From: ${process.env.EMAIL_FROM}`);
  console.log(`To: ${externalEmail}\n`);

  try {
    await sendBookingConfirmationEmail(externalEmail, 'Ahmad', {
      service: 'Premium Haircut',
      barber: 'Al - Master Barber',
      date: 'December 10, 2025',
      time: '3:00 PM',
      price: '60.00'
    });
    
    console.log('✅ Email sent successfully!');
    console.log(`📬 Check inbox: ${externalEmail}`);
    console.log('\n✨ Emails are now being sent from: info@balkan.thisisrikisart.com');
    
  } catch (error) {
    console.error('\n❌ Send failed:', error.message);
    
    if (error.message.includes('not verified') || error.message.includes('MessageRejected')) {
      console.error('\n⚠️  AWS SES Sandbox Mode Detected!');
      console.error('\nYour SES account is in sandbox mode, which means:');
      console.error('✅ You can send FROM verified domains/emails (info@balkan.thisisrikisart.com - verified)');
      console.error('❌ You can only send TO verified email addresses');
      console.error('\nTo send to any email address:');
      console.error('1. Go to AWS SES Console → Account Dashboard');
      console.error('2. Request production access (takes 24 hours to review)');
      console.error('3. OR verify recipient emails individually in SES → Verified Identities');
      console.error(`\nTo verify ${externalEmail}:`);
      console.error(`   aws ses verify-email-identity --email-address ${externalEmail} --region us-east-1`);
    }
  }
}

testExternalEmail();
