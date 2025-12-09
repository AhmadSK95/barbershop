# AWS SNS SMS Integration

## Overview
The barbershop application uses AWS SNS (Simple Notification Service) for sending SMS notifications. SMS notifications are **optional** and **non-blocking** - the application works perfectly without SMS configured.

## Features
- ✅ **Graceful Failure**: SMS failures never block booking operations
- ✅ **SMS Consent**: Only sends to users who opted in
- ✅ **DND List**: Respects Do Not Disturb numbers
- ✅ **E.164 Format**: Automatic phone number normalization
- ✅ **Transactional**: Uses AWS SNS transactional SMS type

## SMS Notification Types

### 1. Customer Booking Confirmation
Sent when a booking is created
```
Hi {name}! Your appointment at Balkan Barber is confirmed for {date} at {time} with {barber}. See you soon!
```

### 2. Barber Booking Notification
Sent to barber when they receive a new booking
```
New booking confirmed! Customer: {name}, Service: {service}, Date: {date} at {time}. Total: ${price}
```

### 3. Booking Cancellation
Sent when a booking is cancelled
```
Your appointment at Balkan Barber on {date} at {time} has been cancelled. Book again anytime!
```

### 4. Booking Reminder (Future)
Sent 24 hours before appointment
```
Reminder: Your appointment at Balkan Barber is tomorrow at {time} with {barber}.
```

## AWS Setup

### Step 1: Create IAM User for SNS
1. Go to AWS Console → IAM → Users
2. Click "Create user"
3. Username: `barbershop-sns`
4. Enable "Programmatic access"
5. Attach policy: `AmazonSNSFullAccess` (or create custom policy below)

**Custom Policy (Recommended - Least Privilege):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "*"
    }
  ]
}
```

6. Save the Access Key ID and Secret Access Key

### Step 2: Configure SNS Settings (Optional)
1. Go to AWS Console → SNS → Text messaging (SMS)
2. In "Account settings":
   - Default message type: **Transactional**
   - Default sender ID: `Barbershop` (not supported in US)
   - Spending limit: Set according to your needs

### Step 3: Enable SMS in AWS SNS Sandbox (If Needed)
If your AWS account is in SNS sandbox:
1. Go to SNS → Text messaging (SMS) → Sandbox destination phone numbers
2. Add and verify phone numbers you want to test with
3. Request production access if needed

## Environment Variables

Add these to your `.env` file:

```bash
# AWS SNS Configuration (Optional - SMS notifications)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_SNS_SENDER_ID=Barbershop  # Optional, not supported in US
```

### Environment Variable Details

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AWS_REGION` | No* | AWS region for SNS | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | No* | IAM user access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | No* | IAM user secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_SNS_SENDER_ID` | No | Sender ID (not supported in US) | `Barbershop` |

*Required only if you want SMS notifications enabled

## Testing

### Test Configuration Status
```bash
node test-sns-sms.js
```

This will show:
- ✅ Whether SNS is configured
- ✅ If credentials are set
- ✅ Test SMS send result (non-blocking)

### Expected Outputs

**Without Configuration:**
```
⚠️  AWS SNS not configured - SMS notifications disabled
This is expected behavior - the app will work without SMS.
```

**With Configuration:**
```
✅ SMS sent successfully via AWS SNS!
Message ID: f1a2b3c4-5678-90ab-cdef-EXAMPLE12345
```

**SMS Skipped (No Consent):**
```
⚠️  SMS was skipped: no_consent
```

## Database Setup

The SMS service requires these database tables:

### Users Table
Must have `sms_consent` column:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT false;
```

