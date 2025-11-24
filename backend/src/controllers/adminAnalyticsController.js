const pool = require('../config/database');

// Export bookings to CSV
const exportBookingsCSV = async (req, res) => {
  try {
    const { startDate, endDate, status, barberId } = req.query;
    
    let query = `
      SELECT 
        b.id,
        b.booking_date,
        b.booking_time,
        b.status,
        b.total_price,
        b.created_at,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        u.email as customer_email,
        u.phone as customer_phone,
        s.name as service_name,
        barber_user.first_name as barber_first_name,
        barber_user.last_name as barber_last_name,
        b.notes
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN services s ON b.service_id = s.id
      LEFT JOIN barbers barber ON b.barber_id = barber.id
      LEFT JOIN users barber_user ON barber.user_id = barber_user.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (startDate) {
      query += ` AND b.booking_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND b.booking_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (barberId) {
      query += ` AND b.barber_id = $${paramIndex}`;
      params.push(barberId);
      paramIndex++;
    }
    
    query += ' ORDER BY b.booking_date DESC, b.booking_time DESC';
    
    const result = await pool.query(query, params);
    
    // Generate CSV
    const headers = [
      'Booking ID',
      'Date',
      'Time',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Barber',
      'Service',
      'Price',
      'Status',
      'Notes',
      'Booked At'
    ];
    
    let csv = headers.join(',') + '\n';
    
    result.rows.forEach(row => {
      const barberName = row.barber_first_name 
        ? `${row.barber_first_name} ${row.barber_last_name || ''}`
        : 'Any Available';
      
      const customerName = `${row.customer_first_name} ${row.customer_last_name}`;
      const notes = (row.notes || '').replace(/,/g, ';').replace(/\n/g, ' ');
      
      csv += [
        row.id,
        row.booking_date,
        row.booking_time,
        `"${customerName}"`,
        row.customer_email,
        row.customer_phone || '',
        `"${barberName}"`,
        `"${row.service_name || ''}"`,
        row.total_price,
        row.status,
        `"${notes}"`,
        new Date(row.created_at).toISOString()
      ].join(',') + '\n';
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=bookings_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export bookings'
    });
  }
};

// Get revenue analytics
const getRevenueAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    // Validate groupBy
    const validGroupBy = ['day', 'week', 'month'];
    if (!validGroupBy.includes(groupBy)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid groupBy parameter. Use: day, week, or month'
      });
    }
    
    // Default to last 30 days if no dates provided
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get revenue grouped by date
    let dateFormat;
    switch (groupBy) {
      case 'week':
        dateFormat = "TO_CHAR(DATE_TRUNC('week', booking_date), 'YYYY-MM-DD')";
        break;
      case 'month':
        dateFormat = "TO_CHAR(DATE_TRUNC('month', booking_date), 'YYYY-MM')";
        break;
      default: // day
        dateFormat = "booking_date::text";
    }
    
    const revenueQuery = `
      SELECT 
        ${dateFormat} as period,
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
        SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END) as revenue,
        SUM(CASE WHEN status = 'pending' THEN total_price ELSE 0 END) as pending_revenue
      FROM bookings
      WHERE booking_date >= $1 AND booking_date <= $2
      GROUP BY period
      ORDER BY period
    `;
    
    const revenueResult = await pool.query(revenueQuery, [start, end]);
    
    // Get total stats for the period
    const statsQuery = `
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
        SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END) as total_revenue,
        AVG(CASE WHEN status = 'completed' THEN total_price ELSE NULL END) as avg_booking_value
      FROM bookings
      WHERE booking_date >= $1 AND booking_date <= $2
    `;
    
    const statsResult = await pool.query(statsQuery, [start, end]);
    
    res.json({
      success: true,
      data: {
        period: {
          start,
          end,
          groupBy
        },
        revenueByPeriod: revenueResult.rows,
        summary: statsResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics'
    });
  }
};

// Get barber performance analytics
const getBarberPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const query = `
      SELECT 
        barber.id as barber_id,
        u.first_name,
        u.last_name,
        barber.specialty,
        COUNT(*) as total_bookings,
        SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
        SUM(CASE WHEN b.status = 'completed' THEN b.total_price ELSE 0 END) as revenue,
        AVG(CASE WHEN b.status = 'completed' THEN b.total_price ELSE NULL END) as avg_booking_value,
        ROUND(
          (SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END)::NUMERIC / 
           NULLIF(COUNT(*), 0) * 100), 
          2
        ) as completion_rate
      FROM bookings b
      JOIN barbers barber ON b.barber_id = barber.id
      LEFT JOIN users u ON barber.user_id = u.id
      WHERE b.booking_date >= $1 AND b.booking_date <= $2
      GROUP BY barber.id, u.first_name, u.last_name, barber.specialty
      ORDER BY revenue DESC
    `;
    
    const result = await pool.query(query, [start, end]);
    
    res.json({
      success: true,
      data: {
        period: { start, end },
        barbers: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching barber performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch barber performance'
    });
  }
};

// Get service popularity analytics
const getServiceAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const query = `
      SELECT 
        s.id,
        s.name,
        s.price,
        s.duration,
        COUNT(*) as total_bookings,
        SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN b.status = 'completed' THEN b.total_price ELSE 0 END) as revenue
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE b.booking_date >= $1 AND b.booking_date <= $2
      GROUP BY s.id, s.name, s.price, s.duration
      ORDER BY total_bookings DESC
    `;
    
    const result = await pool.query(query, [start, end]);
    
    res.json({
      success: true,
      data: {
        period: { start, end },
        services: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching service analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service analytics'
    });
  }
};

module.exports = {
  exportBookingsCSV,
  getRevenueAnalytics,
  getBarberPerformance,
  getServiceAnalytics
};
