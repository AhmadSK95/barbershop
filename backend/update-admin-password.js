const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Connection pool
const pool = new Pool({
  user: 'barbershop_user',
  host: 'barbershop_postgres',
  database: 'barbershop_db',
  password: 'barbershop_password_2024',
  port: 5432,
});

async function updateAdminPassword() {
  const client = await pool.connect();
  try {
    // Generate new hash for Admin123!
    const password = 'Admin123!';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('Generated hash:', hash);
    console.log('For password:', password);
    
    // Update database
    const result = await client.query(
      'UPDATE users SET password = $1 WHERE id = 1 RETURNING id, username, email',
      [hash]
    );
    
    console.log('\nUpdated user:', result.rows[0]);
    console.log('Rows updated:', result.rowCount);
    
    // Verify it worked by comparing
    const verifyResult = await client.query(
      'SELECT password FROM users WHERE id = 1'
    );
    
    const storedHash = verifyResult.rows[0].password;
    const match = await bcrypt.compare(password, storedHash);
    
    console.log('\nVerification:');
    console.log('Password matches stored hash:', match);
    
    if (!match) {
      console.error('ERROR: Password update failed verification!');
      process.exit(1);
    }
    
    console.log('\n✅ Admin password successfully updated to: Admin123!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

updateAdminPassword();
