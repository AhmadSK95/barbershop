const pool = require('../config/database');
const {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  generateRandomToken,
  hashToken
} = require('../utils/auth');
const {
  validatePassword,
  validateEmail,
  validatePhone,
  validateName,
  sanitizeString
} = require('../utils/validation');
// Use configured email service (AWS SES or SMTP/Gmail)
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyEmailIdentity
} = require('../utils/emailService');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const client = await pool.connect();
  try {
    let { email, password, firstName, lastName, phone, username, smsConsent } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName || !username) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (username, email, password, first name, last name)'
      });
    }

    // Validate email format
    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({
        success: false,
        message: emailError
      });
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError
      });
    }

    // Validate names
    const firstNameError = validateName(firstName, 'First name');
    if (firstNameError) {
      return res.status(400).json({
        success: false,
        message: firstNameError
      });
    }

    const lastNameError = validateName(lastName, 'Last name');
    if (lastNameError) {
      return res.status(400).json({
        success: false,
        message: lastNameError
      });
    }

    // Validate phone if provided
    if (phone) {
      const phoneError = validatePhone(phone);
      if (phoneError) {
        return res.status(400).json({
          success: false,
          message: phoneError
        });
      }
    }

    // Sanitize inputs
    email = sanitizeString(email, 255).toLowerCase();
    username = sanitizeString(username, 255).toLowerCase();
    firstName = sanitizeString(firstName, 50);
    lastName = sanitizeString(lastName, 50);
    if (phone) phone = sanitizeString(phone, 20);

    // Check if username exists
    const usernameExists = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [username.toLowerCase()]
    );

    if (usernameExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate verification token
    const verificationToken = generateRandomToken();
    const hashedVerificationToken = hashToken(verificationToken);

    // Create user
    const smsConsentValue = phone && smsConsent ? true : false;
    const smsConsentDateValue = smsConsentValue ? new Date() : null;
    
    const result = await client.query(
      `INSERT INTO users (username, email, password, first_name, last_name, phone, verification_token, sms_consent, sms_consent_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, username, email, first_name, last_name, role, is_verified`,
      [username.toLowerCase(), email.toLowerCase(), hashedPassword, firstName, lastName, phone, hashedVerificationToken, smsConsentValue, smsConsentDateValue]
    );

    const user = result.rows[0];

    // Verify user email in AWS SES (for sandbox mode) and send verification email
    try {
      // First, verify the email identity in AWS SES so we can send to it
      console.log(`Verifying email identity in AWS SES: ${email}`);
      await verifyEmailIdentity(email);
      console.log(`✅ AWS SES verification request sent to ${email}`);
      
      // Then send the verification email
      await sendVerificationEmail(email, firstName, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails - user can still use the app
    }

    // Generate tokens
    const accessToken = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await client.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isVerified: user.is_verified
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  } finally {
    client.release();
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const client = await pool.connect();
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    // Get user (support both username and email for backward compatibility)
    const result = await client.query(
      'SELECT id, username, email, password, first_name, last_name, phone, role, is_verified FROM users WHERE username = $1 OR email = $1',
      [username.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Check password
    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const accessToken = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await client.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role,
          isVerified: user.is_verified
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  } finally {
    client.release();
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res) => {
  const client = await pool.connect();
  try {
    const { token } = req.params;
    const hashedToken = hashToken(token);

    // Find user with this verification token
    const result = await client.query(
      'SELECT id FROM users WHERE verification_token = $1 AND is_verified = false',
      [hashedToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Update user
    await client.query(
      'UPDATE users SET is_verified = true, verification_token = NULL WHERE id = $1',
      [result.rows[0].id]
    );

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification'
    });
  } finally {
    client.release();
  }
};

// @desc    Forgot password - send reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address'
      });
    }

    // Get user
    const result = await client.query(
      'SELECT id, email, first_name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always return success even if user doesn't exist (security best practice)
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      });
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = generateRandomToken();
    const hashedResetToken = hashToken(resetToken);
    const resetExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token
    await client.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expire = $2 WHERE id = $3',
      [hashedResetToken, resetExpire, user.id]
    );

    // Send email
    try {
      await sendPasswordResetEmail(user.email, user.first_name, resetToken);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email'
      });
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing password reset request'
    });
  } finally {
    client.release();
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  const client = await pool.connect();
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide new password'
      });
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError
      });
    }

    const hashedToken = hashToken(token);

    // Find user with valid reset token
    const result = await client.query(
      'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expire > NOW()',
      [hashedToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password and clear reset token
    await client.query(
      'UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expire = NULL WHERE id = $2',
      [hashedPassword, result.rows[0].id]
    );

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  } finally {
    client.release();
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshAccessToken = async (req, res) => {
  const client = await pool.connect();
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Check if refresh token exists in database
    const result = await client.query(
      'SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found or expired'
      });
    }

    // Generate new access token
    const accessToken = generateToken(decoded.id, decoded.role);

    res.json({
      success: true,
      data: {
        accessToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error refreshing token'
    });
  } finally {
    client.release();
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  const client = await pool.connect();
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Delete refresh token from database
      await client.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  } finally {
    client.release();
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user data'
    });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  logout,
  getMe
};
