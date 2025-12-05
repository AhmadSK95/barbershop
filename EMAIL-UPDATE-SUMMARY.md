# Email Configuration Update Summary

## Changes Made (2025-12-05)

### ✅ Updated Email Sender to `info@balkan.thisisrikisart.com`

All booking confirmations, verifications, and password reset emails will now be sent from your verified domain instead of Gmail.

---

## Files Updated

### 1. Environment Files
- ✅ `backend/.env` - Updated `EMAIL_FROM=info@balkan.thisisrikisart.com`
- ✅ `.env` - Updated `EMAIL_FROM=info@balkan.thisisrikisart.com`
- ✅ `.env.production` - Updated with AWS SES configuration

### 2. Controller Files (Fixed Import Issues)
- ✅ `backend/src/controllers/bookingController.js` - Now uses `emailService.js` router
- ✅ `backend/src/controllers/authController.js` - Already using `emailService.js` ✓
- ✅ `backend/src/controllers/careersController.js` - Uses `sesEmail.js` (needs attachments)
- ✅ `backend/src/controllers/rescheduleController.js` - Uses `services/email.js` (AWS SES)

---

## Email Service Architecture

```
┌─────────────────────────────────────────┐
│  Controllers (booking, auth, etc.)      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  emailService.js (Router)                │
│  Checks EMAIL_SERVICE env variable       │
└──────────┬──────────────────────────────┘
           │
           ├── If EMAIL_SERVICE=ses ────────► sesEmail.js (AWS SES)
           │                                   └─► info@balkan.thisisrikisart.com
           │
           └── Else (fallback) ────────────► email.js (SMTP/Gmail)
```

---

## Current Configuration

```env
EMAIL_SERVICE=ses
EMAIL_FROM=info@balkan.thisisrikisart.com
ROOT_EMAIL=ahmad2609.as@gmail.com
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAVJUQMVRIB56WDCVW
```

---

## How to Deploy to AWS Server

### Option 1: Update via SSH
```bash
# SSH into your AWS server
ssh -i your-key.pem ubuntu@your-server-ip

# Navigate to project directory
cd /path/to/barbershop

# Update the .env file
nano .env

# Change this line:
EMAIL_FROM=ahmad2609.as@gmail.com

# To:
EMAIL_FROM=info@balkan.thisisrikisart.com

# Save and exit (Ctrl+X, Y, Enter)

# Restart the backend service
docker-compose restart backend
# OR if running with PM2:
pm2 restart backend
```

### Option 2: Deploy Updated Code
```bash
# On your local machine, commit and push changes
git add .
git commit -m "Update email sender to info@balkan.thisisrikisart.com"
git push origin main

# On AWS server, pull latest changes
cd /path/to/barbershop
git pull origin main

# Restart services
docker-compose down && docker-compose up -d --build
```

---

## Verification Steps

### 1. Check Backend Logs
```bash
# If using Docker:
docker-compose logs -f backend | grep "Email Provider"

# Should show:
# 📧 Email Provider: AWS SES
```

### 2. Test Booking Email
- Create a test booking on your live site
- Check recipient email inbox
- Verify sender shows: `info@balkan.thisisrikisart.com`

### 3. Check Email Headers
- Open the received email
- View email source/headers
- Look for: `From: info@balkan.thisisrikisart.com`
- Look for: `Return-Path: <info@balkan.thisisrikisart.com>`

---

## Email Types and Endpoints

| Email Type | Triggered By | Endpoint | Sender |
|------------|-------------|----------|--------|
| Booking Confirmation | `POST /api/bookings` | bookingController.js | info@balkan.thisisrikisart.com |
| Email Verification | `POST /api/auth/register` | authController.js | info@balkan.thisisrikisart.com |
| Password Reset | `POST /api/auth/forgot-password` | authController.js | info@balkan.thisisrikisart.com |
| Job Application | `POST /api/careers/apply` | careersController.js | info@balkan.thisisrikisart.com |
| Reschedule Notification | `POST /api/reschedule/:id` | rescheduleController.js | info@balkan.thisisrikisart.com |

---

## AWS SES Status

### Current Status
✅ Domain `balkan.thisisrikisart.com` is **VERIFIED** in AWS SES
✅ Can send FROM `info@balkan.thisisrikisart.com`
✅ Can send TO verified emails (in sandbox mode)

### Production Access
To send to any email address (not just verified ones):
1. Go to AWS SES Console → Account Dashboard
2. Click "Request production access"
3. Fill out the form (takes 24 hours for approval)

**Until then:** You can only send to verified email addresses. To verify additional test emails:
```bash
aws ses verify-email-identity --email-address test@example.com --region us-east-1
```

---

## Troubleshooting

### Issue: Still receiving emails from old address
**Solution:**
1. Restart the backend service on AWS
2. Clear any email queues
3. Check logs for "Email Provider: AWS SES"

### Issue: Emails not being delivered
**Checklist:**
- [ ] `EMAIL_SERVICE=ses` is set in .env
- [ ] Backend service has been restarted
- [ ] AWS credentials are correct
- [ ] Domain is verified in AWS SES console
- [ ] Recipient email is verified (if in sandbox mode)

### Issue: "MessageRejected" error
**Cause:** AWS SES is in sandbox mode and recipient email is not verified
**Solutions:**
- Request production access (recommended)
- OR verify recipient email individually

---

## Testing Emails Locally

```bash
# Test all email types
cd backend
node test-ses-booking.js

# Test specific email to external address
node test-external-email.js
```

---

## Support

If issues persist:
1. Check backend logs: `docker-compose logs -f backend`
2. Test AWS SES directly: `node backend/test-ses-email.js`
3. Verify AWS SES console shows domain as verified
4. Check AWS CloudWatch logs for SES delivery status

---

**Last Updated:** 2025-12-05  
**Updated By:** Warp AI Agent  
**Status:** ✅ Complete - Ready for deployment
