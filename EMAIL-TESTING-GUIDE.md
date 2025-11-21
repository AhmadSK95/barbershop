# Email Testing Guide - Password Reset & Account Verification

This guide explains how to test email functionality (password reset, email verification, booking confirmations) in development.

## Current Setup

Your system supports **two email providers**:
1. **AWS SES** (production-ready, currently configured)
2. **Gmail SMTP** (easy for local testing)

The system automatically chooses based on your `.env` configuration.

---

## Option 1: AWS SES (Current Setup) ⚠️

### Current Status
- ✅ AWS credentials are configured
- ⚠️ **AWS SES is in SANDBOX MODE**
- ❌ Can only send to **verified email addresses**

### Quick Test Steps

**1. Verify YOUR Email in AWS SES Console**
```bash
# Steps:
1. Go to: https://console.aws.amazon.com/ses/
2. Click "Verified identities" in left sidebar
3. Click "Create identity"
4. Choose "Email address"
5. Enter your email: ahmadskmoin2021@gmail.com
6. Click "Create identity"
7. Check your email inbox
8. Click the AWS verification link
9. ✅ You can now receive password reset emails!
```

**2. Test Password Reset**
```bash
# Now test the flow:
1. Go to login page
2. Click "Forgot Password?"
3. Enter: ahmadskmoin2021@gmail.com
4. Check your email for reset link
5. Click link and set new password
```

### Move Out of Sandbox (For Production)

To send emails to ANY user:
```bash
1. Go to AWS SES Console → Account Dashboard
2. Click "Request production access"
3. Fill out form:
   - Mail type: Transactional
   - Website URL: Your app URL
   - Use case: "Barbershop booking confirmations and password resets"
   - Compliance: Explain opt-in process
4. Submit (usually approved in 24-48 hours)
5. ✅ After approval, no email verification needed!
```

---

## Option 2: Gmail SMTP (Easy Local Testing) ✅ RECOMMENDED

### Setup Gmail App Password (5 minutes)

**1. Enable 2-Step Verification**
```bash
1. Go to: https://myaccount.google.com/security
2. Under "How you sign in to Google", click "2-Step Verification"
3. Follow prompts to enable it
```

**2. Generate App Password**
```bash
1. Go to: https://myaccount.google.com/apppasswords
2. Select app: "Mail"
3. Select device: "Other (Custom name)"
4. Enter name: "Barbershop Backend"
5. Click "Generate"
6. Copy the 16-character password (e.g., "abcd efgh ijkl mnop")
7. Save it securely!
```

**3. Update backend/.env**
```bash
# Comment out AWS SES settings:
# EMAIL_SERVICE=ses
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...

# Add Gmail SMTP settings:
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=ahmadskmoin2021@gmail.com
EMAIL_PASSWORD=your_16_char_app_password_here
EMAIL_FROM=ahmadskmoin2021@gmail.com
```

**4. Restart Backend**
```bash
cd backend
npm run dev

# You should see:
# 📧 Email Provider: SMTP/Gmail
```

**5. Test Password Reset**
```bash
1. Go to login page
2. Click "Forgot Password?"
3. Enter ANY email address
4. Check that email's inbox
5. Click reset link
6. ✅ It works with ANY email now!
```

---

## Switching Between Providers

### Use AWS SES (Production/Sandbox)
```bash
# backend/.env
EMAIL_SERVICE=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
EMAIL_FROM=noreply@balkanbarbershop.com

# Remove or comment out:
# EMAIL_HOST=...
# EMAIL_PORT=...
```

### Use Gmail SMTP (Local Testing)
```bash
# backend/.env
# EMAIL_SERVICE=ses  # Comment this out
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your_gmail@gmail.com
```

The system automatically detects which provider to use based on `EMAIL_SERVICE` env var.

---

## Testing All Email Features

### 1. Registration Email Verification
```bash
1. Register new account
2. Check email for verification link
3. Click link to verify
```

### 2. Password Reset
```bash
1. Login page → "Forgot Password?"
2. Enter email
3. Check email for reset link
4. Click link and set new password
5. Login with new password
```

### 3. Booking Confirmation
```bash
1. Login and make a booking
2. Check email for booking confirmation
3. Verify details are correct
```

---

## Troubleshooting

### Gmail: "Less secure app access" Error
- ✅ **Solution**: Use App Password (not regular password)
- Gmail disabled "less secure apps" - must use App Passwords

### AWS SES: "Email not verified" Error
```
MessageRejected: Email address is not verified
```
- ✅ **Solution**: Verify recipient email in SES console (sandbox mode only)

### AWS SES: "Request production access" pending
- ⏳ Usually takes 24-48 hours
- Meanwhile, use Gmail SMTP for testing

### No Email Received
1. **Check spam folder**
2. **Check backend logs**:
   ```bash
   # Look for:
   ✅ Password reset email sent to user@email.com
   # OR
   ❌ Error sending password reset email
   ```
3. **Verify email provider**:
   ```bash
   # Backend should show on startup:
   📧 Email Provider: AWS SES
   # OR
   📧 Email Provider: SMTP/Gmail
   ```

---

## Email Templates

All email templates include:
- ✅ Professional HTML formatting
- ✅ Responsive design
- ✅ Barbershop branding
- ✅ Clear call-to-action buttons
- ✅ Plain text fallback

### Password Reset Email Includes:
- Reset button (1-hour expiry)
- Direct link (for copy/paste)
- Security warning
- Company branding

---

## Production Recommendations

### For Production Deployment:

**Option A: AWS SES (Recommended)**
- ✅ High deliverability
- ✅ Very cost-effective ($0.10 per 1,000 emails)
- ✅ Scales automatically
- ✅ Detailed analytics
- ⚠️ Requires "production access" approval
- 📝 Takes 24-48 hours to exit sandbox

**Option B: SendGrid**
- ✅ Free tier: 100 emails/day
- ✅ Easy setup, no sandbox mode
- ✅ Good deliverability
- ⚠️ More expensive at scale

**Option C: Mailgun**
- ✅ Free tier: 5,000 emails/month
- ✅ Good API and documentation
- ✅ Fast setup

### Don't Use in Production:
- ❌ Gmail SMTP (daily sending limits)
- ❌ Personal email accounts

---

## Quick Start (Choose One):

### For Quick Testing (5 minutes):
```bash
1. Generate Gmail App Password
2. Update backend/.env with Gmail SMTP settings
3. Restart backend
4. Test password reset with ANY email
```

### For Production-Like Testing (10 minutes):
```bash
1. Login to AWS SES Console
2. Verify your email address
3. Keep AWS SES settings in backend/.env
4. Restart backend
5. Test password reset with YOUR verified email
```

### For Full Production (24-48 hours):
```bash
1. Request AWS SES production access
2. Wait for approval
3. Update backend/.env with approved AWS settings
4. Deploy to production
5. Test password reset with ANY email
```

---

## Support

If emails still aren't working:
1. Check backend console logs
2. Verify environment variables are loaded
3. Test with `curl` to API endpoint
4. Check email provider status page
5. Review backend/src/utils/emailService.js logs

The system will automatically log which email provider it's using when the backend starts! 📧
