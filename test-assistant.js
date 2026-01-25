const axios = require('axios');

const API_URL = 'https://balkan.thisisrikisart.com/api';
const ADMIN_USERNAME = 'admin@barbershop.com';  // Using email since username field may not exist
const ADMIN_PASSWORD = 'Admin@123456';

async function testAssistant() {
  try {
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Test questions to evaluate assistant
    const testQuestions = [
      'What is my total revenue this month?',
      'Show me the top barbers',
      'What is my no-show rate?',
      'How many bookings do I have today?',
      'Which services are most popular?',
      'Show me revenue trends',
      'What are my pending bookings?',
      'How many new users signed up this week?'
    ];

    console.log('🤖 Testing Assistant with various questions:\n');
    console.log('='.repeat(80));

    for (let i = 0; i < testQuestions.length; i++) {
      const question = testQuestions[i];
      console.log(`\n📝 Question ${i + 1}: "${question}"`);
      
      const startTime = Date.now();
      
      try {
        const response = await axios.post(
          `${API_URL}/assistant/query`,
          { question, revealPII: false },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(`⏱️  Response time: ${duration}s`);
        console.log(`✅ Success: ${response.data.success}`);
        
        if (response.data.data) {
          const data = response.data.data;
          console.log(`📊 Metric: ${data.metric || 'N/A'}`);
          console.log(`💡 Summary: ${data.summary || 'N/A'}`);
          
          if (data.visualization) {
            console.log(`📈 Visualization: ${data.visualization.type} - ${data.visualization.title}`);
          }
          
          if (data.rows) {
            console.log(`📋 Data rows: ${data.rows.length}`);
            if (data.rows.length > 0) {
              console.log(`   Sample: ${JSON.stringify(data.rows[0]).substring(0, 100)}...`);
            }
          }
        }
        
        if (response.data.message) {
          console.log(`💬 Message: ${response.data.message}`);
        }
        
      } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`⏱️  Response time: ${duration}s`);
        console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
      }
      
      console.log('-'.repeat(80));
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n🏁 Testing complete!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testAssistant();
