const bcrypt = require('bcryptjs');

// Test passwords
const passwords = ['Admin@123456', 'Admin123!'];
const hash = '$2a$10$7u5.I6WVZVELRmLW/8k92uTEi9k/X1l3/9o5YiRmwsZVh6r6P7M/u';

async function test() {
  console.log('Testing password hashes...\n');
  
  for (const password of passwords) {
    const match = await bcrypt.compare(password, hash);
    console.log(`Password: "${password}"`);
    console.log(`Match: ${match}\n`);
  }
  
  // Generate a new hash for Admin123!
  console.log('Generating new hash for Admin123!...');
  const newHash = await bcrypt.hash('Admin123!', 10);
  console.log(`New hash: ${newHash}`);
  
  // Verify the new hash
  const verify = await bcrypt.compare('Admin123!', newHash);
  console.log(`Verification: ${verify}`);
}

test().catch(console.error);
