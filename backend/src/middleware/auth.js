const { verifyToken } = require('../utils/auth');
const pool = require('../config/database');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or expired'
      });
    }

    // Get user from database
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, phone, role, is_verified FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Transform snake_case to camelCase for frontend
    const user = result.rows[0];
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      isVerified: user.is_verified
    };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
};

// Admin or Barber middleware
const adminOrBarber = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'barber')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin or barber access required.'
    });
  }
};

// Verified user middleware
const verifiedOnly = (req, res, next) => {
  if (req.user && req.user.is_verified) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Please verify your email address first'
    });
  }
};

// Generic authorize middleware - accepts multiple roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of: ${roles.join(', ')}`
      });
    }

    next();
  };
};

module.exports = {
  protect,
  adminOnly,
  adminOrBarber,
  verifiedOnly,
  authorize
};
