# Admin LLM Assistant - Integration Plan

**Status**: Pre-Implementation Analysis  
**Author**: Staff Engineer - Claude  
**Date**: January 20, 2026  
**Mode**: NON-DESTRUCTIVE EXTENSION ONLY

---

## 📋 Executive Summary

This document outlines the integration plan for adding a **local LLM-powered data assistant** to the admin dashboard. The assistant will answer admin questions by querying PostgreSQL data through **safe, templated, read-only endpoints**.

**Core Principle**: Zero modification to existing auth, booking, or payment flows. Purely additive under new namespace `/api/admin/assistant/*`.

---

## 🔍 Current Architecture Analysis

### ✅ Patterns Identified

#### 1. **Express MVC Structure**
- **Routes** → **Controllers** → **Database Pool**
- Example: `adminAnalyticsRoutes.js` → `adminAnalyticsController.js` → `pool.query()`
- All admin routes use `protect` + `adminOnly` middleware chain

#### 2. **Database Access Pattern**
```javascript
// From adminAnalyticsController.js:118-197
const getRevenueAnalytics = async (req, res) => {
  // 1. Validate/default query params
  const end = endDate || new Date().toISOString().split('T')[0];
  const start = startDate || new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
  
  // 2. Build parameterized query
  const query = `SELECT ... FROM bookings WHERE booking_date >= $1 AND booking_date <= $2`;
  
  // 3. Execute with params array
  const result = await pool.query(query, [start, end]);
  
  // 4. Return structured response
  res.json({ success: true, data: { period: {...}, summary: result.rows[0] } });
}
```

**Key Patterns**:
- Parameterized queries (no string interpolation)
- Default date ranges (last 30 days)
- Structured JSON responses with `success` + `data`
- Error handling with 500 status

#### 3. **Rate Limiting**
```javascript
// From rateLimiter.js
const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 100 });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20 });
const passwordResetLimiter = rateLimit({ windowMs: 60*60*1000, max: 3 });
```

**Storage**: In-memory (note: resets on restart, no cross-instance coordination)

#### 4. **Audit Logging Pattern**
```javascript
// From auditLogger.js:4-14
const logAudit = async (userId, action, entityType, entityId, details, ipAddress, userAgent) => {
  await pool.query(`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [userId, action, entityType, entityId, JSON.stringify(details), ipAddress, userAgent]);
};
```

**Usage**: Middleware wraps `res.json()` to log after success

#### 5. **Admin Middleware Chain**
```javascript
// From adminAnalyticsRoutes.js:11-12
router.use(protect, adminOnly);
```

**Flow**: JWT verification → user role check → controller

---

## 🏗️ Proposed Architecture

### **Component Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                      Admin Dashboard UI                      │
│   New Tab: "Assistant" with chat interface component        │
└────────────────────┬────────────────────────────────────────┘
                     │ POST /api/admin/assistant/query
                     │ { question: string, reveal_pii?: bool }
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Backend: assistantController.js (NEW)                │
│  1. Auth check (protect + adminOnly)                         │
│  2. Rate limit check (stricter: 10/min)                      │
│  3. Audit log interaction                                    │
│  4. Call Local LLM service                                   │
│  5. LLM returns tool calls                                   │
│  6. Execute safe tools (metric templates)                    │
│  7. Return formatted response                                │
└────────────────────┬────────────────────────────────────────┘
                     │
      ┌──────────────┴──────────────┐
      ▼                             ▼
┌──────────────────┐    ┌───────────────────────┐
│  Local Ollama    │    │  Safe Tool Functions  │
│  (Docker)        │    │  (NEW utility file)   │
│  - mistral:7b    │    │  - run_metric()       │
│  - Tool-calling  │    │  - get_schema()       │
│    format        │    │  - run_sql_readonly() │
└──────────────────┘    └───────────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  PostgreSQL  │
                        │  (read-only) │
                        └──────────────┘
```

---

## 📦 New Files to Create

### 1. Backend Files

```
backend/
├── src/
│   ├── controllers/
│   │   └── assistantController.js         (NEW - main logic)
│   ├── routes/
│   │   └── assistantRoutes.js             (NEW - /api/admin/assistant/*)
│   ├── utils/
│   │   ├── assistantTools.js              (NEW - safe DB queries)
│   │   ├── assistantSafety.js             (NEW - SQL validation)
│   │   └── ollamaClient.js                (NEW - LLM HTTP client)
│   └── middleware/
│       └── assistantRateLimiter.js        (NEW - strict limiter)
└── services/
    └── ollama/
        └── docker-compose.ollama.yml      (NEW - local model)
```

