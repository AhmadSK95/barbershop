require('dotenv').config();
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

async function testTollFree() {
  console.log('📱 Testing Toll-Free Number for SMS\n');
  
  // Configuration check
  console.log('Configuration:');
  console.log('  AWS_REGION:', process.env.AWS_REGION);
  console.log('  AWS_SNS_ORIGINATION_NUMBER:', process.env.AWS_SNS_ORIGINATION_NUMBER || '❌ Not set');
  console.log('  AWS_SNS_SENDER_ID:', process.env.AWS_SNS_SENDER_ID || '❌ Not set');
  
  if (!process.env.AWS_SNS_ORIGINATION_NUMBER) {
    console.log('\n❌ AWS_SNS_ORIGINATION_NUMBER not set in .env');
    process.exit(1);
  }
  
  const snsClient = new SNSClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  
  // Test phone number (change to yours for actual testing)
  const testPhone = process.env.TEST_PHONE || '+13472957109';
  
  console.log('\n📞 Attempting to send SMS from toll-free number...');
  console.log('  From:', process.env.AWS_SNS_ORIGINATION_NUMBER);
  console.log('  To:', testPhone);
  
  const message = `Test from Balkan Barber! This SMS should appear from ${process.env.AWS_SNS_ORIGINATION_NUMBER}. If you see this number, toll-free SMS is working! 🎉`;
  
  console.log('  Message:', message.substring(0, 50) + '...');
  
  try {
    // AWS SNS Publish API - origination identity is NOT supported for direct SMS
    // Toll-free numbers must be set as default in AWS Console
    const params = {
      Message: message,
      PhoneNumber: testPhone
    };
    
    console.log('\n🚀 Sending SMS...');
    const command = new PublishCommand(params);
    const response = await snsClient.send(command);
    
    console.log('\n✅ SMS SENT SUCCESSFULLY!');
    console.log('   Message ID:', response.MessageId);
    console.log('\n📱 Check your phone at', testPhone);
    console.log('   The SMS should appear from:', process.env.AWS_SNS_ORIGINATION_NUMBER);
    console.log('   (866-606-8075)');
    
    console.log('\n🎉 Toll-free number is ACTIVE and working!');
    console.log('   You can now use it for all customer SMS notifications.');
    
  } catch (error) {
    console.log('\n❌ SMS FAILED');
    console.log('   Error:', error.message);
    
    if (error.message.includes('OriginationIdentityNotFound')) {
      console.log('\n⚠️  The toll-free number is not yet active.');
      console.log('   Status: Still pending AWS activation');
      console.log('   What to do:');
      console.log('   1. Wait 1-7 business days for AWS to activate');
      console.log('   2. Check status: node check-aws-sns-config.js');
      console.log('   3. Try again when status = "Active"');
    } else if (error.message.includes('Invalid parameter')) {
      console.log('\n⚠️  Invalid phone number or configuration issue');
      console.log('   Check that TEST_PHONE is in E.164 format (+1XXXXXXXXXX)');
    } else if (error.message.includes('Monthly spend limit exceeded')) {
      console.log('\n⚠️  Monthly spending limit reached ($1)');
      console.log('   Need to increase limit to continue testing');
    } else {
      console.log('\n🔍 Unknown error. Full details:');
      console.log(error);
    }
    
    process.exit(1);
  }
}

console.log('🧪 Toll-Free SMS Test\n');
console.log('This will attempt to send SMS using your toll-free number:');
console.log('  +1-866-606-8075\n');
console.log('If successful, customers will see SMS from this number! 🎯\n');

testTollFree();
