require('dotenv').config();
const { SNSClient, GetSMSAttributesCommand, ListOriginationNumbersCommand } = require('@aws-sdk/client-sns');

async function checkAWSConfig() {
  console.log('🔍 Checking AWS SNS Configuration...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('  AWS_REGION:', process.env.AWS_REGION || '❌ Not set');
  console.log('  AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set');
  console.log('  AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set');
  console.log('  AWS_SNS_SENDER_ID:', process.env.AWS_SNS_SENDER_ID || '❌ Not set\n');
  
  if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('❌ AWS credentials not configured. Please set AWS environment variables.');
    process.exit(1);
  }
  
  try {
    const snsClient = new SNSClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    console.log('✅ AWS SNS client initialized successfully\n');
    
    // Get SMS Attributes
    console.log('📱 Fetching SMS Attributes...');
    try {
      const attributesCommand = new GetSMSAttributesCommand({});
      const attributesResponse = await snsClient.send(attributesCommand);
      
      if (attributesResponse.attributes && Object.keys(attributesResponse.attributes).length > 0) {
        console.log('\n✅ Current SMS Settings:');
        Object.entries(attributesResponse.attributes).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      } else {
        console.log('\n⚠️  No SMS attributes configured (using AWS defaults)');
      }
    } catch (error) {
      console.log('\n⚠️  Could not fetch SMS attributes:', error.message);
    }
    
    // List origination numbers (sender IDs, phone numbers)
    console.log('\n📞 Checking for Origination Numbers (Sender IDs)...');
    try {
      const originationCommand = new ListOriginationNumbersCommand({});
      const originationResponse = await snsClient.send(originationCommand);
      
      if (originationResponse.PhoneNumbers && originationResponse.PhoneNumbers.length > 0) {
        console.log('\n✅ Available Origination Numbers:');
        originationResponse.PhoneNumbers.forEach((phone, index) => {
          console.log(`\n  ${index + 1}. Phone Number: ${phone.PhoneNumber}`);
          console.log(`     Status: ${phone.Status}`);
          console.log(`     Country: ${phone.IsoCountryCode}`);
          console.log(`     Capabilities: ${phone.Capabilities?.join(', ')}`);
        });
      } else {
        console.log('\n⚠️  No dedicated origination numbers found');
        console.log('   This is normal - AWS SNS can send without dedicated numbers');
      }
    } catch (error) {
      console.log('\n⚠️  Could not fetch origination numbers:', error.message);
    }
    
    // Important notes
    console.log('\n📝 Important Notes:');
    console.log('  1. Sender ID support varies by country:');
    console.log('     - ❌ US: Sender IDs NOT supported (numbers show as random)');
    console.log('     - ✅ UK, EU, India, etc: Sender IDs supported');
    console.log('  2. For US recipients, consider getting a dedicated phone number');
    console.log('  3. Check AWS SNS Sandbox status - may need production access');
    console.log('  4. Default sender ID from .env: ' + (process.env.AWS_SNS_SENDER_ID || 'Not set'));
    
    // Check sandbox status
    console.log('\n🏖️  Sandbox Status:');
    console.log('   To check if in sandbox: AWS Console → SNS → Text messaging (SMS)');
    console.log('   Sandbox = Can only send to verified numbers');
    console.log('   Production = Can send to any number');
    
    // Next steps
    console.log('\n✅ Next Steps:');
    console.log('  1. If in US: Sender ID will not show (this is normal)');
    console.log('  2. If outside US: Set AWS_SNS_SENDER_ID=BalkanBarber in .env');
    console.log('  3. Test sending: node test-sns-sms.js');
    console.log('  4. For production: Request SMS spending limit increase if needed');
    
  } catch (error) {
    console.error('\n❌ Error checking AWS configuration:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

checkAWSConfig();
