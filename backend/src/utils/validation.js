// Input validation utilities

/**
 * Validate password strength
 * Requirements: 8+ chars, uppercase, lowercase, number, special char
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return 'Password is required';
  }
  
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one special character';
  }
  
  return null; // Valid
};

/**
 * Validate email format (basic regex)
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return 'Email is required';
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }
  
  if (email.length > 255) {
    return 'Email is too long';
  }
  
  return null; // Valid
};

/**
 * Validate phone number (allows various formats)
 * Supports: +1234567890, (123) 456-7890, 123-456-7890, etc.
 */
const validatePhone = (phone) => {
  if (!phone) {
    return null; // Phone is optional
  }
  
  if (typeof phone !== 'string') {
    return 'Invalid phone format';
  }
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return 'Phone number must be between 10-15 digits';
  }
  
  return null; // Valid
};

/**
 * Sanitize string input (trim and limit length)
 */
const sanitizeString = (str, maxLength = 255) => {
  if (!str || typeof str !== 'string') {
    return '';
  }
  
  return str.trim().slice(0, maxLength);
};

/**
 * Validate name (first name, last name)
 */
const validateName = (name, fieldName = 'Name') => {
  if (!name || typeof name !== 'string') {
    return `${fieldName} is required`;
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 2) {
    return `${fieldName} must be at least 2 characters`;
  }
  
  if (trimmed.length > 50) {
    return `${fieldName} is too long (max 50 characters)`;
  }
  
  // Only allow letters, spaces, hyphens, apostrophes
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return `${fieldName} contains invalid characters`;
  }
  
  return null; // Valid
};

module.exports = {
  validatePassword,
  validateEmail,
  validatePhone,
  sanitizeString,
  validateName
};
