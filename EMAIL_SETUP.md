# Email Configuration Guide

## Current Issue
The email configuration is failing with authentication error: `535 Authentication credentials invalid`

**Current settings:**
- EMAIL_HOST=smtp.mail.com
- EMAIL_PORT=587
- EMAIL_USER=ahmad@mail.com
- EMAIL_PASSWORD=test1234 (appears to be invalid)

## Solution Options

### Option 1: Use Gmail (Recommended)
Gmail is the easiest and most reliable option for development and production.

1. **Create an App Password** (not your regular Gmail password):
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated 16-character password

2. **Update `.env` file:**
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM=your-email@gmail.com
```

### Option 2: Use SendGrid (Production Recommended)
Free tier includes 100 emails/day.

1. Sign up at https://sendgrid.com
2. Create an API key
3. Update `.env`:
```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=verified-sender@yourdomain.com
```

### Option 3: Use Mailgun
Free tier includes 5,000 emails/month.

1. Sign up at https://mailgun.com
2. Get SMTP credentials
3. Update `.env`:
```bash
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASSWORD=your-mailgun-password
EMAIL_FROM=noreply@yourdomain.com
```

### Option 4: Fix Mail.com Credentials
If you want to continue using mail.com:

1. Verify the password is correct for ahmad@mail.com
2. Enable "Allow less secure apps" if required
3. Check if mail.com requires app-specific passwords
4. Verify SMTP settings: https://www.mail.com/email/help/

## Testing Email Configuration

After updating credentials:

1. **Update VPS `.env` file:**
```bash
ssh -i barbershop-key.pem ubuntu@13.223.228.70
nano /home/ubuntu/barbershop/.env
# Update EMAIL_* variables
```

2. **Restart backend:**
```bash
cd /home/ubuntu/barbershop
docker compose restart backend
```

3. **Test email:**
```bash
docker exec barbershop_backend node test-email-verification.js
```

4. **Check logs:**
```bash
docker logs barbershop_backend --tail 50
```

## What Works After Email Setup

Once configured correctly, the system will automatically send:

1. **Verification emails** - After user registration
2. **Password reset emails** - When user requests password reset  
3. **Booking confirmation emails** - When booking is confirmed

The registration flow already:
- ✅ Generates verification tokens
- ✅ Stores them in database
- ✅ Attempts to send email (catches errors gracefully)
- ✅ Shows success message to user
- ✅ Allows login even without verification (optional)

## Verification URLs

Users will receive emails with links like:
```
http://13.223.228.70/verify-email/{token}
```

You need to create a verify-email page/route if it doesn't exist yet.
