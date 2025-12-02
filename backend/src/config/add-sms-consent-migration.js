const pool = require('./database');

async function addSMSConsentColumns() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('📝 Starting SMS consent columns migration...');
    
    // Check if sms_consent column exists
    const smsConsentCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'sms_consent'
    `);
    
    if (smsConsentCheck.rows.length === 0) {
      console.log('➕ Adding sms_consent column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN sms_consent BOOLEAN DEFAULT false
      `);
      console.log('✅ sms_consent column added');
    } else {
      console.log('⏭️  sms_consent column already exists');
    }
    
    // Check if sms_consent_date column exists
    const smsConsentDateCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'sms_consent_date'
    `);
    
    if (smsConsentDateCheck.rows.length === 0) {
      console.log('➕ Adding sms_consent_date column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN sms_consent_date TIMESTAMP
      `);
      console.log('✅ sms_consent_date column added');
    } else {
      console.log('⏭️  sms_consent_date column already exists');
    }
    
    await client.query('COMMIT');
    console.log('✅ SMS consent migration completed successfully');
    
    // Show sample of updated schema
    const sampleUsers = await client.query(`
      SELECT id, username, email, contact_email, phone, sms_consent, sms_consent_date 
      FROM users 
      LIMIT 3
    `);
    
    console.log('\n📊 Sample users with SMS consent columns:');
    console.table(sampleUsers.rows);
    
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
addSMSConsentColumns()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
