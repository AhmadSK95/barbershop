const pool = require('../config/database');

// Get all barbers
const getAllBarbers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.id,
        u.first_name,
        u.last_name,
        u.email,
        u.username,
        u.contact_email,
        u.phone,
        b.specialty,
        b.rating,
        b.is_available as is_active,
        u.created_at,
        COALESCE(
          json_agg(
            json_build_object('id', s.id, 'name', s.name) 
            ORDER BY s.name
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) as services
      FROM barbers b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN barber_services bs ON b.id = bs.barber_id
      LEFT JOIN services s ON bs.service_id = s.id
      WHERE u.role = 'barber'
      GROUP BY b.id, u.first_name, u.last_name, u.email, u.username, u.contact_email, u.phone, b.specialty, b.rating, b.is_available, u.created_at
      ORDER BY u.first_name
    `);
    
    res.json({
      success: true,
      data: { barbers: result.rows }
    });
  } catch (error) {
    console.error('Error fetching barbers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch barbers'
    });
  }
};

// Create a new barber
const createBarber = async (req, res) => {
  const { username, firstName, lastName, email, password, specialty, rating, serviceIds, contactEmail } = req.body;
  
  if (!username || !firstName || !lastName || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username, first name, last name, email, and password are required'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const userResult = await client.query(`
      INSERT INTO users (username, first_name, last_name, email, contact_email, password, role, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6, 'barber', true)
      RETURNING id
    `, [username.toLowerCase(), firstName, lastName, email, contactEmail || email, hashedPassword]);
    
    const userId = userResult.rows[0].id;
    
    // Create barber entry
    const barberResult = await client.query(`
      INSERT INTO barbers (user_id, specialty, rating, is_available)
      VALUES ($1, $2, $3, true)
      RETURNING id
    `, [userId, specialty || 'Barber', rating || 5.0]);
    
    const barberId = barberResult.rows[0].id;
    
    // Assign services if provided
    if (serviceIds && serviceIds.length > 0) {
      for (const serviceId of serviceIds) {
        await client.query(
          'INSERT INTO barber_services (barber_id, service_id) VALUES ($1, $2)',
          [barberId, serviceId]
        );
      }
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      data: { barber: { id: barberId, user_id: userId } },
      message: 'Barber created successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating barber:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create barber'
    });
  } finally {
    client.release();
  }
};

// Update a barber
const updateBarber = async (req, res) => {
  const { id } = req.params; // This is barber.id
  const { firstName, lastName, contactEmail, specialty, rating, isActive, serviceIds } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get user_id for this barber
    const barberCheck = await client.query('SELECT user_id FROM barbers WHERE id = $1', [id]);
    if (barberCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Barber not found'
      });
    }
    const userId = barberCheck.rows[0].user_id;
    
    // Update user info
    if (firstName || lastName || contactEmail) {
      await client.query(`
        UPDATE users
        SET first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            contact_email = COALESCE($3, contact_email)
        WHERE id = $4
      `, [firstName, lastName, contactEmail, userId]);
    }
    
    // Update barber info
    await client.query(`
      UPDATE barbers
      SET specialty = COALESCE($1, specialty),
          rating = COALESCE($2, rating),
          is_available = COALESCE($3, is_available)
      WHERE id = $4
    `, [specialty, rating, isActive, id]);
    
    // Update services if provided
    if (serviceIds !== undefined) {
      // Remove old services
      await client.query('DELETE FROM barber_services WHERE barber_id = $1', [id]);
      
      // Add new services
      if (serviceIds && serviceIds.length > 0) {
        for (const serviceId of serviceIds) {
          await client.query(
            'INSERT INTO barber_services (barber_id, service_id) VALUES ($1, $2)',
            [id, serviceId]
          );
        }
      }
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Barber updated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating barber:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update barber'
    });
  } finally {
    client.release();
  }
};

// Delete a barber
const deleteBarber = async (req, res) => {
  const { id } = req.params; // This is barber.id
  
  try {
    // Check if barber has any bookings
    const bookingsCheck = await pool.query(
      'SELECT COUNT(*) FROM bookings WHERE barber_id = $1',
      [id]
    );
    
    if (parseInt(bookingsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete barber with existing bookings. Consider deactivating instead.'
      });
    }
    
    // Get user_id and delete (cascade will handle barbers and barber_services)
    const barberResult = await pool.query(
      'SELECT user_id FROM barbers WHERE id = $1',
      [id]
    );
    
    if (barberResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Barber not found'
      });
    }
    
    const userId = barberResult.rows[0].user_id;
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    
    res.json({
      success: true,
      message: 'Barber deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting barber:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete barber'
    });
  }
};

// Get all services
const getAllServices = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, price, duration, is_active, created_at
      FROM services
      ORDER BY name
    `);
    
    res.json({
      success: true,
      data: { services: result.rows }
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services'
    });
  }
};

