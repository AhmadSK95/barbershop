# AWS SES Setup for balkanbarbershop.com - Quick Start

## 🎯 Goal
Set up professional email from `booking@balkanbarbershop.com` for booking confirmations and notifications.

---

## 📋 What's Been Prepared

✅ **SNS Topic Created:** `arn:aws:sns:us-east-1:364301298768:ses-bounce-complaint-feedback`  
✅ **DNS Records:** See `AWS_SES_DNS_RECORDS.md`  
✅ **Production Request:** See `AWS_SES_PRODUCTION_REQUEST.txt`  
✅ **Setup Checklist:** See `AWS_SES_SETUP_CHECKLIST.md`

---

## ⚡ Quick Steps (30 minutes + waiting)

### 1️⃣ Add Domain to AWS SES (5 min)
```
1. Go to: https://console.aws.amazon.com/ses/home?region=us-east-1#/verified-identities
2. Click "Create identity"
3. Type: Domain
4. Domain: balkanbarbershop.com
5. Enable DKIM ✓
6. Create
7. Copy the DNS records AWS gives you
```

### 2️⃣ Add DNS Records (15 min)
Add these to balkanbarbershop.com DNS (Squarespace/GoDaddy/Cloudflare):
- 1 TXT record (verification)
- 3 CNAME records (DKIM)
- 1 TXT record (SPF - optional but recommended)
- 1 TXT record (DMARC - optional but recommended)

**Detailed instructions:** `AWS_SES_DNS_RECORDS.md`

### 3️⃣ Wait for Verification (1-48 hours)
Check status: https://console.aws.amazon.com/ses/home?region=us-east-1#/verified-identities

Look for:
- ✅ Domain status: **Verified**
- ✅ DKIM status: **Success**

### 4️⃣ Configure SNS (2 min)
Once verified:
1. Click on balkanbarbershop.com in SES
2. Create/assign configuration set
3. Add SNS topic for bounces/complaints
4. Use: `arn:aws:sns:us-east-1:364301298768:ses-bounce-complaint-feedback`

### 5️⃣ Request Production Access (5 min)
1. Go to: https://console.aws.amazon.com/ses/home?region=us-east-1#/account
2. Click "Request production access"
3. Copy/paste from: `AWS_SES_PRODUCTION_REQUEST.txt`
4. Submit
5. Wait 24-48 hours for approval

### 6️⃣ Update Backend (5 min)
After approval:
```bash
ssh -i barbershop-key.pem ubuntu@34.226.11.9
cd barbershop
nano .env
# Change EMAIL_FROM=ahmad2609.as@gmail.com
# To: EMAIL_FROM=booking@balkanbarbershop.com
docker compose restart backend
```

---

## 🚨 Important Notes

### Why We Need This?
- ✅ Professional emails from `booking@balkanbarbershop.com`
- ✅ Better deliverability (not spam)
- ✅ Unlimited sending (current: 200 emails/day limit)
- ✅ Domain reputation tracking

### Current vs After Setup

**Current (Sandbox):**
- ❌ From: ahmad2609.as@gmail.com
- ❌ Only 200 emails/day
- ❌ Can only send to verified addresses
- ❌ Looks unprofessional

**After Setup (Production):**
- ✅ From: booking@balkanbarbershop.com
- ✅ 50,000 emails/day (more if needed)
- ✅ Send to any email address
- ✅ Professional, branded emails

---

## 🆘 Need Help?

1. **DNS Access Issues:** Contact domain owner for DNS login
2. **AWS Console Questions:** Check `AWS_SES_SETUP_CHECKLIST.md`
3. **Verification Stuck:** Wait up to 72 hours, check DNS with `dig`
4. **Production Denied:** Review and resubmit with more details

---

## 📁 All Documentation

- **Main Checklist:** `AWS_SES_SETUP_CHECKLIST.md` (Start here!)
- **DNS Records:** `AWS_SES_DNS_RECORDS.md`
- **Production Request:** `AWS_SES_PRODUCTION_REQUEST.txt`
- **This File:** Quick overview

---

## ✅ Current Status

**Ready to start!** Follow steps in `AWS_SES_SETUP_CHECKLIST.md`

**Next Action:** Create domain identity in AWS SES Console (Step 1)

---

## Timeline

- **Your work:** ~30 minutes
- **DNS propagation:** 1-48 hours (usually < 2 hours)
- **AWS approval:** 24-48 hours
- **Total:** 2-4 days
