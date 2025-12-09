# AWS SNS Configuration Findings

**Date**: December 9, 2025  
**Account Region**: us-east-1

## ✅ Configuration Status

### Environment Variables
- ✅ `AWS_REGION`: us-east-1
- ✅ `AWS_ACCESS_KEY_ID`: Set and working
- ✅ `AWS_SECRET_ACCESS_KEY`: Set and working
- ✅ `AWS_SNS_SENDER_ID`: BalkanBarber (configured)

### Current SMS Settings
```
MonthlySpendLimit: $1.00
```

## 📞 Available Origination Numbers

### 1. +1-866-606-8075
- **Status**: Pending
- **Type**: Toll-free number (US 866 prefix)
- **Current State**: Not yet active

⚠️ **Important**: This number shows "Pending" status, which means it's being provisioned but not yet ready for use.

## 🚨 Critical Issues

### Issue 1: Monthly Spending Limit ($1)
Your AWS account has a **$1 monthly spending limit** for SMS.

**Impact**:
- At ~$0.00645 per SMS, you can only send **~155 SMS per month**
- This is very low for a production barbershop booking system
- Limit will be reached quickly with customer + barber notifications

**Solution**:
```
1. Go to AWS Console → SNS → Text messaging (SMS)
2. Click "Edit account SMS settings"
3. Increase "Account spend limit" to at least $50-100
4. Save changes
```

**Recommended Limits**:
- **Development**: $5-10/month (~800-1,500 SMS)
- **Small Shop**: $50/month (~7,700 SMS)
- **Production**: $100-500/month (~15,000-77,000 SMS)

### Issue 2: Toll-Free Number Pending
The toll-free number **+1-866-606-8075** is still being provisioned.

**What this means**:
- You requested a dedicated US number
- AWS is processing the request
- Usually takes 1-7 business days
- Cannot use this number until status = "Active"

**Check Status**:
```bash
node check-aws-sns-config.js
```

Or in AWS Console:
```
SNS → Phone numbers → Origination numbers
```

## 🌍 Sender ID Limitations

### For US Recipients (Your Primary Market)
❌ **Sender IDs NOT supported in the United States**

This means:
- `AWS_SNS_SENDER_ID=BalkanBarber` will be **ignored** for US recipients
- SMS will appear from a **random phone number** (AWS-assigned)
- This is an AWS/carrier limitation, not a bug

**Example of what customers see**:
```
From: +1-XXX-XXX-XXXX (random number)
Message: Hi John! Your appointment at Balkan Barber...
```

### Solutions for US Market

#### Option 1: Use Your Pending Toll-Free Number (Recommended)
Once **+1-866-606-8075** is active:

1. Update SMS service to use this as origination number:
   ```javascript
   // In services/sns-sms.js
   const params = {
     Message: message,
     PhoneNumber: normalizedPhone,
     MessageAttributes: {
       'AWS.SNS.SMS.OriginationNumber': {
         DataType: 'String',
         StringValue: '+18666068075'  // Your toll-free number
       },
       'AWS.SNS.SMS.SMSType': {
         DataType: 'String',
         StringValue: 'Transactional'
       }
     }
   };
   ```

2. Add to `.env`:
   ```bash
   AWS_SNS_ORIGINATION_NUMBER=+18666068075
   ```

**Benefits**:
- ✅ Consistent sender number (branding)
- ✅ Customers can save/recognize the number
- ✅ Can reply to SMS (future feature)
- ✅ Professional appearance

#### Option 2: Keep Using Short Codes (Current)
Continue with AWS-assigned random numbers:

**Pros**:
- ✅ No additional setup needed
- ✅ Works immediately
- ✅ Same cost

**Cons**:
- ❌ Different number each time
- ❌ No branding
- ❌ Customers can't reply
- ❌ Less professional

#### Option 3: Get a Local Phone Number
Request a local area code number (e.g., +1-347-XXX-XXXX for NYC):

