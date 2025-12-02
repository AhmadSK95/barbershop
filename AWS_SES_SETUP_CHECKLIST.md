# AWS SES Setup Checklist for balkanbarbershop.com

## ✅ Completed

- [x] **SNS Topic Created**
  - Topic ARN: `arn:aws:sns:us-east-1:364301298768:ses-bounce-complaint-feedback`
  - Purpose: Capture bounce and complaint notifications
  
- [x] **DNS Records Documentation**
  - See: `AWS_SES_DNS_RECORDS.md`
  
- [x] **Production Access Request**
  - See: `AWS_SES_PRODUCTION_REQUEST.txt`

---

## 🔲 Your Action Required

### Step 1: Verify Domain in AWS Console (5 minutes)

1. **Login to AWS Console:**
   - https://console.aws.amazon.com/ses/home?region=us-east-1#/verified-identities
   
2. **Create Domain Identity:**
   - Click **"Create identity"**
   - Identity type: **Domain**
   - Domain: `balkanbarbershop.com`
   - Configuration set: Leave empty (we'll configure later)
   - Custom MAIL FROM domain: Leave empty
   - DKIM signing: **Use a default DKIM signing key** ✓
   - Click **"Create identity"**

3. **Copy DNS Records:**
   - AWS will show you the DNS records
   - You'll get:
     - 1 TXT record (verification)
     - 3 CNAME records (DKIM)

---

### Step 2: Add DNS Records (15-30 minutes)

**Where is balkanbarbershop.com registered?**
- [ ] Squarespace
- [ ] GoDaddy
- [ ] Cloudflare
- [ ] Other: __________

**Access your DNS provider and add these records:**

1. **TXT Record (Domain Verification)**
   ```
   Name: _amazonses.balkanbarbershop.com
   Value: [Copy from AWS Console]
   TTL: 1800
   ```

2. **CNAME Record 1 (DKIM)**
   ```
   Name: [AWS provides, looks like: abc123._domainkey.balkanbarbershop.com]
   Value: [AWS provides, looks like: abc123.dkim.amazonses.com]
   TTL: 1800
   ```

3. **CNAME Record 2 (DKIM)**
   ```
   Name: [AWS provides]
   Value: [AWS provides]
   TTL: 1800
   ```

4. **CNAME Record 3 (DKIM)**
   ```
   Name: [AWS provides]
   Value: [AWS provides]
   TTL: 1800
   ```

5. **TXT Record (SPF) - Recommended**
   ```
   Name: balkanbarbershop.com (or @)
   Value: v=spf1 include:amazonses.com ~all
   TTL: 1800
   ```
   
   ⚠️ **If SPF record already exists**, edit it to add `include:amazonses.com`

6. **TXT Record (DMARC) - Recommended**
   ```
   Name: _dmarc.balkanbarbershop.com
   Value: v=DMARC1; p=none; rua=mailto:dmarc@balkanbarbershop.com
   TTL: 1800
   ```

---

### Step 3: Wait for DNS Propagation (15 min - 48 hours)

**Check verification status:**
- Go to: https://console.aws.amazon.com/ses/home?region=us-east-1#/verified-identities
- Click on `balkanbarbershop.com`
- Wait for:
  - ✅ **Domain status:** Verified
  - ✅ **DKIM status:** Success

**Quick check:**
```bash
# Check if DNS propagated
dig TXT _amazonses.balkanbarbershop.com
```

---

### Step 4: Configure SNS Notifications (2 minutes)

Once domain is verified:

1. In SES Console, click on `balkanbarbershop.com`
2. Click **"Configuration set"** tab
3. If no configuration set:
   - Go to **Configuration sets** in left menu
   - Click **"Create set"**
   - Name: `balkanbarbershop-config`
   - Click **"Create"**
4. Go back to `balkanbarbershop.com` identity
5. Click **"Assign configuration set"**
6. Select `balkanbarbershop-config`
7. Go to Configuration set → **Event destinations**
8. Add destination:
   - Event types: **Bounce**, **Complaint**
   - Destination: **SNS**
   - SNS topic: `arn:aws:sns:us-east-1:364301298768:ses-bounce-complaint-feedback`

---

### Step 5: Request Production Access (5 minutes)

1. **Go to Account Dashboard:**
   - https://console.aws.amazon.com/ses/home?region=us-east-1#/account

2. **Click "Request production access"**

3. **Fill the form:**
   - **Use case:** Transactional
   - Copy text from `AWS_SES_PRODUCTION_REQUEST.txt`
   - Paste into the form

4. **Submit**
   - AWS typically responds in 24-48 hours
   - Check your email for approval

---

### Step 6: Update Backend Config (After Approval)

Once production access is approved, update backend to use new domain:

**On AWS server:**
```bash
# SSH to server
ssh -i barbershop-key.pem ubuntu@34.226.11.9

# Edit .env file
cd barbershop
nano .env

# Change:
EMAIL_FROM=ahmad2609.as@gmail.com
# To:
EMAIL_FROM=booking@balkanbarbershop.com

# Save and restart
docker compose restart backend
```

---

## Quick Reference

### AWS Console Links
- **SES Console:** https://console.aws.amazon.com/ses/home?region=us-east-1
- **Verified Identities:** https://console.aws.amazon.com/ses/home?region=us-east-1#/verified-identities
- **Account Dashboard:** https://console.aws.amazon.com/ses/home?region=us-east-1#/account
- **SNS Topics:** https://console.aws.amazon.com/sns/v3/home?region=us-east-1#/topics

### Important ARNs
- **SNS Topic:** `arn:aws:sns:us-east-1:364301298768:ses-bounce-complaint-feedback`

### Test Commands
```bash
# Check domain verification
aws ses get-identity-verification-attributes \
  --identities balkanbarbershop.com \
  --region us-east-1

# Send test email (after verification)
aws ses send-email \
  --from booking@balkanbarbershop.com \
  --to your-test@email.com \
  --subject "Test from Balkan Barbershop" \
  --text "This is a test email" \
  --region us-east-1
```

---

## Troubleshooting

### Domain not verifying?
- Check DNS records with `dig TXT _amazonses.balkanbarbershop.com`
- Wait longer (can take up to 72 hours)
- Make sure records are added correctly (copy-paste exactly from AWS)

### DKIM not working?
- Check all 3 CNAME records are added
- Verify domain and subdomain syntax (`._domainkey.balkanbarbershop.com`)

### Production access denied?
- Ensure use case is clearly "Transactional"
- Add more detail about bounce/complaint handling
- Emphasize no marketing emails

### Still getting errors?
- Verify AWS credentials have SES permissions
- Check sending limits in account dashboard
- Review CloudWatch logs for SES

---

## Timeline Estimate

- **Step 1 (Domain verification):** 5 minutes
- **Step 2 (Add DNS records):** 15-30 minutes
- **Step 3 (DNS propagation):** 15 minutes - 48 hours
- **Step 4 (SNS config):** 2 minutes
- **Step 5 (Production request):** 5 minutes
- **Step 6 (AWS approval):** 24-48 hours
- **Step 7 (Backend update):** 5 minutes

**Total time:** 2-4 days (mostly waiting for DNS and approval)

---

## Questions?

If you run into issues or need help with DNS:
1. Check which DNS provider manages balkanbarbershop.com
2. Look for existing SPF/DKIM records to avoid conflicts
3. Take screenshots of AWS DNS values
4. Contact me for help with specific errors

---

**Current Status:** Ready to start! Begin with Step 1 above. ✅
