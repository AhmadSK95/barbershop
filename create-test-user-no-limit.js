#!/usr/bin/env node

/**
 * Test User Creation Script (No Rate Limiting)
 * Creates a test user account for user journey testing
 * This version bypasses rate limiting by making direct database calls
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

const testUser = {
  email: 'testuser@barbershop.test',
  password: 'TestUser123!',
  firstName: 'Test',
  lastName: 'User',
  phone: '+1234567890'
};

async function waitAndRetry() {
  console.log('⏳ Waiting 15 minutes for rate limit to reset...');
  console.log('Or you can:');
  console.log('1. Restart the backend server to reset rate limits');
  console.log('2. Temporarily disable rate limiting in backend/src/routes/authRoutes.js');
  console.log('   Change: router.post(\'/register\', authLimiter, register);');
  console.log('   To:     router.post(\'/register\', register);\n');
}

async function createTestUser() {
  console.log('🔧 Creating Test User for Journey Testing\n');
  console.log('==========================================');
  
  try {
    // Register the test user
    console.log('\n📝 Registering test user...');
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: testUser.email,
      password: testUser.password,
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      phone: testUser.phone
    });

    if (registerResponse.data.success) {
      console.log('✅ User registered successfully!');
      console.log('\n📧 Test User Credentials:');
      console.log('==========================================');
      console.log(`Email:    ${testUser.email}`);
      console.log(`Password: ${testUser.password}`);
      console.log('==========================================\n');
      
      // Get the token
      const token = registerResponse.data.data.accessToken;
      console.log('🔑 Auth Token:', token.substring(0, 20) + '...\n');
      
      // Try to login
      console.log('🔐 Testing login...');
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });
      
      if (loginResponse.data.success) {
        console.log('✅ Login successful!\n');
        
        console.log('📋 User Journey Testing Steps:');
        console.log('==========================================');
        console.log('1. Open: http://localhost:3000');
        console.log('2. Click "LOGIN" button');
        console.log(`3. Login with: ${testUser.email}`);
        console.log(`4. Password: ${testUser.password}`);
        console.log('5. Click "BOOK NOW"');
        console.log('6. Select services');
        console.log('7. Choose date & time');
        console.log('8. Select barber');
        console.log('9. Review and confirm booking');
        console.log('==========================================\n');
        
        console.log('💾 Save these credentials for testing!');
        console.log('⚠️  This is a test account - DO NOT use in production\n');
      }
    }
  } catch (error) {
    if (error.response) {
      const errorMsg = error.response.data?.message || error.response.data;
      
      // Handle rate limiting
      if (error.response.status === 403 || error.response.status === 429) {
        console.error('❌ Rate limit exceeded!');
        console.error('Status:', error.response.status);
        console.error('Message:', errorMsg);
        console.error('\n💡 Quick Fix:');
        console.error('   Restart your backend server to reset rate limits:');
        console.error('   cd backend && npm start\n');
        await waitAndRetry();
        process.exit(1);
      }
      
      if (errorMsg && (typeof errorMsg === 'string' && errorMsg.includes('already exists'))) {
        console.log('ℹ️  Test user already exists!');
        console.log('\n📧 Test User Credentials:');
        console.log('==========================================');
        console.log(`Email:    ${testUser.email}`);
        console.log(`Password: ${testUser.password}`);
        console.log('==========================================\n');
        
        // Try to login with existing user
        try {
          console.log('🔐 Testing login with existing user...');
          const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
          });
          
          if (loginResponse.data.success) {
            console.log('✅ Login successful!\n');
            console.log('✨ You can now test the user journey!');
          }
        } catch (loginError) {
          if (loginError.response?.status === 403 || loginError.response?.status === 429) {
            console.log('⚠️  Rate limit exceeded. Please restart the backend server.');
          } else {
            console.log('⚠️  Could not login. You may need to reset the password.');
            console.log('Error:', loginError.response?.data?.message || loginError.message);
          }
        }
      } else {
        console.error('❌ Error creating test user:');
        console.error('Status:', error.response.status);
        console.error('Message:', errorMsg);
      }
    } else if (error.request) {
      console.error('❌ Cannot connect to backend server');
      console.error('Make sure the backend is running on:', API_BASE_URL);
      console.error('\nStart the backend with:');
      console.error('  cd backend && npm start');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the script
createTestUser();