### 2. Frontend Files

```
src/
├── pages/
│   └── AdminPage.js                       (MODIFY - add Assistant tab)
├── components/
│   ├── AssistantChat.js                   (NEW - chat UI)
│   └── AssistantMessage.js                (NEW - message display)
└── services/
    └── api.js                             (MODIFY - add assistantAPI)
```

---

## 🛡️ Safety Mechanisms

### **SQL Validation Rules** (assistantSafety.js)

```javascript
const SQL_VALIDATION = {
  // 1. Keyword blocking
  BLOCKED_KEYWORDS: /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|EXEC|EXECUTE)\b/i,
  
  // 2. Allowed patterns
  ALLOWED_PATTERN: /^(WITH\s+\w+\s+AS\s+\()?\s*SELECT\b/i,
  
  // 3. Multi-statement detection
  MULTI_STATEMENT: /;\s*\w/,
  
  // 4. Comment detection
  COMMENTS: /(--|\/\*|\*\/)/,
  
  // 5. Max complexity
  MAX_JOINS: 5,
  MAX_WHERE_CONDITIONS: 10,
  DEFAULT_LIMIT: 200,
  MAX_LIMIT: 500
};

const validateSQL = (sql) => {
  // Normalize whitespace
  const normalized = sql.trim().replace(/\s+/g, ' ');
  
  // Check blocked keywords
  if (SQL_VALIDATION.BLOCKED_KEYWORDS.test(normalized)) {
    throw new Error('Query contains prohibited operations');
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
  
  // Enforce LIMIT
  if (!/LIMIT\s+\d+/i.test(normalized)) {
    return `${normalized} LIMIT ${SQL_VALIDATION.DEFAULT_LIMIT}`;
  }
  
  return normalized;
};
```

### **PII Masking** (assistantTools.js)

```javascript
const maskPII = (rows, reveal_pii = false) => {
  if (reveal_pii) return rows; // Admin explicitly requested
  
  return rows.map(row => ({
    ...row,
    email: row.email ? maskEmail(row.email) : null,
    phone: row.phone ? maskPhone(row.phone) : null,
    contact_email: row.contact_email ? maskEmail(row.contact_email) : null
  }));
};

const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
};

const maskPhone = (phone) => {
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
};
```

---

## 🎯 Metric Templates (MVP Approach)

### **Preferred Path: Predefined Queries**

Instead of free-form text-to-SQL, start with **metric templates** that cover 90% of admin questions:

