# Pre-Launch Safety Checklist

**Purpose**: Critical items to address before production launch  
**Priority**: Must be completed to avoid 2am pages  
**Date**: January 20, 2026

---

## 🔴 CRITICAL (Must Fix Before Launch)

### 1. SSL/HTTPS Configuration ⚠️ SECURITY RISK

**Current State**: Application running on HTTP only (port 80, no encryption)  
**Risk**: Credentials, JWT tokens, PII transmitted in plaintext  
**AWS Instance**: http://44.200.206.94 (no HTTPS)

**Action Required**:
```bash
# SSH to EC2
ssh -i barbershop-key.pem ubuntu@44.200.206.94

# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate (requires domain)
# Option A: If you have a domain
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Option B: If using IP only (not recommended)
# Use self-signed cert for now:
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/nginx-selfsigned.key \
  -out /etc/ssl/certs/nginx-selfsigned.crt

# Update nginx to force HTTPS
sudo nano /etc/nginx/sites-available/default
# Add:
# server {
#     listen 80;
#     return 301 https://$host$request_uri;
# }
# server {
#     listen 443 ssl;
#     ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
#     ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
#     ...
# }

sudo nginx -t
sudo systemctl reload nginx
```

**Estimated Time**: 30 minutes  
**Owner**: DevOps/Admin  
**Status**: ❌ NOT DONE

---

### 2. Default Password Changes ⚠️ SECURITY RISK

**Current State**: Seed data passwords still active in production  
**Exposed Credentials**:
- Admin: `admin@barbershop.com` / `Admin@123456`
- Barbers: 6 accounts with `Barber123!`

**Action Required**:
```bash
# SSH to server
ssh -i barbershop-key.pem ubuntu@44.200.206.94

# Connect to database
docker exec -it barbershop_postgres psql -U barbershop_user -d barbershop_db

# Generate secure bcrypt hashes locally first:
# In Node.js:
# const bcrypt = require('bcryptjs');
# bcrypt.hash('NEW_SECURE_PASSWORD', 10).then(hash => console.log(hash));

# Update admin password
UPDATE users 
SET password = '$2a$10$NEW_HASH_HERE'
WHERE email = 'admin@barbershop.com';

# Update barber passwords
UPDATE users 
SET password = '$2a$10$NEW_HASH_HERE'
WHERE role = 'barber';

# Verify
SELECT email, role FROM users WHERE role IN ('admin', 'barber');
```

**Alternative**: Use the update script:
```bash
cd /home/ubuntu/barbershop/backend
node src/config/update-barber-passwords.js
```

**Estimated Time**: 15 minutes  
**Owner**: Admin  
**Status**: ❌ NOT DONE

---

### 3. Email Configuration ⚠️ FUNCTIONAL ISSUE

**Current State**: Placeholder email credentials (demo@example.com / demo)  
**Impact**: No booking confirmations, no password resets, no reminders

**Action Required**:
```bash
# SSH to server
ssh -i barbershop-key.pem ubuntu@44.200.206.94
cd /home/ubuntu/barbershop

# Edit .env
nano .env

# Update these variables:
EMAIL_SERVICE=gmail  # or 'ses' for AWS SES
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-barbershop@gmail.com
EMAIL_PASSWORD=your-16-char-app-password  # NOT regular password
EMAIL_FROM=noreply@barbershop.com
ROOT_EMAIL=admin@barbershop.com

# For Gmail:
# 1. Go to Google Account → Security
# 2. Enable 2FA
# 3. Create App Password (select "Mail" + "Other")
# 4. Use 16-character password (e.g., "abcd efgh ijkl mnop")

# Restart backend
docker compose restart backend

# Test email
cd backend
node test-email-booking.js
```

**Estimated Time**: 20 minutes  
**Owner**: Admin  
**Status**: ❌ NOT DONE

---

### 4. Domain Setup (Recommended) ⚠️ PRODUCTION READINESS

**Current State**: Using raw IP address (44.200.206.94)  
**Impact**: Unprofessional, can't get valid SSL cert, hard to remember

**Action Required**:
```bash
# Option A: Buy domain (recommended)
# 1. Purchase domain (GoDaddy, Namecheap, Route53)
# 2. Point A record to 44.200.206.94
# 3. Wait for DNS propagation (5-60 minutes)
# 4. Run Certbot (see SSL section above)

# Option B: Use AWS subdomain
# 1. Go to Route 53 → Hosted Zones
# 2. Create subdomain: barbershop.your-main-domain.com
# 3. Add A record → 44.200.206.94
# 4. Update .env FRONTEND_URL
# 5. Run Certbot with subdomain
```

**Estimated Time**: 1-2 hours (including DNS propagation)  
**Owner**: Admin/DevOps  
**Status**: ❌ NOT DONE