### DND Table (Optional)
For users who want to opt-out:
```sql
CREATE TABLE IF NOT EXISTS sms_dnd_numbers (
  phone_number VARCHAR(20) PRIMARY KEY,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Implementation Details

### Service Location
`backend/services/sns-sms.js`

### Controller Integration
- `backend/src/controllers/bookingController.js`
  - Customer SMS on booking creation
  - Barber SMS on booking creation
  - Cancellation SMS
- `backend/src/controllers/barberController.js`
  - Barber SMS on status update

### Error Handling
All SMS operations use `.catch()` to ensure failures don't block:

```javascript
await sendBookingConfirmationSMS(phone, details).catch(err => {
  console.error('SMS notification failed (non-blocking):', err.message);
});
```

## Phone Number Format

The service automatically converts to E.164 format:
- `3472957109` → `+13472957109`
- `+1-347-295-7109` → `+13472957109`
- `(347) 295-7109` → `+13472957109`

Default country code: **+1 (USA)**

## SMS Consent Flow

Users must opt-in to receive SMS:

1. **Registration/Profile Update**: Add checkbox for SMS consent
2. **Database Update**: Set `sms_consent = true` for user's phone
3. **Verification** (Recommended): Send verification code via SMS
4. **DND List**: Users can opt-out anytime

### Frontend Implementation (Future)
```jsx
<input 
  type="checkbox" 
  checked={smsConsent}
  onChange={(e) => setSmsConsent(e.target.checked)}
/>
<label>
  I agree to receive SMS notifications about my appointments
</label>
```

## Costs

AWS SNS SMS pricing (as of 2024):
- **US**: ~$0.00645 per SMS
- **Transactional messages**: Higher delivery rate
- **Free Tier**: None for SMS

Estimate: 1,000 bookings/month = ~$6.45/month

## Troubleshooting

### SMS Not Sending

1. **Check Configuration**
   ```bash
   node test-sns-sms.js
   ```

2. **Check Logs**
   ```
   📱 SMS skipped (SNS not configured)
   📱 SMS skipped (invalid phone number)
   📱 SMS skipped for +13472957109 (no consent)
   📱 SMS skipped for +13472957109 (DND list)
   ```

3. **Check AWS Console**
   - SNS → Text messaging (SMS) → Sandbox
   - CloudWatch Logs for errors

4. **Verify SMS Consent**
   ```sql
   SELECT phone, sms_consent FROM users WHERE phone = '+13472957109';
   ```

### Common Issues

**Issue**: SMS not received in US
- **Cause**: Sender ID not supported in US
- **Solution**: Remove `AWS_SNS_SENDER_ID` or leave blank

**Issue**: Access Denied error
- **Cause**: IAM policy insufficient
- **Solution**: Verify `sns:Publish` permission

**Issue**: Phone number invalid
- **Cause**: Non-US number without country code
- **Solution**: Store numbers in E.164 format

## Production Deployment

### Docker Compose
Add to `docker-compose.yml`:
```yaml
environment:
  AWS_REGION: ${AWS_REGION:-us-east-1}
  AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
  AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
  AWS_SNS_SENDER_ID: ${AWS_SNS_SENDER_ID}
```

### Security Best Practices
- ✅ Use IAM role instead of access keys (EC2/ECS)
- ✅ Enable CloudWatch logging
- ✅ Set spending limit in SNS settings
- ✅ Use AWS Secrets Manager for credentials
- ✅ Implement rate limiting for SMS sends

## Monitoring

### CloudWatch Metrics
Monitor these SNS metrics:
- `NumberOfMessagesPublished`
- `NumberOfNotificationsFailed`
- `SMSSuccessRate`

### Application Logs
```bash
# Check SMS status
docker-compose logs backend | grep "SMS"

# Count successful sends
docker-compose logs backend | grep "✅ SMS sent" | wc -l

# Count skipped sends
docker-compose logs backend | grep "📱 SMS skipped" | wc -l
```

## Future Enhancements

- [ ] SMS verification on signup
- [ ] Scheduled reminder SMS (24h before)
- [ ] SMS rate limiting per user
- [ ] International phone number support
- [ ] SMS delivery status tracking
- [ ] Admin dashboard for SMS analytics
- [ ] A/B testing for SMS templates
- [ ] Two-way SMS (reply to cancel)

## Support

For issues with:
- **AWS SNS**: Check AWS SNS documentation
- **Phone numbers**: Verify E.164 format
- **Consent**: Check database `sms_consent` column
- **Integration**: Review `backend/services/sns-sms.js`
