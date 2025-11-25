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
    // Check if tables exist, if not create them
    const checkTables = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!checkTables.rows[0].exists) {
      console.log('Creating test database schema...');
      // Create schema matching production
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          phone VARCHAR(20),
          role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'barber')),
          is_verified BOOLEAN DEFAULT false,
          verification_token VARCHAR(255),
          reset_password_token VARCHAR(255),
          reset_password_expire TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS services (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) NOT NULL,
          duration INTEGER NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS addons (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          duration INTEGER NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS barbers (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          specialty VARCHAR(255),
          rating DECIMAL(3, 2) DEFAULT 0.0,
          is_available BOOLEAN DEFAULT true,
          image_url VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bookings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          service_id INTEGER REFERENCES services(id),
          barber_id INTEGER REFERENCES barbers(id),
          booking_date DATE NOT NULL,
          booking_time TIME NOT NULL,
          total_price DECIMAL(10, 2) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
          notes TEXT,
          no_show BOOLEAN DEFAULT false,
          reminder_24h_sent BOOLEAN DEFAULT false,
          reminder_2h_sent BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(barber_id, booking_date, booking_time)
        );

        CREATE TABLE IF NOT EXISTS booking_addons (
          id SERIAL PRIMARY KEY,
          booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
          addon_id INTEGER REFERENCES addons(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(500) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ratings (
          id SERIAL PRIMARY KEY,
          booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          barber_id INTEGER REFERENCES barbers(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
          comment TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(booking_id)
        );
      `);
    }
    
    // Ensure ratings table exists (might be missing in older test DBs)
    const checkRatings = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ratings'
      );
    `);
    
    if (!checkRatings.rows[0].exists) {
      await pool.query(`
        CREATE TABLE ratings (
          id SERIAL PRIMARY KEY,
          booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          barber_id INTEGER REFERENCES barbers(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
          comment TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(booking_id)
        );
      `);
    }
    
    // Clear all tables (only if they exist)
    const tables = ['ratings', 'bookings', 'booking_addons', 'barbers', 'users', 'services', 'addons', 'refresh_tokens'];
    for (const table of tables) {
      const checkResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (checkResult.rows[0].exists) {
        await pool.query(`TRUNCATE TABLE ${table} CASCADE`);
      }
    }
    
    // Create test admin user
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, role, is_verified) VALUES ($1, $2, $3, $4, $5, $6)',
      ['admin@barbershop.com', hashedPassword, 'Admin', 'User', 'admin', true]
    );
    
    // Create test regular user
    const userPassword = await bcrypt.hash('User@123456', 10);
    await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, role, is_verified, phone) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      ['user@test.com', userPassword, 'Test', 'User', 'user', true, '5551234567']
    );
    
    // Create test barber user
    const barberPassword = await bcrypt.hash('Barber@123456', 10);
    const barberResult = await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, role, is_verified) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
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
    const tables = ['ratings', 'bookings', 'booking_addons', 'barbers', 'users', 'services', 'addons', 'refresh_tokens'];
    for (const table of tables) {
      const checkResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (checkResult.rows[0].exists) {
        await pool.query(`TRUNCATE TABLE ${table} CASCADE`);
      }
    }
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
