# Security Maintenance Guide

## Quick Reference

### 1. Clean Up Expired Refresh Tokens

Run manually:
```bash
cd backend
node src/utils/cleanupRefreshTokens.js
```

### 2. Set Up Automated Cleanup (Cron Job)

**Option A: Using system crontab (Linux/Mac)**
```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * cd /path/to/barbershop/backend && node src/utils/cleanupRefreshTokens.js >> logs/token-cleanup.log 2>&1
```

**Option B: Using node-cron (Recommended for all platforms)**

Install node-cron:
```bash
cd backend
npm install node-cron
```

Add to `backend/src/server.js` (after app initialization):
```javascript
const cron = require('node-cron');
const { cleanupExpiredTokens } = require('./utils/cleanupRefreshTokens');

// Run cleanup daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running scheduled token cleanup...');
  await cleanupExpiredTokens();
});
```

### 3. Generate Strong JWT Secrets (Production)

Before deploying to production, generate new secrets:
```bash
# Generate JWT_SECRET
openssl rand -hex 64

# Generate JWT_REFRESH_SECRET
openssl rand -hex 64
```

Update `.env`:
```env
JWT_SECRET=<generated_secret_1>
JWT_REFRESH_SECRET=<generated_secret_2>
```

### 4. Test Password Validation

Try registering with weak passwords (should fail):
```bash
# Too short
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"weak","firstName":"Test","lastName":"User"}'

# Missing special character
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Password123","firstName":"Test","lastName":"User"}'

# Valid password (should succeed)
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Password123!","firstName":"Test","lastName":"User"}'
```

### 5. Monitor Database Token Growth

Check refresh token count:
```bash
# Docker
docker exec -it barbershop_postgres psql -U barbershop_user -d barbershop_db \
  -c "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE expires_at < NOW()) as expired FROM refresh_tokens;"

# Local
psql -U barbershop_user -d barbershop_db \
  -c "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE expires_at < NOW()) as expired FROM refresh_tokens;"
```

### 6. Security Checklist for Production

Before going live:

- [ ] Generate new JWT secrets (see #3)
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Configure SMTP with app-specific password
- [ ] Enable HTTPS at Nginx/reverse proxy
- [ ] Set up SSL certificate (Let's Encrypt)
- [ ] Configure firewall (allow 80, 443, deny 5001)
- [ ] Enable AWS CloudWatch logging
- [ ] Set up database backups (daily)
- [ ] Enable automated token cleanup (see #2)
- [ ] Review CORS allowed origins
- [ ] Test rate limiting (try 6+ rapid login attempts)
- [ ] Test password validation
- [ ] Remove or secure admin credentials

### 7. Security Monitoring

#### Check Failed Login Attempts
```sql
-- Add to your logging if needed
SELECT email, COUNT(*) as failed_attempts, MAX(created_at) as last_attempt
FROM auth_logs WHERE success = false AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY email ORDER BY failed_attempts DESC;
```

#### Check Active Sessions
```sql
SELECT COUNT(*) as active_sessions, MAX(expires_at) as latest_expiry
FROM refresh_tokens WHERE expires_at > NOW();
```

### 8. Password Requirements

Current requirements enforced:
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*...)

Examples of valid passwords:
- `Password123!`
- `SecureP@ss1`
- `MyBarbershop2024!`

### 9. Rate Limiting Status

Current limits:
- **General API**: 100 requests per 15 minutes per IP
- **Auth endpoints**: 5 requests per 15 minutes per IP
- **Password reset**: 3 requests per hour per IP

Test rate limiting:
```bash
# Try 6 rapid login attempts (should fail on 6th)
for i in {1..6}; do
  curl -X POST http://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' && echo " - Attempt $i"
  sleep 1
done
```

### 10. Troubleshooting

#### "Password must contain..." error
- Check password meets all requirements (see #8)
- Ensure no leading/trailing spaces

#### "Email already exists"
- Email normalization is case-insensitive
- Check database: `SELECT * FROM users WHERE email LIKE '%yourname%';`

#### CORS errors
- Verify `FRONTEND_URL` in `.env`
- Check browser console for exact origin
- Ensure frontend port is in allowed list (3000-3010 in dev)

#### Token cleanup not running
- Check cron logs: `grep CRON /var/log/syslog`
- Test manually first (see #1)
- Verify database connection

---

## Emergency Procedures

### Revoke All User Sessions
```sql
-- Force all users to re-login
DELETE FROM refresh_tokens;
```

### Disable Specific User
```sql
-- Prevent user from logging in (you can add a disabled flag)
UPDATE users SET is_verified = false WHERE email = 'suspicious@user.com';
DELETE FROM refresh_tokens WHERE user_id = (SELECT id FROM users WHERE email = 'suspicious@user.com');
```

### Check for Suspicious Activity
```sql
-- Users created in last hour
SELECT email, created_at FROM users WHERE created_at > NOW() - INTERVAL '1 hour';

-- Bookings with unusual patterns
SELECT user_id, COUNT(*) as booking_count FROM bookings 
WHERE created_at > NOW() - INTERVAL '1 hour' 
GROUP BY user_id HAVING COUNT(*) > 10;
```

---

**Last Updated:** 2025-11-17
