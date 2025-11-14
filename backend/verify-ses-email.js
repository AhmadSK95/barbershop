require('dotenv').config();
const { verifyEmailIdentity } = require('./src/utils/sesEmail');

async function verifySenderEmail() {
  const senderEmail = process.env.EMAIL_FROM || 'ahmad@mail.com';
  
  console.log('🔐 AWS SES Email Verification');
  console.log('================================');
  console.log(`Region: ${process.env.AWS_REGION}`);
  console.log(`Sender Email: ${senderEmail}`);
  console.log('');
  console.log('This will send a verification email to the sender address.');
  console.log('You MUST click the verification link in that email before you can send emails via SES.');
  console.log('');

  try {
    await verifyEmailIdentity(senderEmail);
    console.log('');
    console.log('✅ Verification email sent!');
    console.log('');
    console.log('NEXT STEPS:');
    console.log('1. Check the inbox of', senderEmail);
    console.log('2. Click the verification link from AWS');
    console.log('3. Once verified, test with: node test-ses-email.js');
    console.log('');
    console.log('Note: In AWS SES Sandbox mode, you can only send to verified email addresses.');
    console.log('To send to any email, request production access in AWS Console.');
  } catch (error) {
    console.error('');
    console.error('❌ Failed to initiate verification:', error.message);
    console.error('');
    console.error('Possible issues:');
    console.error('- Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
    console.error('- Verify AWS region is correct');
    console.error('- Ensure IAM user has SES permissions');
  }
}

verifySenderEmail();
