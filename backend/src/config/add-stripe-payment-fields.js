const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'barbershop_db',
  user: process.env.DB_USER || 'barbershop_user',
  password: process.env.DB_PASSWORD
});

async function addStripePaymentFields() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting Stripe payment fields migration...\n');
    
    await client.query('BEGIN');
    
    // Check if columns already exist
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      AND column_name IN ('stripe_customer_id', 'stripe_payment_method_id', 'card_last_4', 'card_brand', 'payment_verified', 'payment_status', 'payment_amount', 'stripe_charge_id');
    `;
    
    const existingColumns = await client.query(checkQuery);
    const existingColumnNames = existingColumns.rows.map(row => row.column_name);
    
    console.log('Existing payment columns:', existingColumnNames.length > 0 ? existingColumnNames : 'None');
    
    // Add columns that don't exist
    const columnsToAdd = [
      { name: 'stripe_customer_id', type: 'VARCHAR(255)', comment: 'Stripe customer ID for saved payment methods' },
      { name: 'stripe_payment_method_id', type: 'VARCHAR(255)', comment: 'Stripe payment method ID (saved card)' },
      { name: 'card_last_4', type: 'VARCHAR(4)', comment: 'Last 4 digits of card for display' },
      { name: 'card_brand', type: 'VARCHAR(50)', comment: 'Card brand (Visa, Mastercard, etc)' },
      { name: 'payment_verified', type: 'BOOLEAN DEFAULT false', comment: 'Whether card was verified with $1 auth' },
      { name: 'payment_status', type: 'VARCHAR(20) DEFAULT \'pending\'', comment: 'Payment status: pending, paid, refunded' },
      { name: 'payment_amount', type: 'DECIMAL(10,2)', comment: 'Amount charged (if paid)' },
      { name: 'stripe_charge_id', type: 'VARCHAR(255)', comment: 'Stripe charge/payment intent ID' }
    ];
    
    for (const column of columnsToAdd) {
      if (!existingColumnNames.includes(column.name)) {
        const alterQuery = `ALTER TABLE bookings ADD COLUMN ${column.name} ${column.type}`;
        await client.query(alterQuery);
        console.log(`✅ Added column: ${column.name} - ${column.comment}`);
      } else {
        console.log(`⏭️  Column already exists: ${column.name}`);
      }
    }
    
    // Create payments table for detailed transaction tracking
    const createPaymentsTable = `
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        stripe_charge_id VARCHAR(255) UNIQUE,
        stripe_customer_id VARCHAR(255),
        stripe_payment_method_id VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(20) NOT NULL,
        description TEXT,
        card_last_4 VARCHAR(4),
        card_brand VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        refunded_at TIMESTAMP,
        refund_amount DECIMAL(10,2),
        refund_reason TEXT
      );
    `;
    
    await client.query(createPaymentsTable);
    console.log('✅ Created/verified payments table');
    
    // Create index on stripe_customer_id for faster lookups
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_bookings_stripe_customer 
      ON bookings(stripe_customer_id);
    `;
    await client.query(createIndexQuery);
    console.log('✅ Created index on stripe_customer_id');
    
    // Create index on payment_status for faster queries
    const createStatusIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_bookings_payment_status 
      ON bookings(payment_status);
    `;
    await client.query(createStatusIndexQuery);
    console.log('✅ Created index on payment_status');
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Stripe payment fields migration completed successfully!\n');
    
    // Show summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(stripe_customer_id) as bookings_with_payment_method,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_bookings,
        COUNT(CASE WHEN payment_verified = true THEN 1 END) as verified_cards
      FROM bookings;
    `;
    
    const summary = await client.query(summaryQuery);
    console.log('📊 Current Statistics:');
    console.log(`   Total Bookings: ${summary.rows[0].total_bookings}`);
    console.log(`   With Payment Methods: ${summary.rows[0].bookings_with_payment_method}`);
    console.log(`   Paid: ${summary.rows[0].paid_bookings}`);
    console.log(`   Verified Cards: ${summary.rows[0].verified_cards}\n`);
    
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
addStripePaymentFields()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