---

## 🟡 HIGH PRIORITY (Fix Within Week 1)

### 5. JWT Token Storage ⚠️ SECURITY CONCERN

**Current Issue**: Access tokens in localStorage (XSS vulnerability)  
**Current TTL**: 7 days (too long for access token)

**Recommendation**:
```javascript
// Ideal: Move to httpOnly cookies
// File: backend/src/controllers/authController.js

// In login/register responses:
res.cookie('accessToken', accessToken, {
  httpOnly: true,
  secure: true,  // HTTPS only
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000  // 15 minutes
});

res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
});

// Update auth middleware to read from cookies
// File: backend/src/middleware/auth.js
const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
```

**Quick Fix** (if can't do cookies now):
```javascript
// Shorten access token TTL
// File: backend/.env
JWT_EXPIRE=15m  # Instead of 7d
JWT_REFRESH_EXPIRE=7d  # Keep this
```

**Estimated Time**: 2-4 hours for cookie implementation, 5 minutes for TTL fix  
**Owner**: Backend Developer  
**Status**: ⚠️ WORKAROUND POSSIBLE

---

### 6. Scheduler Reliability ⚠️ OPERATIONAL RISK

**Current Issue**: In-memory dedupe Set (resets on restart, no multi-instance support)  
**Impact**: Could double-send reminders or miss reminders on crash

**Files**:
- `backend/services/scheduler.js:6` - `const sentReminders = new Set();`

**Recommendation**:
```javascript
// Make DB the source of truth
// File: backend/services/scheduler.js

const send24HourReminders = async () => {
  const result = await pool.query(`
    SELECT ... FROM bookings
    WHERE booking_date = $1
      AND status IN ('pending', 'confirmed')
      AND reminder_24h_sent IS NOT TRUE  -- This is the guard
    FOR UPDATE SKIP LOCKED  -- Prevent race conditions
  `, [tomorrow]);
  
  for (const booking of result.rows) {
    try {
      await sendEmail(...);
      
      // Mark IMMEDIATELY after send
      await pool.query(
        'UPDATE bookings SET reminder_24h_sent = TRUE WHERE id = $1',
        [booking.id]
      );
    } catch (error) {
      console.error(`Failed reminder for booking ${booking.id}:`, error);
      // Don't mark as sent - will retry next run
    }
  }
};

// Remove in-memory Set entirely
```

**Alternative**: Add unique constraint:
```sql
-- Idempotency table approach
CREATE TABLE reminder_sent_log (
  booking_id INTEGER REFERENCES bookings(id),
  reminder_type VARCHAR(20),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (booking_id, reminder_type)
);

-- Query checks this table before sending
```

**Estimated Time**: 1-2 hours  
**Owner**: Backend Developer  
**Status**: ⚠️ WORKAROUND EXISTS (DB flags)

---

### 7. Rate Limiting Storage ⚠️ SCALABILITY ISSUE

**Current Issue**: In-memory rate limiter (resets on restart, no multi-instance coordination)  
**File**: `backend/src/middleware/rateLimiter.js` (uses express-rate-limit default)

**Impact**:
- Rate limits reset on deployment/crash
- Won't work if you scale to 2+ instances

**Recommendation**:
```bash
# Add Redis for rate limit storage
docker-compose.yml:
  redis:
    image: redis:7-alpine
    container_name: barbershop_redis
    ports:
      - "6379:6379"
    networks:
      - barbershop_network
```

```javascript
// Update rate limiters
// File: backend/src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:'
  })
});
```

**Quick Fix** (single instance):
- Document: "Rate limits reset on deployment"
- Add monitoring alert if restart frequency > 1/day

**Estimated Time**: 2 hours for Redis, 0 minutes for workaround  
**Owner**: DevOps  
**Status**: ⚠️ ACCEPTABLE FOR MVP

---

### 8. Database Backup Validation ⚠️ DATA SAFETY

**Current Setup**: S3 bucket exists (`barbershop-app-1762358356`)  
**Issue**: No documented restore procedure

**Action Required**:
```bash
# Test restore on staging DB
# 1. Create backup
ssh -i barbershop-key.pem ubuntu@44.200.206.94
docker exec barbershop_postgres pg_dump -U barbershop_user barbershop_db > backup_test.sql

# 2. Upload to S3
aws s3 cp backup_test.sql s3://barbershop-app-1762358356/backups/

# 3. Restore to test instance
docker exec -i barbershop_postgres psql -U barbershop_user -d barbershop_db_test < backup_test.sql

# 4. Verify data integrity
docker exec barbershop_postgres psql -U barbershop_user -d barbershop_db_test \
  -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM bookings;"

# 5. Document procedure
```

**Automation** (recommended):
```bash
# Add to crontab on EC2
0 2 * * * /home/ubuntu/barbershop/scripts/backup-to-s3.sh

# backup-to-s3.sh:
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql"
docker exec barbershop_postgres pg_dump -U barbershop_user barbershop_db > /tmp/${BACKUP_FILE}
gzip /tmp/${BACKUP_FILE}
aws s3 cp /tmp/${BACKUP_FILE}.gz s3://barbershop-app-1762358356/backups/
rm /tmp/${BACKUP_FILE}.gz
# Keep only last 30 days
aws s3 ls s3://barbershop-app-1762358356/backups/ | \
  awk '{print $4}' | sort -r | tail -n +31 | \
  xargs -I {} aws s3 rm s3://barbershop-app-1762358356/backups/{}
```

**Estimated Time**: 1 hour  
**Owner**: DevOps  
**Status**: ⚠️ PARTIALLY DONE

---

## 🟢 MEDIUM PRIORITY (Fix Within Month 1)

### 9. Observability Essentials ⚠️ MONITORING GAP

**Current State**: Basic console logs, no structured logging or alerts  
**Impact**: Can't diagnose production issues quickly

**Recommendation**:
```javascript
// Add structured logging
// File: backend/src/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Add request correlation ID
// File: backend/src/middleware/requestId.js
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || require('uuid').v4();
  res.setHeader('x-request-id', req.id);
  next();
});

// Log all requests
app.use((req, res, next) => {
  logger.info('Request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ip: req.ip
  });
  next();
});
```

**CloudWatch Integration**:
```bash
# Install CloudWatch agent on EC2
sudo wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure log shipping
sudo nano /opt/aws/amazon-cloudwatch-agent/etc/config.json
# Add log file paths

# Start agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

**Basic Alerts** (CloudWatch):
- Email/SMS failure rate > 10%
- API error rate > 5%
- DB connection pool exhaustion
- Disk usage > 80%

**Estimated Time**: 4 hours  
**Owner**: DevOps  
**Status**: ❌ NOT DONE

---

### 10. Double Booking Race Condition ⚠️ EDGE CASE

**Current Protection**: Unique constraint on `(barber_id, booking_date, booking_time)`  
**Issue**: Under high concurrency, "Any Available" barber assignment can race

**File**: `backend/src/controllers/bookingController.js:44-71`

**Current Code**:
```javascript
// Line 44-60: "Any Available" logic
const availableBarbers = await client.query(`
  SELECT b.id FROM barbers b
  WHERE b.is_available = true
  AND NOT EXISTS (SELECT 1 FROM bookings ...)
  ORDER BY RANDOM() LIMIT 1
`);

if (availableBarbers.rows.length > 0) {
  barberId = availableBarbers.rows[0].id;
}
```

**Problem**: Two requests at same time can get same barber, then both try to insert.

**Fix**:
```javascript
// Use transaction + row locking
await client.query('BEGIN');

const availableBarbers = await client.query(`
  SELECT b.id FROM barbers b
  WHERE b.is_available = true
  AND NOT EXISTS (
    SELECT 1 FROM bookings bk
    WHERE bk.barber_id = b.id
    AND bk.booking_date = $1
    AND bk.booking_time = $2
    AND bk.status != 'cancelled'
  )
  ORDER BY RANDOM()
  LIMIT 1
  FOR UPDATE SKIP LOCKED  -- Lock the barber row
`, [bookingDate, bookingTime]);

// Rest of booking creation...
await client.query('COMMIT');
```

**Alternative** (better for scale):
```javascript
// Round-robin or least-recent-assigned
const availableBarbers = await client.query(`
  SELECT b.id, 
    COALESCE(MAX(bk.created_at), '1970-01-01') as last_booking
  FROM barbers b
  LEFT JOIN bookings bk ON bk.barber_id = b.id
  WHERE b.is_available = true
  GROUP BY b.id
  ORDER BY last_booking ASC  -- Least recently booked
  LIMIT 1
`);
```

**Estimated Time**: 1 hour  
**Owner**: Backend Developer  
**Status**: ⚠️ MITIGATED BY UNIQUE CONSTRAINT

---

### 11. Payment Provider Alignment ⚠️ ARCHITECTURE MISMATCH

**Observation**: Early docs mentioned "Square payments", current code uses Stripe

**Current State**:
- Stripe SDK integrated (`backend/src/utils/stripeClient.js`)
- Payment flow: Card verification → Save method → Admin charge
- Database: `stripe_customer_id`, `stripe_payment_method_id`, etc.

**Recommendation**: **DO NOT SWAP PRE-LAUNCH**

**If Square is required later**:
```javascript
// Parallel implementation, not replacement
// backend/src/utils/squareClient.js (NEW)
// backend/src/controllers/squarePaymentController.js (NEW)
// Keep Stripe endpoints untouched

// Database:
CREATE TABLE square_payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  square_customer_id VARCHAR(255),
  square_payment_id VARCHAR(255),
  amount DECIMAL(10,2),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

// Map Stripe customer to Square customer
CREATE TABLE payment_provider_map (
  user_id INTEGER REFERENCES users(id),
  stripe_customer_id VARCHAR(255),
  square_customer_id VARCHAR(255),
  PRIMARY KEY (user_id)
);
```

**Estimated Time**: N/A (defer to Phase 2)  
**Owner**: Product Manager decision  
**Status**: ✅ DEFERRED

---

### 12. Frontend Code Warnings ⚠️ TECHNICAL DEBT

**Current Warnings**:
```
src/components/Navigation.js:8 - Unused variable 'navigate'
src/pages/ConfigPage.js:50,57 - Missing useEffect dependencies
```

**Impact**: Minimal (linter warnings), but can hide real issues

**Fix**:
```javascript
// Navigation.js:8
- const navigate = useNavigate();
+ // Removed if truly unused, or use it

// ConfigPage.js:50,57
useEffect(() => {
  fetchSettings();
}, []);  // Add fetchSettings to deps or wrap in useCallback
```

**Estimated Time**: 15 minutes  
**Owner**: Frontend Developer  
**Status**: ⚠️ NON-CRITICAL

---

## 📋 Launch Checklist Summary

### Before Going Live

- [ ] **SSL Certificate** installed and forced HTTPS
- [ ] **Default passwords** changed (admin + 6 barbers)
- [ ] **Email service** configured and tested
- [ ] **Domain name** pointed to server (optional but recommended)
- [ ] **JWT token TTL** shortened to 15 minutes (quick fix)
- [ ] **Backup restore** tested once
- [ ] **Rate limit** behavior documented
- [ ] **Scheduler** behavior documented (dedupe strategy)
- [ ] **Monitoring** - at least CloudWatch basic alarms
- [ ] **Runbook** created (who to call, how to rollback)

### Week 1 Post-Launch

- [ ] **JWT cookies** implementation
- [ ] **Scheduler DB-only dedupe**
- [ ] **Redis for rate limiting** (if scaling)
- [ ] **Structured logging** with request IDs
- [ ] **CloudWatch dashboards** for key metrics

### Month 1 Post-Launch

- [ ] **Double booking edge case** fixed
- [ ] **Frontend linter warnings** resolved
- [ ] **Load testing** completed
- [ ] **Disaster recovery drill** (full restore from backup)
- [ ] **Security audit** by third party (optional)

---

## 🚨 Emergency Procedures

### If Site Goes Down

```bash
# 1. Check service status
ssh -i barbershop-key.pem ubuntu@44.200.206.94 'docker compose ps'

# 2. Check logs
ssh -i barbershop-key.pem ubuntu@44.200.206.94 'docker compose logs --tail 100 backend'

# 3. Restart services
ssh -i barbershop-key.pem ubuntu@44.200.206.94 'cd /home/ubuntu/barbershop && docker compose restart'

# 4. If database is corrupted
# (Have backup ready!)
# Restore from most recent backup
```

### If Database is Lost

```bash
# 1. Get latest backup from S3
aws s3 ls s3://barbershop-app-1762358356/backups/ --recursive | sort | tail -n 1

# 2. Download
aws s3 cp s3://barbershop-app-1762358356/backups/backup_YYYYMMDD_HHMMSS.sql.gz /tmp/

# 3. Restore
gunzip /tmp/backup_YYYYMMDD_HHMMSS.sql.gz
docker exec -i barbershop_postgres psql -U barbershop_user -d barbershop_db < /tmp/backup_YYYYMMDD_HHMMSS.sql

# 4. Verify
docker exec barbershop_postgres psql -U barbershop_user -d barbershop_db \
  -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM bookings;"
```

### Rollback Deployment

```bash
# 1. SSH to server
ssh -i barbershop-key.pem ubuntu@44.200.206.94

# 2. Checkout previous commit
cd /home/ubuntu/barbershop
git log --oneline  # Find previous good commit
git checkout <commit-hash>

# 3. Rebuild and restart
docker compose down
docker compose up -d --build

# 4. Verify health
curl http://localhost:5001/health
```

---

## 📞 Contacts

**On-Call Engineer**: [Your phone]  
**AWS Account Owner**: [AWS admin email]  
**Database Admin**: [DBA contact]  
**Domain Registrar**: [GoDaddy/Namecheap login]

---

**Document Version**: 1.0  
**Last Updated**: January 20, 2026  
**Next Review**: Before launch

