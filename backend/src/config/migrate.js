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
  name VARCHAR(100) UNIQUE NOT NULL,
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(barber_id, booking_date, booking_time)
);

-- Booking add-ons junction table
CREATE TABLE IF NOT EXISTS booking_addons (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  addon_id INTEGER REFERENCES addons(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS DND table
CREATE TABLE IF NOT EXISTS sms_dnd_numbers (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(32) UNIQUE NOT NULL,
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

-- Barber-services junction table (barbers can offer multiple services)
CREATE TABLE IF NOT EXISTS barber_services (
  barber_id INTEGER REFERENCES barbers(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (barber_id, service_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date_time ON bookings(booking_date, booking_time);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_barber_services_barber_id ON barber_services(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_services_service_id ON barber_services(service_id);
CREATE INDEX IF NOT EXISTS idx_sms_dnd_phone_number ON sms_dnd_numbers(phone_number);

-- Settings table for system configuration
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Barber availability table for custom schedules and time-off
CREATE TABLE IF NOT EXISTS barber_availability (
  id SERIAL PRIMARY KEY,
  barber_id INTEGER REFERENCES barbers(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT true,
  date_override DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(barber_id, day_of_week, start_time, date_override)
);

-- Audit logs for tracking critical actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blackout dates for shop-wide closures
CREATE TABLE IF NOT EXISTS blackout_dates (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  reason VARCHAR(255),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add new columns to existing tables
ALTER TABLE barbers ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_2h_sent BOOLEAN DEFAULT false;

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_barber_availability_barber ON barber_availability(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_availability_date ON barber_availability(date_override);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_blackout_dates_date ON blackout_dates(date);
`;

const seedData = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert services (unique set)
    const servicesData = [
      ['Haircut - Master Barber', 'Premium haircut by a master barber', 60, 30],
      ['Haircut - Senior Barber', 'Quality haircut by a senior barber', 50, 30],
      ['Buzz Cut', 'Classic buzz cut', 30, 30],
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

    // Map service names to IDs for later assignment to barbers
    const servicesRows = await client.query('SELECT id, name FROM services');
    const serviceIdsByName = {};
    servicesRows.rows.forEach(r => { serviceIdsByName[r.name] = r.id; });

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

    // Create sample barbers and assign services
    // Masters get all services; Seniors get all except 'Haircut - Master Barber'
    const masterBarbers = [
      { email: 'al@balkanbarbers.com', firstName: 'Al', lastName: 'Balkan', specialty: 'Master Barber', rating: 4.9 },
      { email: 'cynthia@balkanbarbers.com', firstName: 'Cynthia', lastName: 'Balkan', specialty: 'Master Barber - Shave Specialist', rating: 4.9 },
      { email: 'john@balkanbarbers.com', firstName: 'John', lastName: 'Balkan', specialty: 'Master Barber - Premium Cuts', rating: 4.8 },
      { email: 'nick@balkanbarbers.com', firstName: 'Nick', lastName: 'Balkan', specialty: 'Master Barber - Beard Expert', rating: 4.9 },
    ];

    const seniorBarbers = [
      { email: 'eric@balkanbarbers.com', firstName: 'Eric', lastName: 'Balkan', specialty: 'Senior Barber', rating: 4.7 },
      { email: 'riza@balkanbarbers.com', firstName: 'Riza', lastName: 'Balkan', specialty: 'Senior Barber - Classic Styles', rating: 4.7 },
    ];

    const defaultBarberPassword = await bcrypt.hash('Barber@123', 10);

    const assignServicesToBarber = async (barberId, isMaster) => {
      const allServiceNames = Object.keys(serviceIdsByName);
      let selectedNames;
      
      if (isMaster) {
        // Master barbers get: Master haircut + common services (NOT Senior haircut)
        selectedNames = allServiceNames.filter(name => name !== 'Haircut - Senior Barber');
      } else {
        // Senior barbers get: Senior haircut + common services (NOT Master haircut)
        selectedNames = allServiceNames.filter(name => name !== 'Haircut - Master Barber');
      }

      for (const name of selectedNames) {
        const sid = serviceIdsByName[name];
        if (sid) {
          await client.query(
            'INSERT INTO barber_services (barber_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [barberId, sid]
          );
        }
      }
    };

    // Insert masters
    for (const b of masterBarbers) {
      const userResult = await client.query(
        `INSERT INTO users (email, password, first_name, last_name, role, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [b.email, defaultBarberPassword, b.firstName, b.lastName, 'barber', true]
      );

      if (userResult.rows.length > 0) {
        const barberInsert = await client.query(
          'INSERT INTO barbers (user_id, specialty, rating) VALUES ($1, $2, $3) RETURNING id',
          [userResult.rows[0].id, b.specialty, b.rating]
        );
        await assignServicesToBarber(barberInsert.rows[0].id, true);
      }
    }

    // Insert seniors
    for (const b of seniorBarbers) {
      const userResult = await client.query(
        `INSERT INTO users (email, password, first_name, last_name, role, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [b.email, defaultBarberPassword, b.firstName, b.lastName, 'barber', true]
      );

      if (userResult.rows.length > 0) {
        const barberInsert = await client.query(
          'INSERT INTO barbers (user_id, specialty, rating) VALUES ($1, $2, $3) RETURNING id',
          [userResult.rows[0].id, b.specialty, b.rating]
        );
        await assignServicesToBarber(barberInsert.rows[0].id, false);
      }
    }

    // Add "Any Available" barber option with all services
    const anyAvailableCheck = await client.query(
      'SELECT id FROM barbers WHERE user_id IS NULL AND specialty LIKE $1',
      ['%Any Available%']
    );
    
    if (anyAvailableCheck.rows.length === 0) {
      const anyAvailableResult = await client.query(
        'INSERT INTO barbers (user_id, specialty, rating, is_available) VALUES ($1, $2, $3, $4) RETURNING id',
        [null, 'Any Available - Next available barber', null, true]
      );
      
      const anyAvailableBarberId = anyAvailableResult.rows[0].id;
      
      // Assign all services to Any Available
      const allServiceIds = Object.values(serviceIdsByName);
      for (const sid of allServiceIds) {
        await client.query(
          'INSERT INTO barber_services (barber_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [anyAvailableBarberId, sid]
        );
      }
    }

    // Insert default settings
    const defaultSettings = [
      ['business_hours_start', '10:00', 'Business opening time'],
      ['business_hours_end', '19:00', 'Business closing time'],
      ['booking_slot_duration', '30', 'Duration of each booking slot in minutes'],
      ['days_open', '[1,2,3,4,5,6]', 'Days of the week the business is open (0=Sunday, 6=Saturday)'],
      ['reminders_enabled', 'true', 'Enable automated booking reminders'],
      ['reminder_24h_enabled', 'true', 'Send reminder 24 hours before appointment'],
      ['reminder_2h_enabled', 'false', 'Send reminder 2 hours before appointment'],
      ['reminder_email_enabled', 'true', 'Send reminders via email'],
      ['reminder_sms_enabled', 'false', 'Send reminders via SMS'],
      ['reschedule_window_hours', '2', 'Minimum hours before appointment to allow rescheduling'],
      ['cancellation_window_hours', '2', 'Minimum hours before appointment to allow cancellation']
    ];

    for (const [key, value, description] of defaultSettings) {
      await client.query(
        `INSERT INTO settings (setting_key, setting_value, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (setting_key) DO NOTHING`,
        [key, value, description]
      );
    }

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
