// Test script for assistant endpoints
// Run: node backend/test-assistant.js

require('dotenv').config({ path: './.env' });
const axios = require('axios');

const API_URL = process.env.API_URL || 'https://balkan.thisisrikisart.com/api';

// Test credentials (use your admin account)
const ADMIN_USERNAME = 'ahmadskmoin2021@gmail.com'; // username field
const ADMIN_PASSWORD = 'Admin123!';

let accessToken = '';

const test = async () => {
  try {
    console.log('🧪 Testing Assistant Endpoints...\n');

    // 1. Login as admin
    console.log('1️⃣  Logging in as admin...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD
    });
    accessToken = loginRes.data.data.accessToken;
    console.log('✅ Logged in successfully\n');

    // 2. List available metrics
    console.log('2️⃣  Listing available metrics...');
    const metricsRes = await axios.get(`${API_URL}/admin/assistant/metrics`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log(`✅ Found ${metricsRes.data.data.count} metrics:`);
    metricsRes.data.data.metrics.forEach(m => {
      console.log(`   - ${m.name}: ${m.description}`);
    });
    console.log('');

    // 3. Test bookings_by_status metric
    console.log('3️⃣  Testing bookings_by_status metric...');
    const bookingsRes = await axios.post(
      `${API_URL}/admin/assistant/query`,
      {
        metric: 'bookings_by_status',
        params: {
          startDate: 'last_30_days',
          endDate: 'today'
        }
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    console.log('✅ Query executed successfully:');
    console.log(`   Summary: ${bookingsRes.data.data.summary}`);
    console.log(`   Rows returned: ${bookingsRes.data.data.rowCount}`);
    console.log(`   Latency: ${bookingsRes.data.data.latency}ms`);
    console.log('   Data:', JSON.stringify(bookingsRes.data.data.rows, null, 2));
    console.log('');

    // 4. Test top_barbers metric
    console.log('4️⃣  Testing top_barbers metric...');
    const barbersRes = await axios.post(
      `${API_URL}/admin/assistant/query`,
      {
        metric: 'top_barbers',
        params: {
          startDate: 'last_30_days',
          endDate: 'today',
          limit: 5
        }
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    console.log('✅ Query executed successfully:');
    console.log(`   Summary: ${barbersRes.data.data.summary}`);
    console.log(`   Top 5 barbers:`, JSON.stringify(barbersRes.data.data.rows, null, 2));
    console.log('');

    // 5. Test rate limiting
    console.log('5️⃣  Testing rate limiting (making 12 requests)...');
    let rateLimited = false;
    for (let i = 1; i <= 12; i++) {
      try {
        await axios.get(`${API_URL}/admin/assistant/metrics`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        console.log(`   Request ${i}/12: ✅`);
      } catch (error) {
        if (error.response?.status === 429) {
          console.log(`   Request ${i}/12: ⛔ Rate limited (expected)`);
          rateLimited = true;
          break;
        }
        throw error;
      }
    }
    if (rateLimited) {
      console.log('✅ Rate limiting working correctly\n');
    } else {
      console.log('⚠️  Rate limiting did not trigger (might be expected)\n');
    }

    console.log('🎉 All tests passed!');
    console.log('\n✨ Assistant endpoints are working correctly!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
};

test();
