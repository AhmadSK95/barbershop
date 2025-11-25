const pool = require('../config/database');

// Get audit logs with filters
const getAuditLogs = async (req, res) => {
  try {
    const {
      userId,
      action,
      entityType,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;
    
    let query = `
      SELECT 
        al.id,
        al.user_id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.details,
        al.ip_address,
        al.user_agent,
        al.created_at,
        u.email as user_email,
        u.first_name || ' ' || u.last_name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (userId) {
      query += ` AND al.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }
    
    if (action) {
      query += ` AND al.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }
    
    if (entityType) {
      query += ` AND al.entity_type = $${paramIndex}`;
      params.push(entityType);
      paramIndex++;
    }
    
    if (startDate) {
      query += ` AND al.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND al.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    query += ` ORDER BY al.created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs al
      WHERE 1=1
    `;
    
    const countParams = [];
    let countIndex = 1;
    
    if (userId) {
      countQuery += ` AND al.user_id = $${countIndex}`;
      countParams.push(userId);
      countIndex++;
    }
    
    if (action) {
      countQuery += ` AND al.action = $${countIndex}`;
      countParams.push(action);
      countIndex++;
    }
    
    if (entityType) {
      countQuery += ` AND al.entity_type = $${countIndex}`;
      countParams.push(entityType);
      countIndex++;
    }
    
    if (startDate) {
      countQuery += ` AND al.created_at >= $${countIndex}`;
      countParams.push(startDate);
      countIndex++;
    }
    
    if (endDate) {
      countQuery += ` AND al.created_at <= $${countIndex}`;
      countParams.push(endDate);
      countIndex++;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: {
        logs: result.rows,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
};

// Get audit log statistics
const getAuditStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE created_at BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE created_at >= $1';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = 'WHERE created_at <= $1';
      params.push(endDate);
    }
    
    const stats = await pool.query(`
      SELECT 
        action,
        COUNT(*) as count
      FROM audit_logs
      ${dateFilter}
      GROUP BY action
      ORDER BY count DESC
    `, params);
    
    const entityStats = await pool.query(`
      SELECT 
        entity_type,
        COUNT(*) as count
      FROM audit_logs
      ${dateFilter}
      GROUP BY entity_type
      ORDER BY count DESC
    `, params);
    
    const topUsers = await pool.query(`
      SELECT 
        al.user_id,
        u.email,
        u.first_name || ' ' || u.last_name as name,
        COUNT(*) as action_count
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${dateFilter}
      GROUP BY al.user_id, u.email, u.first_name, u.last_name
      ORDER BY action_count DESC
      LIMIT 10
    `, params);
    
    res.json({
      success: true,
      data: {
        actionStats: stats.rows,
        entityStats: entityStats.rows,
        topUsers: topUsers.rows
      }
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit statistics'
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditStats
};
