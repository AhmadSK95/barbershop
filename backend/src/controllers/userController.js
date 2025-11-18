const pool = require('../config/database');
const { hashPassword } = require('../utils/auth');
const { validatePassword } = require('../utils/validation');

// @desc    Get all users (Admin)
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, phone, role, is_verified, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: {
        users: result.rows
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
};

// @desc    Get user by ID (Admin)
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, email, first_name, last_name, phone, role, is_verified, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user'
    });
  }
};

// @desc    Update user role (Admin)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'barber'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user role'
    });
  }
};

// @desc    Delete user (Admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user'
    });
  }
};

// @desc    Update own profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, first_name, last_name, phone, role, is_verified`,
      [firstName, lastName, phone, userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    // Validate new password strength
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError
      });
    }

    // Get current password
    const result = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );

    const user = result.rows[0];
    const { comparePassword } = require('../utils/auth');
    
    const isMatch = await comparePassword(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
};

// @desc    Get services
// @route   GET /api/services
// @access  Public
const getServices = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, price, duration FROM services WHERE is_active = true'
    );

    res.json({
      success: true,
      data: {
        services: result.rows
      }
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching services'
    });
  }
};

// @desc    Get addons
// @route   GET /api/addons
// @access  Public
const getAddons = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, price, duration FROM addons WHERE is_active = true'
    );

    res.json({
      success: true,
      data: {
        addons: result.rows
      }
    });
  } catch (error) {
    console.error('Get addons error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching addons'
    });
  }
};

// @desc    Get barbers
// @route   GET /api/barbers
// @access  Public
const getBarbers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, u.first_name, u.last_name, b.specialty, b.rating
       FROM barbers b
       JOIN users u ON b.user_id = u.id
       WHERE b.is_available = true`
    );

    res.json({
      success: true,
      data: {
        barbers: result.rows
      }
    });
  } catch (error) {
    console.error('Get barbers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching barbers'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  updateProfile,
  changePassword,
  getServices,
  getAddons,
  getBarbers
};
