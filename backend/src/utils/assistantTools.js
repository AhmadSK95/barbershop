const pool = require('../config/database');
const { parseDateShortcut, maskPII, validateSQL, SQL_VALIDATION } = require('./assistantSafety');

// Allowed tables for schema queries
const ALLOWED_TABLES = [
  'users', 'barbers', 'services', 'addons', 'bookings', 'booking_addons',
  'barber_services', 'refresh_tokens', 'settings', 'barber_availability',
  'audit_logs', 'blackout_dates', 'ratings', 'sms_dnd_numbers', 'payments'
];

/**
 * Predefined metric templates for common admin questions
 * Safer than free-form SQL generation
 */
const METRIC_TEMPLATES = {
  bookings_by_status: {
    description: 'Count and revenue by booking status',
    query: `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total_price) as revenue,
        ROUND(AVG(total_price), 2) as avg_price
      FROM bookings
      WHERE booking_date >= $1 AND booking_date <= $2
      GROUP BY status
      ORDER BY count DESC
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: '2025-11-01', endDate: 'today' }
  },

  top_barbers: {
    description: 'Top performing barbers by bookings and revenue',
    query: `
      SELECT 
        u.first_name,
        u.last_name,
        barber.specialty,
        COUNT(*) as total_bookings,
        SUM(CASE WHEN b.status='completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN b.status='completed' THEN b.total_price ELSE 0 END) as revenue,
        ROUND(AVG(CASE WHEN b.status='completed' THEN b.total_price ELSE NULL END), 2) as avg_booking_value
      FROM barbers barber
      JOIN users u ON barber.user_id = u.id
      JOIN bookings b ON b.barber_id = barber.id
      WHERE b.booking_date >= $1 AND b.booking_date <= $2
      GROUP BY barber.id, u.first_name, u.last_name, barber.specialty
      ORDER BY revenue DESC
      LIMIT $3
    `,
    params: ['startDate', 'endDate', 'limit'],
    defaults: { startDate: '2025-11-01', endDate: 'today', limit: 10 }
  },

  payment_summary: {
    description: 'Payment status summary and metrics',
    query: `
      SELECT 
        payment_status,
        COUNT(*) as bookings,
        SUM(payment_amount) as total_paid,
        COUNT(DISTINCT stripe_customer_id) as unique_customers,
        ROUND(AVG(payment_amount), 2) as avg_payment
      FROM bookings
      WHERE booking_date >= $1 AND booking_date <= $2
        AND stripe_customer_id IS NOT NULL
      GROUP BY payment_status
      ORDER BY bookings DESC
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: '2025-11-01', endDate: 'today' }
  },

  no_show_rate:
    description: 'No-show rate calculation',
    query: `
      SELECT 
        COUNT(*) FILTER (WHERE no_show = true) as no_shows,
        COUNT(*) as total_completed,
        ROUND(
          COUNT(*) FILTER (WHERE no_show = true)::numeric / 
          NULLIF(COUNT(*), 0) * 100,
          2
        ) as no_show_rate_pct
      FROM bookings
      WHERE booking_date >= $1 AND booking_date <= $2
        AND status = 'completed'
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: '2025-11-01', endDate: 'today' }
  },

  service_popularity:
    description: 'Most popular services by bookings',
    query: `
      SELECT 
        s.name,
        s.price,
        COUNT(*) as total_bookings,
        SUM(CASE WHEN b.status='completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN b.status='cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN b.status='completed' THEN b.total_price ELSE 0 END) as revenue
      FROM services s
      JOIN bookings b ON b.service_id = s.id
      WHERE b.booking_date >= $1 AND b.booking_date <= $2
      GROUP BY s.id, s.name, s.price
      ORDER BY total_bookings DESC
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: '2025-11-01', endDate: 'today' }
  },

  reminder_effectiveness:
    description: 'Email reminder effectiveness metrics',
    query: `
      SELECT 
        COUNT(*) FILTER (WHERE reminder_24h_sent = true) as sent_24h,
        COUNT(*) FILTER (WHERE reminder_2h_sent = true) as sent_2h,
        COUNT(*) FILTER (WHERE reminder_24h_sent = true AND status='completed') as completed_after_24h,
        COUNT(*) FILTER (WHERE reminder_24h_sent = true AND status='cancelled') as cancelled_after_24h,
        COUNT(*) FILTER (WHERE reminder_24h_sent = true AND no_show = true) as no_show_after_24h,
        ROUND(
          COUNT(*) FILTER (WHERE reminder_24h_sent = true AND status='completed')::numeric /
          NULLIF(COUNT(*) FILTER (WHERE reminder_24h_sent = true), 0) * 100,
          2
        ) as completion_rate_pct
      FROM bookings
      WHERE booking_date >= $1 AND booking_date <= $2
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: '2025-11-01', endDate: 'today' }
  },

  revenue_trends:
    description: 'Daily revenue trends',
    query: `
      SELECT 
        booking_date as date,
        COUNT(*) as bookings,
        SUM(CASE WHEN status='completed' THEN total_price ELSE 0 END) as revenue,
        SUM(CASE WHEN status='pending' THEN total_price ELSE 0 END) as pending_revenue
      FROM bookings
      WHERE booking_date >= $1 AND booking_date <= $2
      GROUP BY booking_date
      ORDER BY booking_date
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: '2025-11-01', endDate: 'today' }
  },

  audit_summary:
    description: 'Audit log summary by action type',
    query: `
      SELECT 
        action,
        COUNT(*) as occurrences,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(created_at) as last_occurred
      FROM audit_logs
      WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp
      GROUP BY action
      ORDER BY occurrences DESC
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: 'last_7_days', endDate: 'now' }
  },

  user_growth: {
    description: 'New user registration trends',
    query: `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users,
        COUNT(*) FILTER (WHERE role='user') as customers,
        COUNT(*) FILTER (WHERE role='barber') as barbers,
        COUNT(*) FILTER (WHERE is_verified = true) as verified
      FROM users
      WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp
      GROUP BY DATE(created_at)
      ORDER BY date
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: 'last_30_days', endDate: 'now' }
  },

  cancellation_patterns: {
    description: 'When customers typically cancel bookings',
    query: `
      SELECT 
        EXTRACT(HOUR FROM (booking_date + booking_time) - created_at)::integer as hours_before,
        COUNT(*) as cancellations
      FROM bookings
      WHERE status = 'cancelled'
        AND booking_date >= $1 AND booking_date <= $2
      GROUP BY hours_before
      HAVING hours_before >= 0
      ORDER BY cancellations DESC
      LIMIT 20
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: '2025-11-01', endDate: 'today' }
  },

  peak_hours:
    description: 'Most popular booking times',
    query: `
      SELECT 
        EXTRACT(HOUR FROM booking_time)::integer as hour,
        COUNT(*) as bookings,
        ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percentage
      FROM bookings
      WHERE booking_date >= $1 AND booking_date <= $2
        AND status != 'cancelled'
      GROUP BY hour
      ORDER BY bookings DESC
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: '2025-11-01', endDate: 'today' }
  },

  ratings_summary: {
    description: 'Rating statistics by barber',
    query: `
      SELECT 
        u.first_name,
        u.last_name,
        COUNT(*) as total_ratings,
        ROUND(AVG(r.rating), 2) as avg_rating,
        COUNT(*) FILTER (WHERE r.rating = 5) as five_star,
        COUNT(*) FILTER (WHERE r.rating = 4) as four_star,
        COUNT(*) FILTER (WHERE r.rating <= 3) as three_or_less
      FROM ratings r
      JOIN barbers b ON r.barber_id = b.id
      JOIN users u ON b.user_id = u.id
      WHERE r.created_at >= $1::timestamp AND r.created_at <= $2::timestamp
      GROUP BY b.id, u.first_name, u.last_name
      ORDER BY avg_rating DESC
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: 'last_90_days', endDate: 'now' }
  }
};

/**
 * Execute a predefined metric template
 * @param {string} metricName - Name of metric from METRIC_TEMPLATES
 * @param {Object} params - Parameter values
 * @param {boolean} revealPII - Whether to show PII
 * @returns {Promise<Object>} - Query result with metadata
 */
const runMetric = async (metricName, params = {}, revealPII = false) => {
  const template = METRIC_TEMPLATES[metricName];
  
  if (!template) {
    throw new Error(`Unknown metric: ${metricName}. Available: ${Object.keys(METRIC_TEMPLATES).join(', ')}`);
  }

  // Parse parameters with defaults
  const resolvedParams = [];
  for (const paramName of template.params) {
    let value = params[paramName] || template.defaults[paramName];
    
    // Parse date shortcuts
    if (paramName.includes('Date') || paramName.includes('date')) {
      value = parseDateShortcut(value);
    }
    
    resolvedParams.push(value);
  }

  // Execute query with timeout
  const startTime = Date.now();
  const result = await pool.query(template.query, resolvedParams);
  const latency = Date.now() - startTime;

  // Mask PII if needed
  const rows = maskPII(result.rows, revealPII);

  return {
    metric: metricName,
    description: template.description,
    rows,
    rowCount: rows.length,
    params: Object.fromEntries(template.params.map((p, i) => [p, resolvedParams[i]])),
    latency,
    piiMasked: !revealPII
  };
};

/**
 * Get database schema snapshot (cached)
 * @returns {Promise<Object>} - Schema information
 */
const getSchemaSnapshot = async () => {
  const query = `
    SELECT 
      table_name,
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY($1)
    ORDER BY table_name, ordinal_position
  `;

  const result = await pool.query(query, [ALLOWED_TABLES]);
  
  const schema = {};
  for (const row of result.rows) {
    if (!schema[row.table_name]) {
      schema[row.table_name] = [];
    }
    schema[row.table_name].push({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES'
    });
  }

  return {
    tables: ALLOWED_TABLES,
    schema,
    metricTemplates: Object.keys(METRIC_TEMPLATES)
  };
};

/**
 * Execute a custom read-only SQL query (with validation)
 * Use with extreme caution - prefer metric templates
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @param {boolean} revealPII - Whether to show PII
 * @returns {Promise<Object>} - Query result
 */
const runSQLReadonly = async (sql, params = [], revealPII = false) => {
  // Validate SQL
  const validatedSQL = validateSQL(sql);
  
  // Execute with timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Query timeout')), SQL_VALIDATION.QUERY_TIMEOUT_MS);
  });

  const queryPromise = pool.query(validatedSQL, params);
  const startTime = Date.now();
  
  const result = await Promise.race([queryPromise, timeoutPromise]);
  const latency = Date.now() - startTime;

  // Mask PII
  const rows = maskPII(result.rows, revealPII);

  return {
    rows,
    rowCount: rows.length,
    latency,
    piiMasked: !revealPII,
    query: validatedSQL
  };
};

/**
 * List available metrics for the LLM
 * @returns {Array<Object>} - Metric descriptions
 */
const listMetrics = () => {
  return Object.entries(METRIC_TEMPLATES).map(([name, template]) => ({
    name,
    description: template.description,
    params: template.params,
    defaults: template.defaults
  }));
};

module.exports = {
  METRIC_TEMPLATES,
  ALLOWED_TABLES,
  runMetric,
  getSchemaSnapshot,
  runSQLReadonly,
  listMetrics
};
