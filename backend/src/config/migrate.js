const pool = require('./database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const migrations = `
-- Users table
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

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  duration INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add-ons table
CREATE TABLE IF NOT EXISTS addons (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  duration INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Barbers table
CREATE TABLE IF NOT EXISTS barbers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  specialty VARCHAR(255),
  rating DECIMAL(3, 2) DEFAULT 0.0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table
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
  hairstyle_image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(barber_id, booking_date, booking_time)
);

-- Add hairstyle_image column if it doesn't exist (for existing databases)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='bookings' AND column_name='hairstyle_image') THEN
    ALTER TABLE bookings ADD COLUMN hairstyle_image TEXT;
  END IF;
END $$;

-- Booking add-ons junction table
CREATE TABLE IF NOT EXISTS booking_addons (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  addon_id INTEGER REFERENCES addons(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date_time ON bookings(booking_date, booking_time);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
`;

const seedData = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert services (Balkan Barber Shop)
    const servicesData = [
      ['Haircut - Master Barber', 'Premium haircut by master barbers Al, Cynthia, John, or Nick', 60, 30],
      ['Haircut - Senior Barber', 'Quality haircut by senior barbers Eric or Riza', 50, 30],
      ['Buzz Cut', 'Classic buzz cut by any barber', 30, 30],
      ['Beard Trim', 'Professional beard trim (no straight razor)', 20, 30],
      ['Beard Trim & Razor', 'Beard trim with straight razor finish', 40, 30],
      ['Haircut & Beard Trim Straight Razor', 'Complete haircut and beard trim with straight razor', 90, 60],
      ['Haircut & Straight Razor Shave', 'Haircut with traditional straight razor shave', 120, 60],
      ['Hot Towel Shave', 'Luxurious hot towel straight razor shave', 60, 30]
    ];

    for (const service of servicesData) {
      await client.query(
        'INSERT INTO services (name, description, price, duration) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        service
      );
    }

    // Insert add-ons (Balkan Barber Shop)
    const addonsData = [
      ['Beard Trim (Straight Razor NOT included)', 20, 15],
      ['Shave', 0, 15]
    ];

    for (const addon of addonsData) {
      await client.query(
        'INSERT INTO addons (name, price, duration) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        addon
      );
    }

    // Create default admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@barbershop.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminResult = await client.query(
      `INSERT INTO users (email, password, first_name, last_name, role, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [adminEmail, hashedPassword, 'Admin', 'User', 'admin', true]
    );

    // Create sample barbers (Balkan Barber Shop staff)
    const barberUsers = [
      ['al@balkanbarbers.com', 'Al', 'Balkan', 'Master Barber - All Services', 4.9],
      ['cynthia@balkanbarbers.com', 'Cynthia', 'Balkan', 'Master Barber - Shave Specialist', 4.9],
      ['eric@balkanbarbers.com', 'Eric', 'Balkan', 'Senior Barber', 4.7],
      ['john@balkanbarbers.com', 'John', 'Balkan', 'Master Barber - Premium Cuts', 4.8],
      ['nick@balkanbarbers.com', 'Nick', 'Balkan', 'Master Barber - Beard Expert', 4.9],
      ['riza@balkanbarbers.com', 'Riza', 'Balkan', 'Senior Barber - Classic Styles', 4.7]
    ];

    for (const [email, firstName, lastName, specialty, rating] of barberUsers) {
      const password = await bcrypt.hash('Barber@123', 10);
      const userResult = await client.query(
        `INSERT INTO users (email, password, first_name, last_name, role, is_verified) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [email, password, firstName, lastName, 'barber', true]
      );

      if (userResult.rows.length > 0) {
        await client.query(
          'INSERT INTO barbers (user_id, specialty, rating) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [userResult.rows[0].id, specialty, rating]
        );
      }
    }

    // Add "Any Available" barber option (no user_id)
    await client.query(
      'INSERT INTO barbers (user_id, specialty, rating) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [null, 'Next available barber', null]
    );

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
  }
};

const runMigrations = async () => {
  try {
    console.log('🔄 Running database migrations...');
    await pool.query(migrations);
    console.log('✅ Migrations completed successfully');

    console.log('🔄 Seeding database...');
    await seedData();

    console.log('✅ Database setup complete!');
    console.log('\n📝 Default Admin Credentials:');
    console.log(`Email: ${process.env.ADMIN_EMAIL || 'admin@barbershop.com'}`);
    console.log(`Password: ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigrations();
