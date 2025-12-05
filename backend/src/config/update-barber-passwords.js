const pool = require('./database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function updateBarberPasswords() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting barber password update...\n');
    
    // Hash the new password
    const newPassword = 'Barber123!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log('✅ New password hashed successfully\n');
    
    // Get all barber accounts
    const barbersQuery = `
      SELECT u.id, u.email, u.first_name, u.last_name
      FROM users u
      WHERE u.role = 'barber'
      ORDER BY u.email;
    `;
    
    const barbers = await client.query(barbersQuery);
    
    if (barbers.rows.length === 0) {
      console.log('⚠️  No barber accounts found in database\n');
      return;
    }
    
    console.log(`📋 Found ${barbers.rows.length} barber account(s):\n`);
    barbers.rows.forEach((barber, index) => {
      console.log(`   ${index + 1}. ${barber.first_name} ${barber.last_name} (${barber.email})`);
    });
    console.log();
    
    // Update all barber passwords
    await client.query('BEGIN');
    
    const updateQuery = `
      UPDATE users 
      SET password = $1, updated_at = CURRENT_TIMESTAMP
      WHERE role = 'barber'
    `;
    
    const result = await client.query(updateQuery, [hashedPassword]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Successfully updated ${result.rowCount} barber password(s)\n`);
    console.log('📝 New credentials for all barbers:');
    console.log('   Password: Barber123!\n');
    
    console.log('🔐 Barber Login Credentials:\n');
    barbers.rows.forEach((barber, index) => {
      console.log(`   ${index + 1}. Email: ${barber.email}`);
      console.log(`      Password: Barber123!`);
      console.log();
    });
    
    console.log('✨ Password update completed successfully!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating passwords:', error.message);
    console.error('\nFull error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updateBarberPasswords()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