**Pros**:
- ✅ Local presence
- ✅ Better trust from customers
- ✅ Can use for calls + SMS

**Cons**:
- ❌ More expensive than toll-free
- ❌ Limited to one area code

### For International Recipients
✅ Sender ID **IS supported** in most countries outside US:
- UK, EU, India, Canada, Australia, etc.
- `AWS_SNS_SENDER_ID=BalkanBarber` will show up

## 🎯 Recommendations

### Immediate Actions (Priority)

1. **✅ Increase Spending Limit** (CRITICAL)
   ```
   AWS Console → SNS → Account SMS settings
   Set limit: $50-100/month minimum
   ```

2. **⏳ Wait for Toll-Free Number**
   - Check status daily: `node check-aws-sns-config.js`
   - When active, update code to use it

3. **🧪 Test Current Setup**
   ```bash
   node test-sns-sms.js
   ```
   Note: Will use random numbers until toll-free is active

### Future Enhancements

4. **📊 Monitor Usage**
   - Set up CloudWatch alarms for SMS spend
   - Track SMS success/failure rates

5. **🔐 Enable SMS Verification**
   - Use toll-free number for 2FA codes
   - Verify phone numbers on signup

6. **💬 Enable Two-Way SMS**
   - Allow customers to reply "CANCEL" to cancel appointment
   - Requires toll-free number activation

## 📋 Next Steps Checklist

- [ ] Increase monthly spending limit to $50+
- [ ] Monitor toll-free number activation status
- [ ] Update SMS service to use toll-free number when active
- [ ] Test SMS sending with verified phone numbers
- [ ] Set up CloudWatch monitoring
- [ ] Add SMS consent checkbox to frontend
- [ ] Enable users in database for SMS (`sms_consent = true`)

## 🔍 Useful Commands

### Check AWS Configuration
```bash
node check-aws-sns-config.js
```

### Test SMS Sending
```bash
node test-sns-sms.js
```

### Check SMS in Database
```sql
-- See users with SMS consent
SELECT email, phone, sms_consent FROM users WHERE sms_consent = true;

-- Enable SMS for specific user
UPDATE users SET sms_consent = true WHERE email = 'user@example.com';
```

## 📞 Support

### AWS Support Tickets
If toll-free number is pending for >7 days:
1. AWS Console → Support → Create case
2. Type: Service limit increase
3. Service: SNS SMS
4. Issue: Toll-free number activation status

### Check Number Status Programmatically
```javascript
const { ListOriginationNumbersCommand } = require('@aws-sdk/client-sns');
// See check-aws-sns-config.js for full implementation
```

## 💰 Cost Estimates

With current setup:

| Scenario | SMS/Month | Cost at $0.00645/SMS | Current Limit |
|----------|-----------|----------------------|---------------|
| Current Limit | 155 | $1.00 | ❌ **Hit limit** |
| Small Shop | 1,000 | $6.45 | ❌ Exceeds $1 |
| Medium Shop | 5,000 | $32.25 | Need $50 limit |
| Large Shop | 10,000 | $64.50 | Need $100 limit |

**Recommendation**: Set limit to **$50-100** to avoid service interruption.

## ✅ What's Working

- ✅ AWS credentials configured correctly
- ✅ SNS client connects successfully
- ✅ SMS service code is production-ready
- ✅ Graceful failure handling in place
- ✅ Toll-free number requested (pending activation)
- ✅ Sender ID configured (works for non-US)

## ⚠️ What Needs Attention

- ⚠️ **Monthly spending limit too low ($1)**
- ⚠️ Toll-free number still pending
- ⚠️ Sender ID won't work for US recipients (by design)
- ⚠️ Need to enable SMS consent in database
- ⚠️ Consider CloudWatch monitoring

---

**Generated by**: check-aws-sns-config.js  
**Last Updated**: December 9, 2025