```javascript
// assistantTools.js
const METRIC_TEMPLATES = {
  'bookings_by_status': {
    query: `
      SELECT status, COUNT(*) as count, SUM(total_price) as revenue
      FROM bookings
      WHERE booking_date >= $1 AND booking_date <= $2
      GROUP BY status
      ORDER BY count DESC
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: 'last_30_days', endDate: 'today' }
  },
  
  'top_barbers': {
    query: `
      SELECT 
        u.first_name, u.last_name,
        COUNT(*) as bookings,
        SUM(CASE WHEN b.status='completed' THEN b.total_price ELSE 0 END) as revenue
      FROM barbers barber
      JOIN users u ON barber.user_id = u.id
      JOIN bookings b ON b.barber_id = barber.id
      WHERE b.booking_date >= $1 AND b.booking_date <= $2
      GROUP BY barber.id, u.first_name, u.last_name
      ORDER BY revenue DESC
      LIMIT $3
    `,
    params: ['startDate', 'endDate', 'limit'],
    defaults: { startDate: 'last_30_days', endDate: 'today', limit: 10 }
  },
  
  'payment_summary': {
    query: `
      SELECT 
        payment_status,
        COUNT(*) as bookings,
        SUM(payment_amount) as total_paid,
        COUNT(DISTINCT stripe_customer_id) as unique_customers
      FROM bookings
      WHERE booking_date >= $1 AND booking_date <= $2
        AND stripe_customer_id IS NOT NULL
      GROUP BY payment_status
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: 'last_30_days', endDate: 'today' }
  },
  
  'no_show_rate': {
    query: `
      SELECT 
        COUNT(*) FILTER (WHERE no_show = true) as no_shows,
        COUNT(*) as total_bookings,
        ROUND(COUNT(*) FILTER (WHERE no_show = true)::numeric / 
              NULLIF(COUNT(*), 0) * 100, 2) as no_show_rate_pct
      FROM bookings
      WHERE booking_date >= $1 AND booking_date <= $2
        AND status = 'completed'
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: 'last_30_days', endDate: 'today' }
  },
  
  'service_popularity': {
    query: `
      SELECT 
        s.name,
        COUNT(*) as bookings,
        SUM(CASE WHEN b.status='completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN b.status='completed' THEN b.total_price ELSE 0 END) as revenue
      FROM services s
      JOIN bookings b ON b.service_id = s.id
      WHERE b.booking_date >= $1 AND b.booking_date <= $2
      GROUP BY s.id, s.name
      ORDER BY bookings DESC
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: 'last_30_days', endDate: 'today' }
  },
  
  'reminder_effectiveness': {
    query: `
      SELECT 
        COUNT(*) FILTER (WHERE reminder_24h_sent = true) as sent_24h,
        COUNT(*) FILTER (WHERE reminder_2h_sent = true) as sent_2h,
        COUNT(*) FILTER (WHERE reminder_24h_sent = true AND status='completed') as completed_after_24h,
        COUNT(*) FILTER (WHERE reminder_24h_sent = true AND status='cancelled') as cancelled_after_24h
      FROM bookings
      WHERE booking_date >= $1 AND booking_date <= $2
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: 'last_30_days', endDate: 'today' }
  },
  
  'revenue_trends': {
    query: `
      SELECT 
        DATE_TRUNC('day', booking_date) as date,
        COUNT(*) as bookings,
        SUM(CASE WHEN status='completed' THEN total_price ELSE 0 END) as revenue
      FROM bookings
      WHERE booking_date >= $1 AND booking_date <= $2
      GROUP BY DATE_TRUNC('day', booking_date)
      ORDER BY date
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: 'last_30_days', endDate: 'today' }
  },
  
  'audit_summary': {
    query: `
      SELECT 
        action,
        COUNT(*) as occurrences,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(created_at) as last_occurred
      FROM audit_logs
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY action
      ORDER BY occurrences DESC
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: 'last_7_days', endDate: 'now' }
  },
  
  'user_growth': {
    query: `
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as new_users,
        COUNT(*) FILTER (WHERE role='user') as customers,
        COUNT(*) FILTER (WHERE role='barber') as barbers
      FROM users
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: 'last_30_days', endDate: 'now' }
  },
  
  'cancellation_patterns': {
    query: `
      SELECT 
        EXTRACT(HOUR FROM created_at - (booking_date + booking_time::time)) as hours_before,
        COUNT(*) as cancellations
      FROM bookings
      WHERE status = 'cancelled'
        AND booking_date >= $1 AND booking_date <= $2
      GROUP BY hours_before
      ORDER BY cancellations DESC
    `,
    params: ['startDate', 'endDate'],
    defaults: { startDate: 'last_30_days', endDate: 'today' }
  }
};
```

### **LLM's Job**: Map natural language to metric name + param extraction

**Example Flow**:
```
User: "What's my no-show rate this month?"
LLM: { tool: "run_metric", metric: "no_show_rate", startDate: "2026-01-01", endDate: "2026-01-31" }
Backend: Execute template → Return: { no_shows: 12, total_bookings: 145, no_show_rate_pct: 8.28 }
LLM: Format as: "Your no-show rate for January 2026 is 8.28% (12 no-shows out of 145 bookings)"
```

---

## 🔧 Implementation Steps

### **Phase 1: Infrastructure (Day 1)**

1. **Add Ollama Docker Service**
   ```bash
   # backend/docker-compose.ollama.yml
   services:
     ollama:
       image: ollama/ollama:latest
       container_name: barbershop_ollama
       volumes:
         - ollama_data:/root/.ollama
       ports:
         - "11434:11434"
       networks:
         - barbershop_network
       command: serve
       deploy:
         resources:
           reservations:
             devices:
               - driver: nvidia
                 count: 1
                 capabilities: [gpu]  # Optional: if GPU available
   
   volumes:
     ollama_data:
   
   networks:
     barbershop_network:
       external: true
   ```

2. **Pull Model**
   ```bash
   docker exec barbershop_ollama ollama pull mistral:7b-instruct
   ```

3. **Test LLM**
   ```bash
   curl http://localhost:11434/api/generate -d '{
     "model": "mistral:7b-instruct",
     "prompt": "You are a data assistant. What tables would you query to find top barbers?",
     "stream": false
   }'
   ```

### **Phase 2: Backend Core (Day 2-3)**

1. **Create Safety Utilities** (`assistantSafety.js`)
2. **Create Tool Functions** (`assistantTools.js`)
3. **Create Ollama Client** (`ollamaClient.js`)
4. **Create Controller** (`assistantController.js`)
5. **Create Routes** (`assistantRoutes.js`)
6. **Add Rate Limiter** (`assistantRateLimiter.js`)
7. **Wire into app.js**

### **Phase 3: Frontend (Day 4)**

1. **Add API methods** to `api.js`
2. **Create chat component** (`AssistantChat.js`)
3. **Add tab to AdminPage** (modify existing)
4. **Test end-to-end**

### **Phase 4: Testing & Safety (Day 5)**

1. **Unit tests** for SQL validation
2. **Integration tests** for metric templates
3. **Prompt injection tests**
4. **PII leak tests**
5. **Rate limit tests**

---

## 📝 Audit Logging Spec

Every assistant interaction must log:

```javascript
// Example audit_logs entry
{
  user_id: 1,  // Admin user
  action: 'assistant.query',
  entity_type: 'assistant',
  entity_id: null,
  details: {
    request_id: 'uuid-v4',
    question: 'What is my revenue this month?',
    tools_used: ['run_metric:revenue_trends'],
    latency_ms: 342,
    result_rows: 30,
    pii_revealed: false,
    timestamp: '2026-01-20T15:49:16Z'
  },
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0...',
  created_at: '2026-01-20T15:49:16Z'
}
```

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **SQL injection via LLM hallucination** | Multi-layer validation: regex blocking, parameterized queries only, whitelist table/column names |
| **Prompt injection** | System message emphasizes "NEVER execute user-provided SQL directly", tools enforce schema |
| **PII exfiltration** | Default masking, explicit confirmation step to reveal PII (logged in audit) |
| **Performance impact** | Query timeout (2s), rate limiting (10/min), LIMIT enforcement |
| **Memory exhaustion** | Ollama resource limits in docker-compose, backend request timeout |
| **Cross-site attacks** | Reuse existing CORS + Helmet, no direct user input to SQL |
| **Model hallucination** | Response includes confidence score, data sources, assumptions |

---

## 🚀 Rollout Plan

### **MVP Scope (Launch Ready)**
- ✅ 10 metric templates covering 80% of admin questions
- ✅ Audit logging for all interactions
- ✅ PII masking by default
- ✅ Rate limiting (10 queries/min per admin)
- ✅ SQL safety validation
- ✅ Simple chat UI in admin dashboard
- ✅ Ollama running locally (no external LLM calls)

### **Post-MVP Enhancements**
- Text-to-SQL fallback (with extra validation)
- Schema documentation search
- Multi-turn conversations (session context)
- Export to CSV/PDF
- Scheduled reports
- Alert suggestions

---

## 🎯 Success Criteria

**Before Merge**:
1. ✅ Zero changes to existing routes/controllers
2. ✅ All new code behind `/api/admin/assistant/*`
3. ✅ Auth middleware chain intact
4. ✅ Audit logs working
5. ✅ SQL injection tests pass
6. ✅ PII masking tests pass
7. ✅ Prompt injection tests pass
8. ✅ Rate limiting enforced

**Post-Deploy**:
1. Admin can ask "What's my revenue?" and get accurate answer
2. No performance degradation on existing endpoints
3. Audit logs capture all queries
4. Zero security incidents

---

## 📚 Next Steps

1. **Review this plan** with team
2. **Approve architecture** decisions
3. **Begin Phase 1** (Ollama setup)
4. **Iterate on metric templates** (add shop-specific questions)
5. **Deploy to staging** for internal testing
6. **Launch to production** behind feature flag

---

**Estimated Timeline**: 5 days development + 2 days testing = 1 week to launch MVP

**Dependencies**:
- Ollama Docker image
- PostgreSQL read-only role (create: `GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user`)
- Settings table entry: `assistant_enabled = true`

**Non-Goals** (out of scope for MVP):
- Writing to database (always read-only)
- External LLM APIs (local only)
- Customer-facing assistant (admin only)
- Multi-language support

---

**Document Status**: Ready for Implementation  
**Approval Required From**: Lead Engineer, Security Review

