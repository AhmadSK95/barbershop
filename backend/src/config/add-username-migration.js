const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'barbershop_db',
  user: process.env.DB_USER || 'barbershop_user',
  password: process.env.DB_PASSWORD,
});

async function addUsernameColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting username column migration...');
    
    await client.query('BEGIN');
    
    // Step 1: Add username column (nullable first)
    console.log('1. Adding username column...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS username VARCHAR(100);
    `);
    
    // Step 2: Copy email values to username for existing users
    console.log('2. Copying email values to username...');
    await client.query(`
      UPDATE users 
      SET username = email 
      WHERE username IS NULL;
    `);
    
    // Step 3: Make username NOT NULL
    console.log('3. Making username NOT NULL...');
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN username SET NOT NULL;
    `);
    
    // Step 4: Add unique constraint to username
    console.log('4. Adding unique constraint to username...');
    await client.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_username_key UNIQUE (username);
    `);
    
    // Step 5: Add index on username for faster lookups
    console.log('5. Adding index on username...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);
    
    // Step 6: Remove unique constraint from email FIRST (before updating)
    console.log('6. Removing unique constraint from email...');
    await client.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_email_key;
    `);
    
    // Step 7: Update all emails to ahmad2609.as@gmail.com (now that constraint is removed)
    console.log('7. Updating all email addresses to ahmad2609.as@gmail.com...');
    await client.query(`
      UPDATE users 
      SET email = 'ahmad2609.as@gmail.com';
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Username migration completed successfully!');
    console.log('');
    console.log('📝 Summary:');
    console.log('   - Username column added (unique, not null)');
    console.log('   - Existing email values copied to username');
    console.log('   - All emails updated to ahmad2609.as@gmail.com');
    console.log('   - Email unique constraint removed');
    console.log('   - Username is now the unique identifier for login');
    console.log('');
    
    // Show sample users
    const result = await client.query(`
      SELECT id, username, email, role 
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
addUsernameColumn()
  .then(() => {
    console.log('🎉 Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
