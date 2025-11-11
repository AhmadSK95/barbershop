const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const cleanupAndReseed = async () => {
  const client = await pool.connect();
  try {
    console.log('🧹 Starting database cleanup...');
    await client.query('BEGIN');

    // Delete all data (cascading will handle related records)
    console.log('Deleting old data...');
    await client.query('DELETE FROM barber_services');
    await client.query('DELETE FROM booking_addons');
    await client.query('DELETE FROM bookings');
    await client.query('DELETE FROM refresh_tokens');
    await client.query('DELETE FROM barbers');
    await client.query('DELETE FROM addons');
    await client.query('DELETE FROM services');
    await client.query('DELETE FROM users WHERE role != $1', ['admin']); // Keep admin

    console.log('✅ Old data deleted');

    // Insert unique services
    console.log('🔄 Inserting unique services...');
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
        'INSERT INTO services (name, description, price, duration) VALUES ($1, $2, $3, $4)',
        service
      );
    }
    console.log('✅ Services inserted');

    // Insert add-ons
    console.log('🔄 Inserting add-ons...');
    const addonsData = [
      ['Beard Trim (Straight Razor NOT included)', 20, 15],
      ['Shave', 0, 15]
    ];

    for (const addon of addonsData) {
      await client.query(
        'INSERT INTO addons (name, price, duration) VALUES ($1, $2, $3)',
        addon
      );
    }
    console.log('✅ Add-ons inserted');

    // Map service names to IDs
    const servicesRows = await client.query('SELECT id, name FROM services');
    const serviceIdsByName = {};
    servicesRows.rows.forEach(r => { serviceIdsByName[r.name] = r.id; });

    // Create barbers with services
    console.log('🔄 Creating barbers...');
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
      const selectedNames = isMaster
        ? allServiceNames
        : allServiceNames.filter(name => name !== 'Haircut - Master Barber');

      for (const name of selectedNames) {
        const sid = serviceIdsByName[name];
        if (sid) {
          await client.query(
            'INSERT INTO barber_services (barber_id, service_id) VALUES ($1, $2)',
            [barberId, sid]
          );
        }
      }
    };

    // Insert master barbers
    for (const b of masterBarbers) {
      const userResult = await client.query(
        `INSERT INTO users (email, password, first_name, last_name, role, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [b.email, defaultBarberPassword, b.firstName, b.lastName, 'barber', true]
      );

      const barberInsert = await client.query(
        'INSERT INTO barbers (user_id, specialty, rating) VALUES ($1, $2, $3) RETURNING id',
        [userResult.rows[0].id, b.specialty, b.rating]
      );
      await assignServicesToBarber(barberInsert.rows[0].id, true);
      console.log(`✅ Created master barber: ${b.email}`);
    }

    // Insert senior barbers
    for (const b of seniorBarbers) {
      const userResult = await client.query(
        `INSERT INTO users (email, password, first_name, last_name, role, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [b.email, defaultBarberPassword, b.firstName, b.lastName, 'barber', true]
      );

      const barberInsert = await client.query(
        'INSERT INTO barbers (user_id, specialty, rating) VALUES ($1, $2, $3) RETURNING id',
        [userResult.rows[0].id, b.specialty, b.rating]
      );
      await assignServicesToBarber(barberInsert.rows[0].id, false);
      console.log(`✅ Created senior barber: ${b.email}`);
    }

    // Add "Any Available" barber option
    await client.query(
      'INSERT INTO barbers (user_id, specialty, rating) VALUES ($1, $2, $3)',
      [null, 'Next available barber', null]
    );
    console.log('✅ Created "Any Available" barber');

    await client.query('COMMIT');
    console.log('\n✅ Database cleanup and reseed complete!');
    console.log('\n📊 Summary:');
    console.log('- 8 unique services');
    console.log('- 2 add-ons');
    console.log('- 4 master barbers (all services)');
    console.log('- 2 senior barbers (all except Master Haircut)');
    console.log('\n🔑 Barber Credentials:');
    console.log('All barbers: password = Barber@123');
    
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    client.release();
  }
};

cleanupAndReseed();
