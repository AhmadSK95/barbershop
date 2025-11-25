const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

let pool;

// Get database pool
const getPool = () => {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
  }
  return pool;
};

// Setup test database before all tests
const setupTestDatabase = async () => {
  const pool = getPool();
  
  try {
    // Clear all tables
    await pool.query('TRUNCATE TABLE bookings, barbers, users, services, refresh_tokens CASCADE');
    
    // Create test admin user
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, role, email_verified) VALUES ($1, $2, $3, $4, $5, $6)',
      ['admin@barbershop.com', hashedPassword, 'Admin', 'User', 'admin', true]
    );
    
    // Create test regular user
    const userPassword = await bcrypt.hash('User@123456', 10);
    await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, role, email_verified, phone) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      ['user@test.com', userPassword, 'Test', 'User', 'user', true, '5551234567']
    );
    
    // Create test barber user
    const barberPassword = await bcrypt.hash('Barber@123456', 10);
    const barberResult = await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, role, email_verified) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      ['barber@test.com', barberPassword, 'Test', 'Barber', 'barber', true]
    );
    
    // Create barber profile
    const barberId = barberResult.rows[0].id;
    await pool.query(
      'INSERT INTO barbers (user_id, specialty, rating, is_available) VALUES ($1, $2, $3, $4)',
      [barberId, 'Men\'s Haircuts', 4.8, true]
    );
    
    // Create test services
    await pool.query(`
      INSERT INTO services (name, description, price, duration) VALUES
      ('Premium Haircut', 'Professional haircut with consultation', 35.00, 30),
      ('Hot Towel Shave', 'Traditional straight edge razor shave', 30.00, 25),
      ('Beard Trim', 'Professional beard trimming and shaping', 20.00, 15)
    `);
    
    console.log('✅ Test database setup complete');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
};

// Cleanup test database after all tests
const cleanupTestDatabase = async () => {
  const pool = getPool();
  
  try {
    await pool.query('TRUNCATE TABLE bookings, barbers, users, services, refresh_tokens CASCADE');
    console.log('✅ Test database cleanup complete');
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error);
    throw error;
  }
};

// Close database connection
const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Database connection closed');
  }
};

// Get a user by email for testing
const getUserByEmail = async (email) => {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
};

// Get barber user for testing
const getBarberUser = async () => {
  const pool = getPool();
  const result = await pool.query(`
    SELECT u.*, b.id as barber_id 
    FROM users u 
    LEFT JOIN barbers b ON u.id = b.user_id 
    WHERE u.email = 'barber@test.com'
  `);
  return result.rows[0];
};

// Create a test booking
const createTestBooking = async (userId, barberId, serviceId) => {
  const pool = getPool();
  const bookingDate = new Date();
  bookingDate.setDate(bookingDate.getDate() + 3); // 3 days from now
  const dateStr = bookingDate.toISOString().split('T')[0];
  
  const result = await pool.query(
    `INSERT INTO bookings (user_id, barber_id, service_id, booking_date, booking_time, status, total_price)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [userId, barberId, serviceId, dateStr, '14:00:00', 'pending', 35.00]
  );
  return result.rows[0];
};

// Get service ID by name
const getServiceByName = async (name) => {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM services WHERE name = $1', [name]);
  return result.rows[0];
};

module.exports = {
  getPool,
  setupTestDatabase,
  cleanupTestDatabase,
  closeDatabase,
  getUserByEmail,
  getBarberUser,
  createTestBooking,
  getServiceByName,
};
