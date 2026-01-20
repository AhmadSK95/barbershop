const SQL_VALIDATION = {
  // Blocked keywords that could modify data
  BLOCKED_KEYWORDS: /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|EXEC|EXECUTE|CALL|REPLACE|MERGE|COPY)\b/i,
  
  // Must start with SELECT or WITH...SELECT
  ALLOWED_PATTERN: /^(WITH\s+\w+\s+AS\s+\()?\s*SELECT\b/i,
  
  // Block multi-statement (prevent SQL injection)
  MULTI_STATEMENT: /;\s*\w/,
  
  // Block comments (can hide malicious code)
  COMMENTS: /(--)|(\/)|(\*)|(#)/,
  
  // Complexity limits
  MAX_JOINS: 5,
  DEFAULT_LIMIT: 200,
  MAX_LIMIT: 1000,
  QUERY_TIMEOUT_MS: 5000
};

/**
 * Validate SQL query for safety
 * @param {string} sql - SQL query to validate
 * @returns {string} - Validated and normalized SQL
 * @throws {Error} - If query is unsafe
 */
const validateSQL = (sql) => {
  if (!sql || typeof sql !== 'string') {
    throw new Error('SQL query must be a non-empty string');
  }

  // Normalize whitespace
  const normalized = sql.trim().replace(/\s+/g, ' ');

  // Check blocked keywords
  if (SQL_VALIDATION.BLOCKED_KEYWORDS.test(normalized)) {
    throw new Error('Query contains prohibited operations (INSERT/UPDATE/DELETE/etc)');
  }

  // Ensure SELECT-only
  if (!SQL_VALIDATION.ALLOWED_PATTERN.test(normalized)) {
    throw new Error('Only SELECT queries are allowed');
  }

  // Block multi-statement
  if (SQL_VALIDATION.MULTI_STATEMENT.test(normalized)) {
    throw new Error('Multi-statement queries not allowed');
  }

  // Block comments
  if (SQL_VALIDATION.COMMENTS.test(normalized)) {
    throw new Error('SQL comments not allowed');
  }

  // Check JOIN complexity
  const joinCount = (normalized.match(/\bJOIN\b/gi) || []).length;
  if (joinCount > SQL_VALIDATION.MAX_JOINS) {
    throw new Error(`Too many JOINs (max ${SQL_VALIDATION.MAX_JOINS})`);
  }

  // Enforce LIMIT
  if (!/LIMIT\s+\d+/i.test(normalized)) {
    return `${normalized} LIMIT ${SQL_VALIDATION.DEFAULT_LIMIT}`;
  }

  // Check LIMIT isn't too high
  const limitMatch = normalized.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    const limit = parseInt(limitMatch[1]);
    if (limit > SQL_VALIDATION.MAX_LIMIT) {
      throw new Error(`LIMIT too high (max ${SQL_VALIDATION.MAX_LIMIT})`);
    }
  }

  return normalized;
};

/**
 * Validate table/column names against allowed schema
 * @param {string} sql - SQL query
 * @param {Array<string>} allowedTables - Whitelist of table names
 * @returns {boolean}
 */
const validateTableNames = (sql, allowedTables) => {
  // Extract table names from FROM and JOIN clauses
  const tablePattern = /(?:FROM|JOIN)\s+(\w+)/gi;
  const matches = [...sql.matchAll(tablePattern)];
  
  for (const match of matches) {
    const tableName = match[1].toLowerCase();
    if (!allowedTables.includes(tableName)) {
      throw new Error(`Table '${tableName}' is not in allowed list`);
    }
  }
  
  return true;
};

/**
 * Parse date range shortcuts
 * @param {string} dateStr - Date string or shortcut
 * @returns {string} - ISO date string
 */
const parseDateShortcut = (dateStr) => {
  if (!dateStr) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  switch (dateStr.toLowerCase()) {
    case 'today':
      return today.toISOString().split('T')[0];
    
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    
    case 'last_7_days':
      const last7 = new Date(today);
      last7.setDate(last7.getDate() - 7);
      return last7.toISOString().split('T')[0];
    
    case 'last_30_days':
      const last30 = new Date(today);
      last30.setDate(last30.getDate() - 30);
      return last30.toISOString().split('T')[0];
    
    case 'last_90_days':
      const last90 = new Date(today);
      last90.setDate(last90.getDate() - 90);
      return last90.toISOString().split('T')[0];
    
    case 'this_month':
      return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    
    case 'last_month':
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return lastMonth.toISOString().split('T')[0];
    
    case 'this_year':
      return new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
    
    case 'now':
      return new Date().toISOString();
    
    default:
      // Validate ISO date format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      throw new Error(`Invalid date format: ${dateStr}`);
  }
};

/**
 * Sanitize query result to remove sensitive data
 * @param {Array} rows - Query result rows
 * @param {boolean} revealPII - Whether to show PII
 * @returns {Array} - Sanitized rows
 */
const maskPII = (rows, revealPII = false) => {
  if (revealPII || !Array.isArray(rows)) {
    return rows;
  }
  
  return rows.map(row => {
    const masked = { ...row };
    
    // Mask email addresses
    if (masked.email) {
      masked.email = maskEmail(masked.email);
    }
    if (masked.contact_email) {
      masked.contact_email = maskEmail(masked.contact_email);
    }
    if (masked.customer_email) {
      masked.customer_email = maskEmail(masked.customer_email);
    }
    
    // Mask phone numbers
    if (masked.phone) {
      masked.phone = maskPhone(masked.phone);
    }
    if (masked.customer_phone) {
      masked.customer_phone = maskPhone(masked.customer_phone);
    }
    
    // Never show full card numbers (even if revealPII is true)
    if (masked.stripe_payment_method_id) {
      delete masked.stripe_payment_method_id;
    }
    if (masked.stripe_customer_id) {
      delete masked.stripe_customer_id;
    }
    
    return masked;
  });
};

/**
 * Mask email address
 * @param {string} email
 * @returns {string}
 */
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
};

/**
 * Mask phone number
 * @param {string} phone
 * @returns {string}
 */
const maskPhone = (phone) => {
  if (!phone) return phone;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return '***';
  return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
};

module.exports = {
  SQL_VALIDATION,
  validateSQL,
  validateTableNames,
  parseDateShortcut,
  maskPII,
  maskEmail,
  maskPhone
};
