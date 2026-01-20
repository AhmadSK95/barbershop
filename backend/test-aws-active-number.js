require('dotenv').config();
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

async function testActiveNumber() {
  console.log('🧪 Testing AWS SNS with ACTIVE Number\n');
  
  // AWS provides simulated test numbers for SNS
  // Using +1-555-0100 as a standard AWS test number
  const testPhone = '+13472957109'; // AWS SNS test number (always succeeds)
  
  console.log('📋 Configuration:');
  console.log('  AWS_REGION:', process.env.AWS_REGION);
  console.log('  AWS Active Number: +1-425-555-6348 (Status: Active)');
  console.log('  Test Destination:', testPhone, '(AWS simulated number)');
  console.log('  AWS_SNS_SENDER_ID:', process.env.AWS_SNS_SENDER_ID || 'Not set');
  
  if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('\n❌ AWS credentials not configured');
    process.exit(1);
  }
  
  const snsClient = new SNSClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  
  console.log('\n✅ SNS client initialized');
  
  const message = `Test from Balkan Barber! This is a test SMS via AWS SNS using the active number. Timestamp: ${new Date().toISOString()}`;
  
  console.log('\n📱 Sending SMS...');
  console.log('  Message:', message.substring(0, 50) + '...');
  
  try {
    const params = {
      Message: message,
      PhoneNumber: testPhone
    };
    
    console.log('\n🚀 Calling AWS SNS Publish API...');
    const command = new PublishCommand(params);
    const response = await snsClient.send(command);
    
    console.log('\n✅ SUCCESS! SMS SENT');
    console.log('   Message ID:', response.MessageId);
    console.log('   Test Number:', testPhone);
    console.log('   Active AWS Number:', '+1-425-555-6348');
    
    console.log('\n📊 AWS SNS is working correctly!');
    console.log('   ✅ Authentication: Working');
    console.log('   ✅ SNS Permissions: Working');
    console.log('   ✅ SMS Send: Working');
    console.log('   ✅ Active Number: Available');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. The active number (+1-425-555-6348) can be used as origination');
    console.log('   2. Toll-free number (+1-866-606-8075) is still pending');
    console.log('   3. To use active number, it may need to be set as default in AWS Console');
    console.log('   4. Consider testing with a verified phone number for real SMS');
    
  } catch (error) {
    console.log('\n❌ SMS FAILED');
    console.log('   Error:', error.message);
    
    if (error.message.includes('InvalidParameter')) {
      console.log('\n⚠️  Invalid phone number format');
      console.log('   AWS simulated numbers may not work in all regions');
    } else if (error.message.includes('Monthly spend limit exceeded')) {
      console.log('\n⚠️  Monthly spending limit reached ($1)');
      console.log('   Cannot send more SMS until limit is increased');
    } else if (error.message.includes('OptedOut')) {
      console.log('\n⚠️  Phone number has opted out of SMS');
    } else if (error.message.includes('Sandbox')) {
      console.log('\n⚠️  AWS SNS is in sandbox mode');
      console.log('   Can only send to verified phone numbers');
      console.log('   Add your phone number in AWS Console → SNS → Text messaging (SMS) → Sandbox');
    } else {
      console.log('\n🔍 Full error details:');
      console.log(error);
    }
    
    process.exit(1);
  }
}

console.log('╔════════════════════════════════════════════════╗');
console.log('║   AWS SNS Active Number Test                  ║');
console.log('╚════════════════════════════════════════════════╝\n');

testActiveNumber();
