# AWS SES DNS Records for balkanbarbershop.com

## Step 1: Verify Domain in AWS SES Console

1. Go to: https://console.aws.amazon.com/ses/home?region=us-east-1#/verified-identities
2. Click **"Create identity"**
3. Select **"Domain"**
4. Enter: `balkanbarbershop.com`
5. Check **"Use a default DKIM signing key"**
6. Click **"Create identity"**

AWS will generate DNS records. You'll see something like this:

---

## Step 2: DNS Records to Add

You'll need to add these records to your DNS provider (where balkanbarbershop.com is registered - could be Squarespace, GoDaddy, Cloudflare, etc.)

### Record 1: Domain Verification (TXT Record)

**Type:** TXT  
**Name/Host:** `_amazonses.balkanbarbershop.com`  
**Value:** `<AWS will provide a random string like: gFq5Kd...>`  
**TTL:** 1800 (or default)

### Records 2-4: DKIM Authentication (CNAME Records)

AWS will give you 3 CNAME records. They look like this:

**CNAME 1:**
- **Type:** CNAME
- **Name:** `abc123._domainkey.balkanbarbershop.com`
- **Value:** `abc123.dkim.amazonses.com`
- **TTL:** 1800

**CNAME 2:**
- **Type:** CNAME
- **Name:** `def456._domainkey.balkanbarbershop.com`
- **Value:** `def456.dkim.amazonses.com`
- **TTL:** 1800

**CNAME 3:**
- **Type:** CNAME
- **Name:** `ghi789._domainkey.balkanbarbershop.com`
- **Value:** `ghi789.dkim.amazonses.com`
- **TTL:** 1800

---

## Step 3: Add SPF Record (Recommended)

**Type:** TXT  
**Name/Host:** `balkanbarbershop.com` (or `@`)  
**Value:** `v=spf1 include:amazonses.com ~all`  
**TTL:** 1800

**Note:** If you already have an SPF record, add `include:amazonses.com` to it. Don't create duplicate SPF records.

---

## Step 4: Add DMARC Record (Recommended for Deliverability)

**Type:** TXT  
**Name/Host:** `_dmarc.balkanbarbershop.com`  
**Value:** `v=DMARC1; p=none; rua=mailto:dmarc@balkanbarbershop.com`  
**TTL:** 1800

This tells receiving servers to monitor (but not reject) emails and send reports.

---

## Step 5: Wait for DNS Propagation

- DNS changes can take 15 minutes to 48 hours
- Check status in AWS SES console: https://console.aws.amazon.com/ses/home?region=us-east-1#/verified-identities
- When verified, you'll see:
  - ✅ Domain status: **Verified**
  - ✅ DKIM status: **Success**

---

## Step 6: Configure SNS for Bounce/Complaint Handling

Once domain is verified:

1. In SES Console, click on `balkanbarbershop.com`
2. Go to **"Notifications"** tab
3. Click **"Edit"** next to Configuration set
4. Set:
   - **Bounces:** `arn:aws:sns:us-east-1:364301298768:ses-bounce-complaint-feedback`
   - **Complaints:** `arn:aws:sns:us-east-1:364301298768:ses-bounce-complaint-feedback`

---

## Step 7: Request Production Access

Go to: https://console.aws.amazon.com/ses/home?region=us-east-1#/account

Click **"Request production access"** and use the request text in `AWS_SES_PRODUCTION_REQUEST.txt`

---

## Verification Checklist

- [ ] Domain verification TXT record added
- [ ] 3 DKIM CNAME records added
- [ ] SPF record added (or updated)
- [ ] DMARC record added
- [ ] DNS propagated (check in SES console)
- [ ] Domain shows "Verified" status
- [ ] DKIM shows "Success" status
- [ ] SNS topic configured for bounces/complaints
- [ ] Production access request submitted
- [ ] Production access approved by AWS

---

## Where to Add DNS Records

### If using Squarespace DNS:
1. Log in to Squarespace
2. Go to **Settings** → **Domains** → **balkanbarbershop.com**
3. Click **DNS Settings**
4. Add each record

### If using Cloudflare:
1. Log in to Cloudflare
2. Select **balkanbarbershop.com**
3. Go to **DNS** tab
4. Add each record

### If using GoDaddy:
1. Log in to GoDaddy
2. Go to **My Products** → **DNS**
3. Select **balkanbarbershop.com**
4. Add each record

---

## Testing After Setup

Once DNS is verified, test with:

```bash
# Check if domain is verified
aws ses get-identity-verification-attributes --identities balkanbarbershop.com --region us-east-1

# Send test email
aws ses send-email \
  --from booking@balkanbarbershop.com \
  --to your-test@email.com \
  --subject "Test Email" \
  --text "This is a test from AWS SES" \
  --region us-east-1
```

---

## Current Status

✅ SNS Topic Created: `arn:aws:sns:us-east-1:364301298768:ses-bounce-complaint-feedback`

**Next Steps:**
1. Create domain identity in SES console (get the actual DNS record values)
2. Add DNS records to balkanbarbershop.com
3. Wait for verification
4. Submit production access request
