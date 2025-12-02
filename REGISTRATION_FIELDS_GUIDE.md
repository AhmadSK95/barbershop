# Registration Fields Guide

## Overview
The registration form has been updated to include three distinct fields for better separation of authentication and notification purposes:

1. **Username** - Login identifier
2. **Email** - Login authentication email  
3. **Contact Email** - Notification and communication email

## Field Purposes

### 1. Username
- **Purpose**: Primary login identifier
- **Used for**: Authentication (login)
- **Database**: `users.username` (UNIQUE, NOT NULL)
- **Format**: 3-50 characters, letters/numbers/dots/underscores/hyphens only
- **Example**: `john_doe`, `jsmith`, `john.smith`

### 2. Email Address
- **Purpose**: Login authentication (can be used as alternative to username)
- **Used for**: Login credential, password reset
- **Database**: `users.email` (non-unique, NOT NULL)
- **Format**: Valid email format (validated by RFC 5322)
- **Example**: `john@example.com`
- **Note**: Can be same as username (e.g., `john@example.com` for both)

### 3. Contact Email
- **Purpose**: All notifications and communications
- **Used for**: 
  - AWS SES verification emails
  - Booking confirmations
  - Account verification emails
  - Password reset emails
  - All transactional emails
- **Database**: `users.contact_email` (NOT NULL)
- **Format**: Valid email format
- **Example**: `john.doe@gmail.com`

## Smart Auto-Populate Checkboxes

### Checkbox 1: "Same as username"
- **Location**: Below Email Address field
- **Effect**: When checked, Email Address auto-populates from Username field
- **Use case**: User wants to use their email as both username and login email
- **Example**: Username: `john@example.com` → Email: `john@example.com`
- **Chain effect**: If "Same as email address" is also checked, Contact Email updates too

### Checkbox 2: "Same as email address"
- **Location**: Below Contact Email field
- **Effect**: When checked, Contact Email auto-populates from Email Address field
- **Use case**: User wants to use the same email for login and notifications
- **Example**: Email: `john@example.com` → Contact Email: `john@example.com`

## Real-World Use Cases

### Case 1: All Three Different
```
Username:       jsmith
Email:          jsmith@company.com
Contact Email:  john.smith@gmail.com
```
**Scenario**: User works at a company, wants to use work email for login but personal email for notifications

### Case 2: Email = Username, Different Contact Email
```
Username:       john@example.com
Email:          john@example.com  (✓ Same as username)
Contact Email:  john.personal@gmail.com
```
**Scenario**: User wants email-based login but separate notification email

### Case 3: All Three Same
```
Username:       john@example.com
Email:          john@example.com  (✓ Same as username)
Contact Email:  john@example.com  (✓ Same as email address)
```
**Scenario**: Simple setup, single email for everything

### Case 4: Unique Username, Same Email for Login & Notifications
```
Username:       jsmith123
Email:          john@example.com
Contact Email:  john@example.com  (✓ Same as email address)
```
**Scenario**: User prefers short username but wants same email for login and notifications

## Backend Implementation

### Registration Endpoint (`/api/auth/register`)

**Request Body**:
```json
{
  "username": "jsmith",
  "email": "jsmith@example.com",
  "contactEmail": "john.personal@gmail.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+11234567890",
  "smsConsent": true
}
```

**Validation**:
- All three fields validated for format
- Username checked for uniqueness
- Email validated by RFC 5322 format
- Contact email validated by RFC 5322 format
- Password validated for strength (8+ chars, uppercase, lowercase, number, special char)

**Database Insert**:
```sql
INSERT INTO users (username, email, contact_email, password, first_name, last_name, phone, verification_token, sms_consent, sms_consent_date)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
```

### AWS SES Integration

**Important**: AWS SES uses `contact_email` for all notifications

```javascript
// Backend logs during registration
console.log(`📧 Login email (authentication): ${email}`);
console.log(`📬 Contact email (notifications): ${contactEmail}`);
console.log(`Verifying contact email identity in AWS SES: ${contactEmail}`);
await verifyEmailIdentity(contactEmail);
await sendVerificationEmail(contactEmail, firstName, verificationToken);
```

### Login Endpoint (`/api/auth/login`)

**Supports both username and email for login**:
```sql
SELECT * FROM users 
WHERE username = $1 OR email = $1
```

**Example logins that work**:
- Username: `jsmith`
- Email: `jsmith@example.com`

## Frontend Components

### Modified Files
1. `src/pages/RegisterPage.js`
   - Added `contactEmail` state
   - Added `emailSameAsUsername` checkbox state
   - Added `contactEmailSameAsEmail` checkbox state
   - Smart auto-populate logic in `handleChange`
   - Checkbox handlers for syncing fields

### Form Structure
```jsx
<form>
  <input name="username" required />
  
  <input name="email" required disabled={emailSameAsUsername} />
  <checkbox onChange={handleEmailSameAsUsername}>Same as username</checkbox>
  
  <input name="contactEmail" required disabled={contactEmailSameAsEmail} />
  <checkbox onChange={handleContactEmailSameAsEmail}>Same as email address</checkbox>
  
  {/* other fields */}
</form>
```

## Database Schema

### `users` table columns:
- `username` VARCHAR(100) UNIQUE NOT NULL - Login identifier
- `email` VARCHAR(255) NOT NULL - Login email (non-unique, can match username)
- `contact_email` VARCHAR(255) NOT NULL DEFAULT 'ahmad2609.as@gmail.com' - Notification email

## Migration Status

✅ **Completed Migrations**:
1. `add-username-migration.js` - Added `username` column
2. `add-contact-email-migration.js` - Added `contact_email` column

All existing users have default values:
- `email`: `ahmad2609.as@gmail.com`
- `contact_email`: `ahmad2609.as@gmail.com`
- `username`: Copied from original email addresses

## Testing

### Manual Testing Steps
1. Navigate to: http://34.226.11.9/register
2. Fill in all fields with different values
3. Test checkboxes:
   - Check "Same as username" → Email should match Username
   - Check "Same as email address" → Contact Email should match Email
   - Uncheck to manually edit
4. Submit form
5. Check backend logs for:
   - `📧 Login email (authentication): <email>`
   - `📬 Contact email (notifications): <contactEmail>`
   - `✅ AWS SES verification request sent to <contactEmail>`
   - `📨 Verification email sent to contact email: <contactEmail>`

### Expected Behavior
- **Registration**: Creates user with all three fields
- **Email verification**: Sent to `contact_email`
- **Login**: Works with either `username` or `email`
- **Booking confirmations**: Sent to `contact_email`
- **Password reset**: Looks up by `email`, sends to `contact_email`

## Security Notes

1. **Email validation**: Both email and contact_email validated server-side
2. **Username uniqueness**: Enforced at database level (UNIQUE constraint)
3. **No email uniqueness**: Multiple users can share the same email/contact_email
4. **Sanitization**: All inputs sanitized and trimmed
5. **Case insensitive**: All emails and usernames converted to lowercase

## Support

For issues or questions:
1. Check backend logs: `ssh ubuntu@34.226.11.9 'cd /home/ubuntu/barbershop && docker compose logs backend'`
2. Check database: `docker exec -it barbershop_postgres psql -U barbershop_user -d barbershop_db -c "SELECT username, email, contact_email FROM users LIMIT 5;"`
3. Verify AWS SES: Check AWS Console → SES → Verified Identities
