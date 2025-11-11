#!/usr/bin/env node

/**
 * Test User Creation Script
 * Creates a test user account for user journey testing
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
      const token = registerResponse.data.data.token;
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
        console.error('Message:', errorMsg);
        console.error('\n💡 The backend has rate limiting enabled.');
        console.error('Please wait 15 minutes and try again, or temporarily disable rate limiting for testing.\n');
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
          console.log('⚠️  Could not login. You may need to reset the password.');
          console.log('Error:', loginError.response?.data?.message || loginError.message);
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
