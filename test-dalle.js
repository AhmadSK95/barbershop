require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

// Test user credentials (use your actual test user)
const TEST_USER = {
  email: 'ahmad@mail.com',
  password: 'Coxw6IRj/DCR/vPBqFQZNgBP'
};

async function testDalleIntegration() {
  try {
    console.log('🔐 Logging in...');
    
    // Login to get auth token
    const loginResponse = await axios.post(`${API_URL}/auth/login`, TEST_USER);
    const token = loginResponse.data.token;
    
    console.log('✅ Login successful!\n');

    // Test 1: Generate custom hairstyle
    console.log('🎨 Test 1: Generating custom hairstyle...');
    const customResult = await axios.post(
      `${API_URL}/dalle/generate`,
      {
        prompt: 'Modern short haircut for men with textured top',
        options: {
          quality: 'standard',
          size: '1024x1024'
        }
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Custom hairstyle generated!');
    console.log('Image URL:', customResult.data.images[0].url);
    console.log('Revised Prompt:', customResult.data.images[0].revised_prompt);
    console.log('');

    // Test 2: Generate fade style
    console.log('💈 Test 2: Generating fade style...');
    const fadeResult = await axios.post(
      `${API_URL}/dalle/fade-style`,
      {
        fadeType: 'mid fade',
        additionalDetails: 'with line up and beard trim'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Fade style generated!');
    console.log('Image URL:', fadeResult.data.images[0].url);
    console.log('');

    // Test 3: Generate hairstyle variations
    console.log('✨ Test 3: Generating hairstyle variations...');
    const variationsResult = await axios.post(
      `${API_URL}/dalle/hairstyle-variations`,
      {
        baseDescription: 'Classic pompadour',
        customerPreferences: 'with side part, professional business look'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Hairstyle variations generated!');
    console.log('Image URL:', variationsResult.data.images[0].url);
    console.log('');

    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run tests
testDalleIntegration();
