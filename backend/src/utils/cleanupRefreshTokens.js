const pool = require('../config/database');

/**
 * Clean up expired refresh tokens from database
 * Should be run periodically (e.g. via cron job)
 */
const cleanupExpiredTokens = async () => {
  try {
    console.log('🧹 Starting refresh token cleanup...');
    
    const result = await pool.query(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW() RETURNING id'
    );
    
    const deletedCount = result.rowCount || 0;
    console.log(`✅ Cleaned up ${deletedCount} expired refresh token(s)`);
    
    return { success: true, deletedCount };
  } catch (error) {
    console.error('❌ Error cleaning up refresh tokens:', error);
    return { success: false, error: error.message };
  }
};

// If run directly (not imported)
if (require.main === module) {
  (async () => {
    await cleanupExpiredTokens();
    process.exit(0);
  })();
}

module.exports = { cleanupExpiredTokens };
