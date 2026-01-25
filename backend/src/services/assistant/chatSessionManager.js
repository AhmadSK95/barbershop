/**
 * Chat Session Manager
 * Manages conversation history and context per session
 * In-memory storage with 30-minute timeout
 */

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MAX_MESSAGES_PER_SESSION = 20; // Keep last 20 messages

// In-memory session storage
// In production, consider Redis or database
const sessions = new Map();

class ChatSession {
  constructor(sessionId, userId) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.messages = [];
    this.context = {
      lastDateRange: null,
      lastBarber: null,
      preferences: {}
    };
    this.createdAt = Date.now();
    this.lastActivityAt = Date.now();
  }

  addMessage(role, content, toolCalls = null, toolResults = null) {
    const message = {
      role, // 'user', 'assistant', 'tool'
      content,
      toolCalls,
      toolResults,
      timestamp: Date.now()
    };

    this.messages.push(message);
    this.lastActivityAt = Date.now();

    // Keep only last N messages
    if (this.messages.length > MAX_MESSAGES_PER_SESSION) {
      this.messages = this.messages.slice(-MAX_MESSAGES_PER_SESSION);
    }

    return message;
  }

  getMessages() {
    return this.messages;
  }

  getConversationHistory() {
    // Format for OpenAI API
    return this.messages
      .filter(m => m.role !== 'tool') // Tool results handled separately
      .map(m => ({
        role: m.role,
        content: m.content || '',
        ...(m.toolCalls && { tool_calls: m.toolCalls })
      }));
  }

  updateContext(updates) {
    this.context = { ...this.context, ...updates };
    this.lastActivityAt = Date.now();
  }

  getContext() {
    return this.context;
  }

  isExpired() {
    return Date.now() - this.lastActivityAt > SESSION_TIMEOUT_MS;
  }

  touch() {
    this.lastActivityAt = Date.now();
  }
}

/**
 * Get or create session
 * @param {string} sessionId 
 * @param {number} userId 
 * @returns {ChatSession}
 */
function getSession(sessionId, userId) {
  // Clean up expired sessions periodically
  cleanupExpiredSessions();

  if (sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    
    // Verify user owns this session
    if (session.userId !== userId) {
      throw new Error('Unauthorized access to session');
    }

    if (session.isExpired()) {
      sessions.delete(sessionId);
      // Create new session
      const newSession = new ChatSession(sessionId, userId);
      sessions.set(sessionId, newSession);
      return newSession;
    }

    session.touch();
    return session;
  }

  // Create new session
  const session = new ChatSession(sessionId, userId);
  sessions.set(sessionId, session);
  return session;
}

/**
 * Delete a session
 * @param {string} sessionId 
 */
function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (session.isExpired()) {
      sessions.delete(sessionId);
    }
  }
}

/**
 * Get session statistics
 * @returns {Object}
 */
function getStats() {
  return {
    activeSessions: sessions.size,
    sessions: Array.from(sessions.values()).map(s => ({
      sessionId: s.sessionId,
      userId: s.userId,
      messageCount: s.messages.length,
      createdAt: new Date(s.createdAt).toISOString(),
      lastActivityAt: new Date(s.lastActivityAt).toISOString(),
      age: Math.floor((Date.now() - s.createdAt) / 1000) + 's'
    }))
  };
}

// Cleanup expired sessions every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

module.exports = {
  getSession,
  deleteSession,
  getStats,
  SESSION_TIMEOUT_MS
};
