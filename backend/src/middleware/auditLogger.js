const pool = require('../config/database');

// Log audit event to database
const logAudit = async (userId, action, entityType, entityId, details, ipAddress, userAgent) => {
  try {
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [userId, action, entityType, entityId, JSON.stringify(details), ipAddress, userAgent]);
  } catch (error) {
    console.error('Error logging audit event:', error);
    // Don't throw - audit logging failure shouldn't break the request
  }
};

// Middleware to log authentication events
const logAuthEvent = (action) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    // Only log if response was successful
    if (data.success) {
      const userId = req.user?.id || (data.data?.user?.id) || null;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || 'Unknown';
      
      const details = {
        email: req.body.email || req.user?.email,
        timestamp: new Date().toISOString()
      };
      
      // For password changes, don't log the password
      if (action === 'password_changed' || action === 'password_reset') {
        details.method = action.includes('reset') ? 'reset_token' : 'current_password';
      }
      
      logAudit(userId, action, 'auth', userId, details, ipAddress, userAgent);
    }
    
    return originalJson(data);
  };
  
  next();
};

// Middleware to log booking events
const logBookingEvent = (action) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    if (data.success) {
      const userId = req.user?.id;
      const bookingId = req.params.id || data.data?.booking?.id;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || 'Unknown';
      
      const details = {
        bookingId,
        timestamp: new Date().toISOString()
      };
      
      // Include relevant request body data (sanitized)
      if (action === 'booking_created') {
        details.serviceId = req.body.serviceId;
        details.barberId = req.body.barberId;
        details.bookingDate = req.body.bookingDate;
        details.bookingTime = req.body.bookingTime;
      } else if (action === 'booking_updated' || action === 'booking_rescheduled') {
        details.changes = {
          newDate: req.body.newDate,
          newTime: req.body.newTime,
          status: req.body.status
        };
      } else if (action === 'booking_cancelled') {
        details.reason = req.body.reason;
        details.status = 'cancelled';
      }
      
      logAudit(userId, action, 'booking', bookingId, details, ipAddress, userAgent);
    }
    
    return originalJson(data);
  };
  
  next();
};

// Middleware to log role changes
const logRoleChange = async (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    if (data.success && req.body.role) {
      const adminUserId = req.user?.id;
      const targetUserId = req.params.id;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || 'Unknown';
      
      const details = {
        targetUserId,
        newRole: req.body.role,
        changedBy: adminUserId,
        timestamp: new Date().toISOString()
      };
      
      logAudit(adminUserId, 'role_changed', 'user', targetUserId, details, ipAddress, userAgent);
    }
    
    return originalJson(data);
  };
  
  next();
};

// Middleware to log config changes
const logConfigChange = (entityType) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    if (data.success) {
      const userId = req.user?.id;
      const entityId = req.params.id || data.data?.id;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || 'Unknown';
      
      let action = 'config_updated';
      if (req.method === 'POST') action = `${entityType}_created`;
      else if (req.method === 'DELETE') action = `${entityType}_deleted`;
      else if (req.method === 'PUT' || req.method === 'PATCH') action = `${entityType}_updated`;
      
      const details = {
        entityId,
        method: req.method,
        body: req.body,
        timestamp: new Date().toISOString()
      };
      
      logAudit(userId, action, entityType, entityId, details, ipAddress, userAgent);
    }
    
    return originalJson(data);
  };
  
  next();
};

module.exports = {
  logAuthEvent,
  logBookingEvent,
  logRoleChange,
  logConfigChange
};
