# AWS SES Quick Start Guide

## ✅ What's Done

1. **Sender email changed to**: `ahmadskmoin2021@gmail.com`
2. **AWS SES verification request sent** to your Gmail
3. **Automatic user email verification** - When users register, their email is automatically verified in AWS SES

---

## 🚀 IMMEDIATE ACTION REQUIRED

### Step 1: Verify Sender Email (5 minutes)

Check **ahmadskmoin2021@gmail.com** inbox for:

**Subject**: `Amazon SES Address Verification Request`

**Click the verification link** in that email. This allows AWS SES to send FROM this address.

---

## 🎯 How It Works Now

### When a User Registers:

```
1. User fills registration form with their email (e.g., customer@example.com)
2. Backend creates account
3. Backend sends AWS SES verification to customer@example.com ←  NEW! 
4. Backend sends account verification email to customer@example.com
5. User receives TWO emails:
   a) "Amazon SES Address Verification" - Click to allow receiving emails
   b) "Verify Your Email - Balkan Barbers" - Your app's verification email
```

### Important Notes:

- **Sandbox Mode**: Each new user must verify their email with AWS before they can receive emails
- **This is normal for AWS SES Sandbox** - prevents spam
- **Once verified**, that email can receive all future emails (bookings, password resets, etc.)

---

## 🧪 Test It Now

After verifying ahmadskmoin2021@gmail.com:

### Option 1: Test via Script

```bash
ssh -i barbershop-key.pem ubuntu@13.223.228.70
docker exec barbershop_backend node test-ses-email.js
```

This sends test emails to ahmadskmoin2021@gmail.com

### Option 2: Test Real Registration

1. Go to `http://13.223.228.70/register`
2. Register with email: `ahmadskmoin2021@gmail.com`
3. Check Gmail - you should receive:
   - AWS SES verification email (if first time for this email)
   - Balkan Barbers account verification email

---

## 🔓 Remove Sandbox Restrictions (Optional)

To send to ANY email without verification:

1. Go to **AWS Console** → **Simple Email Service**
2. Click **"Request production access"**
3. Fill form:
   - **Use case**: Transactional emails for barbershop booking system
   - **Estimated volume**: 100-500 emails/month
   - **Abuse prevention**: Email verification required for user accounts
4. Submit (typically approved in 24 hours)

**Benefits after approval**:
- ✅ Send to any email without verification
- ✅ Higher sending limits (50,000+ emails/day)
- ✅ Better deliverability

---

## 📧 Email Flow Diagram

### Current (Sandbox Mode):

```
New User Registration
         ↓
AWS sends verification to user's email ← User must click this first
         ↓
User clicks AWS verification link
         ↓
User email now verified in AWS SES
         ↓
User receives Balkan Barbers verification email
         ↓
User clicks verification link
         ↓
Email verified ✅ User can now book and receive booking confirmations
```

### After Production Access:

```
New User Registration
         ↓
User receives Balkan Barbers verification email directly
         ↓
User clicks verification link
         ↓
Email verified ✅ User can book
```

---

## 🔧 Technical Details

### Files Modified:

1. `backend/src/controllers/authController.js`
   - Added automatic AWS SES email verification on registration
   - Sends verification request to user's email address
   
2. `.env` files updated
   - `EMAIL_FROM=ahmadskmoin2021@gmail.com`
   - `ADMIN_EMAIL=ahmadskmoin2021@gmail.com`

### What Happens on Registration:

```javascript
// 1. Verify user's email in AWS SES (sandbox requirement)
await verifyEmailIdentity(userEmail); // Sends AWS verification email

// 2. Send your app's verification email
await sendVerificationEmail(userEmail, firstName, token);
```

---

## 💡 User Experience Tips

### For Sandbox Mode:

Add a message on your registration success page:

```
✅ Registration successful!

Please check your email for:
1. AWS verification email - Click the link to activate email delivery
2. Account verification email - Verify your Balkan Barbers account

Note: You may need to check your spam folder.
```

### After Production Access:

```
✅ Registration successful!
Please check your email to verify your account.
```

---

## 🐛 Troubleshooting

### User didn't receive verification email?

**Check**:
1. Spam/junk folder
2. AWS verification email came first - user must click that first
3. Backend logs: `docker logs barbershop_backend --tail 50`

### "Email address not verified" error in logs?

**Solution**: User needs to click the AWS SES verification link first

### Want to pre-verify test emails?

```bash
# SSH to VPS
ssh -i barbershop-key.pem ubuntu@13.223.228.70

# Verify additional test emails
docker exec -e EMAIL_FROM=testemail@example.com barbershop_backend node verify-ses-email.js
```

---

## ✅ Summary

**What's Live**:
- ✅ AWS SES integrated
- ✅ Sender email: ahmadskmoin2021@gmail.com
- ✅ Auto-verification for new user emails
- ✅ Professional email templates
- ✅ Registration verification emails
- ✅ Booking confirmation emails
- ✅ Password reset emails

**Next Steps**:
1. Check ahmadskmoin2021@gmail.com and click AWS verification link
2. Test registration flow
3. (Optional) Request AWS SES production access to remove sandbox restrictions

**Your barbershop booking system now has professional email notifications!** 🎉✂️
