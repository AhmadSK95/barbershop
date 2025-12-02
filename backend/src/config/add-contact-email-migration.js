const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'barbershop_db',
  user: process.env.DB_USER || 'barbershop_user',
  password: process.env.DB_PASSWORD,
});

async function addContactEmailColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting contact_email column migration...');
    
    await client.query('BEGIN');
    
    // Step 1: Add contact_email column (nullable first)
    console.log('1. Adding contact_email column...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
    `);
    
    // Step 2: Set default value to ahmad2609.as@gmail.com for all users
    console.log('2. Setting contact_email to ahmad2609.as@gmail.com for all users...');
    await client.query(`
      UPDATE users 
      SET contact_email = 'ahmad2609.as@gmail.com'
      WHERE contact_email IS NULL;
    `);
    
    // Step 3: Make contact_email NOT NULL with default
    console.log('3. Making contact_email NOT NULL with default value...');
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN contact_email SET DEFAULT 'ahmad2609.as@gmail.com',
      ALTER COLUMN contact_email SET NOT NULL;
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Contact email migration completed successfully!');
    console.log('');
    console.log('📝 Summary:');
    console.log('   - contact_email column added');
    console.log('   - All contact emails set to ahmad2609.as@gmail.com');
    console.log('   - Barber notifications will now work');
    console.log('');
    
    // Show sample users
    const result = await client.query(`
      SELECT id, username, email, contact_email, role 
      FROM users 
      ORDER BY id 
      LIMIT 10
    `);
    
    console.log('📋 Sample users after migration:');
    console.table(result.rows);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
addContactEmailColumn()
  .then(() => {
    console.log('🎉 Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