// Create a new service
const createService = async (req, res) => {
  const { name, description, price, duration } = req.body;
  
  if (!name || !price || !duration) {
    return res.status(400).json({
      success: false,
      message: 'Name, price, and duration are required'
    });
  }

  try {
    const result = await pool.query(`
      INSERT INTO services (name, description, price, duration, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id, name, description, price, duration, is_active, created_at
    `, [name, description || '', price, duration]);
    
    res.status(201).json({
      success: true,
      data: { service: result.rows[0] },
      message: 'Service created successfully'
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create service'
    });
  }
};

// Update a service
const updateService = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, duration, isActive } = req.body;
  
  try {
    const result = await pool.query(`
      UPDATE services
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          duration = COALESCE($4, duration),
          is_active = COALESCE($5, is_active)
      WHERE id = $6
      RETURNING id, name, description, price, duration, is_active, created_at
    `, [name, description, price, duration, isActive, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    res.json({
      success: true,
      data: { service: result.rows[0] },
      message: 'Service updated successfully'
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service'
    });
  }
};

// Delete a service
const deleteService = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if service has any bookings
    const bookingsCheck = await pool.query(
      'SELECT COUNT(*) FROM bookings WHERE service_id = $1',
      [id]
    );
    
    if (parseInt(bookingsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete service with existing bookings. Consider deactivating instead.'
      });
    }
    
    const result = await pool.query(
      'DELETE FROM services WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete service'
    });
  }
};

// Get availability settings
const getAvailabilitySettings = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, setting_key, setting_value, description, created_at, updated_at
      FROM settings
      WHERE setting_key IN ('business_hours_start', 'business_hours_end', 'booking_slot_duration', 'days_open')
      ORDER BY setting_key
    `);
    
    res.json({
      success: true,
      data: { settings: result.rows }
    });
  } catch (error) {
    console.error('Error fetching availability settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch availability settings'
    });
  }
};

// Update availability settings
const updateAvailabilitySettings = async (req, res) => {
  const { businessHoursStart, businessHoursEnd, bookingSlotDuration, daysOpen } = req.body;
  
  try {
    const updates = [];
    
    if (businessHoursStart) {
      updates.push(pool.query(`
        INSERT INTO settings (setting_key, setting_value, description)
        VALUES ('business_hours_start', $1, 'Business opening time')
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      `, [businessHoursStart]));
    }
    
    if (businessHoursEnd) {
      updates.push(pool.query(`
        INSERT INTO settings (setting_key, setting_value, description)
        VALUES ('business_hours_end', $1, 'Business closing time')
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      `, [businessHoursEnd]));
    }
    
    if (bookingSlotDuration) {
      updates.push(pool.query(`
        INSERT INTO settings (setting_key, setting_value, description)
        VALUES ('booking_slot_duration', $1, 'Duration of each booking slot in minutes')
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      `, [bookingSlotDuration.toString()]));
    }
    
    if (daysOpen) {
      updates.push(pool.query(`
        INSERT INTO settings (setting_key, setting_value, description)
        VALUES ('days_open', $1, 'Days of the week the business is open')
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      `, [JSON.stringify(daysOpen)]));
    }
    
    await Promise.all(updates);
    
    res.json({
      success: true,
      message: 'Availability settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating availability settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update availability settings'
    });
  }
};

// Get barber availability
const getBarberAvailability = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ba.id, ba.barber_id, ba.day_of_week, ba.start_time, ba.end_time, ba.is_available,
             u.first_name, u.last_name
      FROM barber_availability ba
      JOIN users u ON ba.barber_id = u.id
      WHERE u.role = 'barber'
      ORDER BY u.first_name, ba.day_of_week, ba.start_time
    `);
    
    res.json({
      success: true,
      data: { availability: result.rows }
    });
  } catch (error) {
    console.error('Error fetching barber availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch barber availability'
    });
  }
};

// Update barber availability
const updateBarberAvailability = async (req, res) => {
  const { barberId, dayOfWeek, startTime, endTime, isAvailable } = req.body;
  
  if (!barberId || dayOfWeek === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Barber ID and day of week are required'
    });
  }

  try {
    const result = await pool.query(`
      INSERT INTO barber_availability (barber_id, day_of_week, start_time, end_time, is_available)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (barber_id, day_of_week, start_time)
      DO UPDATE SET end_time = $4, is_available = $5
      RETURNING id, barber_id, day_of_week, start_time, end_time, is_available
    `, [barberId, dayOfWeek, startTime || '10:00', endTime || '19:00', isAvailable !== false]);
    
    res.json({
      success: true,
      data: { availability: result.rows[0] },
      message: 'Barber availability updated successfully'
    });
  } catch (error) {
    console.error('Error updating barber availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update barber availability'
    });
  }
};

module.exports = {
  getAllBarbers,
  createBarber,
  updateBarber,
  deleteBarber,
  getAllServices,
  createService,
  updateService,
  deleteService,
  getAvailabilitySettings,
  updateAvailabilitySettings,
  getBarberAvailability,
  updateBarberAvailability
};
