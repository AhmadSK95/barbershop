# Squarespace/Square Integration & Migration Guide

## What You Have Access To

With Squarespace + Square credentials, you can:

### ✅ What I Can Automate

#### 1. **Square Payment Integration** (High Priority)
- **What**: Add Square payment processing to booking system
- **Why**: Accept credit card payments at time of booking
- **Implementation**:
  - Install Square SDK
  - Add payment form to booking flow
  - Process payments via Square API
  - Store transaction IDs in database
  - Send payment receipts via email
- **Time**: 4-6 hours development
- **Your Role**: Provide Square API credentials

#### 2. **Customer Data Migration**
- **What**: Export existing customers from Squarespace/Square and import to new system
- **How**: 
  - Export customer list (CSV)
  - Transform data to match new schema
  - Import to PostgreSQL database
  - Send password reset emails to all customers
- **Time**: 1-2 hours
- **Your Role**: Export CSV from Squarespace admin

#### 3. **Booking History Migration**
- **What**: Import past appointments to new system
- **How**:
  - Export booking history (CSV)
  - Map to new booking schema
  - Import with proper status (completed/cancelled)
  - Preserve customer relationship
- **Time**: 1-2 hours
- **Your Role**: Export booking data CSV

#### 4. **Service Menu Sync**
- **What**: Match current services/prices from Squarespace
- **How**:
  - You provide current service list
  - I update database migration script
  - Deploy updated services
- **Time**: 30 minutes
- **Your Role**: Share current service menu

#### 5. **Email Template Migration**
- **What**: Use same email branding/content as Squarespace
- **How**:
  - You share current email templates
  - I update HTML templates to match
  - Deploy new email designs
- **Time**: 1 hour
- **Your Role**: Forward example booking emails

#### 6. **Domain DNS Management**
- **What**: Automated DNS updates via registrar API (if supported)
- **How**:
  - Some registrars (Cloudflare, Route53) have APIs
  - Script DNS record changes
  - Automated SSL certificate setup
- **Time**: 1 hour (if API available)
- **Your Role**: Provide API credentials (if available)

---

## What You Must Do Manually

### 🔧 Your Manual Tasks

#### 1. **Export Data from Squarespace** (30 minutes)
**Steps**:
1. Log into Squarespace admin
2. Go to **Settings → Advanced → Import/Export**
3. Export customer data (CSV)
4. Export booking/appointment data (if available)
5. Download and share files with me

**What to Export**:
- Customer list (name, email, phone)
- Booking history
- Service menu with prices
- Any custom forms/fields

#### 2. **Square API Credentials** (15 minutes)
**Steps**:
1. Log into Square Dashboard: https://squareup.com/dashboard
2. Go to **Apps → Manage Apps**
3. Click **My Apps** → **+ Create App**
4. Name: "Balkan Barbers Booking"
5. Get credentials:
   - **Application ID**
   - **Access Token** (Production + Sandbox)
   - **Location ID**

**What to Share**:
```env
SQUARE_APPLICATION_ID=sq0idp-xxxxx
SQUARE_ACCESS_TOKEN=EAAAxxxx
SQUARE_LOCATION_ID=L1234xxxx
SQUARE_ENVIRONMENT=production
```

#### 3. **DNS Configuration** (15 minutes)
**Steps**:
1. Log into domain registrar
2. Add A records (as described in SUBDOMAIN_SETUP_GUIDE.md)
3. Verify DNS propagation

**Cannot Automate Because**:
- Requires login to registrar
- Security/MFA requirements
- Manual verification steps

#### 4. **Squarespace Announcement** (5 minutes)
**Steps**:
1. Add banner to Squarespace site: "New booking system launching soon at new.balkanbarbers.com"
2. Add announcement block on homepage
3. Update social media links (once ready)

#### 5. **Final Domain Switch** (5 minutes)
**Steps**:
1. Update main domain A record in registrar
2. Verify new site is live
3. Keep Squarespace active for 2-4 weeks as backup

---

## Integration Priority Plan

### Phase 1: Payment Integration (Highest ROI)

**Why First**: Enables online payments, reduces no-shows, increases revenue

**What I'll Build**:
```javascript
// Square payment flow
1. Customer books appointment
2. Payment form appears (Square Web Payments SDK)
3. Customer enters card details (secure Square iframe)
4. Process payment via Square API
5. Store transaction ID in booking record
6. Send receipt email
7. Booking confirmed only if payment successful
```

**Features**:
- Credit/Debit card processing
- Apple Pay / Google Pay support
- Secure payment tokenization
- Automatic receipts
- Refund capability (admin panel)
- Payment history tracking

**Pricing Options**:
- Full payment upfront
- Deposit (e.g., $10-20)
- Pay at shop (existing flow)

**Your Input Needed**:
- Square credentials
- Pricing policy (full/deposit/optional)
- Cancellation/refund policy

**Timeline**: 
- Development: 4 hours
- Testing: 1 hour
- Deployment: 30 minutes

---

### Phase 2: Customer Data Migration (Quick Win)

**What I'll Do**:

1. **Create Import Script**:
```javascript
// backend/src/scripts/import-customers.js
- Read CSV file
- Validate email/phone formats
- Hash temporary passwords
- Insert into database
- Send welcome/reset emails
```

2. **Migration Process**:
```bash
# On server
node backend/src/scripts/import-customers.js customers.csv

# Output:
✅ Imported 250 customers
✅ Sent 250 password reset emails
⚠️  10 duplicate emails (skipped)
❌ 5 invalid emails (logged)
```

3. **Customer Communication**:
   - Automated email: "We've upgraded! Reset your password at new.balkanbarbers.com"
   - Include booking history (if imported)
   - Offer incentive for first booking on new system

**What You Provide**:
- Customer CSV export from Squarespace
- Approval of email template

**Timeline**: 
- Script development: 1 hour
- Data processing: 15 minutes
- Email sending: 30 minutes

---

### Phase 3: Booking History Migration (Optional)

**Value**: Customers see their past appointments, builds trust

**Process**:
```javascript
// Import past bookings
1. Parse booking CSV
2. Match customers by email
3. Create historical bookings (status: completed)
4. Link to barbers (by name matching)
5. Calculate stats (total visits, favorite barber, etc.)
```

**Customer Benefits**:
- See booking history in profile
- "You've visited us 12 times!" message
- Loyalty tracking
- Favorite barber suggestion

**Your Input**:
- Booking history CSV
- Data mapping guidance

**Timeline**: 1-2 hours

---

### Phase 4: Service Menu Sync (Quick)

**Current Services** (from code):
- Regular Haircut ($30)
- Skin Fade ($35)
- Beard Trim ($15)
- Hot Towel Shave ($25)

**What I Need**:
- Confirm current prices
- Any missing services
- Any service descriptions to update

**Timeline**: 30 minutes

---

## Technical Implementation: Square Payments

### Architecture

```
┌─────────────────┐
│  Customer       │
│  Booking Page   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Square Web     │
│  Payments SDK   │ (Secure iframe for card entry)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Square API     │
│  Process Payment│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend        │
│  Store Transaction
│  Confirm Booking│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Database       │
│  + Email/SMS    │
└─────────────────┘
```

### Database Schema Addition

```sql
-- Add payment tracking to bookings table
ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN payment_method VARCHAR(20);
ALTER TABLE bookings ADD COLUMN payment_amount DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN square_payment_id VARCHAR(255);
ALTER TABLE bookings ADD COLUMN square_receipt_url TEXT;

-- Create payments table for detailed tracking
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  square_payment_id VARCHAR(255) UNIQUE,
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20),
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Environment Variables Needed

```env
# Square Configuration
SQUARE_APPLICATION_ID=sq0idp-xxxxx
SQUARE_ACCESS_TOKEN=EAAAxxxx
SQUARE_LOCATION_ID=L1234xxxx
SQUARE_ENVIRONMENT=production  # or 'sandbox' for testing

# Payment Settings
REQUIRE_PAYMENT=false  # true = mandatory, false = optional
DEPOSIT_AMOUNT=20      # deposit amount if not full payment
```

### New Files I'll Create

```
backend/
  src/
    controllers/
      paymentController.js      # Square payment processing
    routes/
      paymentRoutes.js          # Payment endpoints
    scripts/
      import-customers.js       # Customer migration
      import-bookings.js        # Booking history import
    utils/
      squareClient.js           # Square API wrapper

frontend/
  src/
    components/
      PaymentForm.js            # Square payment UI
      BookingPayment.js         # Payment step in booking flow
    pages/
      PaymentSuccessPage.js     # Confirmation page
```

---

## Migration Decision Matrix

| Feature | Priority | Development Time | Your Time | Impact |
|---------|----------|------------------|-----------|--------|
| **Square Payments** | 🔴 Critical | 4-6 hours | 15 min | High revenue impact |
| **Customer Import** | 🟡 Medium | 1 hour | 30 min | Smooth transition |
| **Booking History** | 🟢 Nice-to-have | 2 hours | 30 min | Customer trust |
| **Service Sync** | 🟡 Medium | 30 min | 5 min | Accuracy |
| **Email Templates** | 🟢 Nice-to-have | 1 hour | 10 min | Brand consistency |
| **DNS/SSL** | 🔴 Critical | 1 hour | 15 min | Required for launch |

---

## Recommended Approach

### Week 1: Core Integration
**Day 1-2**: 
- ✅ You provide Square credentials
- ✅ I implement payment integration
- ✅ Test in Square sandbox

**Day 3**:
- ✅ Deploy to production
- ✅ Test real payment flow

### Week 2: Data Migration
**Day 1**:
- ✅ You export customer data
- ✅ I create import script
- ✅ Test with sample data

**Day 2**:
- ✅ Full customer import
- ✅ Send password reset emails
- ✅ Verify data integrity

### Week 3: Soft Launch
**Day 1**:
- ✅ You add DNS records
- ✅ I set up SSL
- ✅ Update environment variables

**Day 2-7**:
- ✅ Internal testing
- ✅ Fix any issues
- ✅ Add banner to Squarespace

### Week 4: Full Launch
- ✅ Update main domain DNS
- ✅ Monitor for issues
- ✅ Keep Squarespace active as backup

---

## What to Provide Now

### Immediate (For Payment Integration):
```
1. Square Application ID
2. Square Access Token (Production)
3. Square Location ID
4. Pricing policy: Full payment / Deposit / Optional?
```

### This Week (For Migration):
```
1. Customer data export (CSV)
2. Booking history export (CSV)
3. Current service menu with prices
4. Example booking confirmation email from Squarespace
```

### When Ready (For Launch):
```
1. Domain registrar login (for DNS)
2. Approval to send migration emails to customers
3. Go-live date preference
```

---

## Cost Analysis

### Current Squarespace Costs:
- Squarespace subscription: ~$30-40/month
- Square transaction fees: 2.6% + 10¢ per transaction

### New System Costs:
- AWS EC2: ~$20/month (current setup)
- Square fees: Same (2.6% + 10¢)
- SSL Certificate: Free (Let's Encrypt)
- Domain: $12-15/year
- AWS SES: ~$1-5/month

**Monthly Savings**: ~$10-20/month  
**Annual Savings**: ~$120-240/year

### Additional Benefits:
- ✅ Full control over features
- ✅ No platform limitations
- ✅ Custom branding
- ✅ Advanced analytics
- ✅ Direct database access

---

## Next Steps

**Choose Your Path**:

### Option A: Full Integration (Recommended)
Timeline: 3-4 weeks
- Square payments
- Customer migration  
- Booking history
- Full launch

### Option B: Minimal Integration (Faster)
Timeline: 1-2 weeks
- DNS + SSL only
- Manual customer migration
- Add payments later
- Quick launch

### Option C: Phased Approach (Safest)
Timeline: 4-6 weeks
- Week 1: Subdomain + SSL
- Week 2: Square payments
- Week 3: Customer migration
- Week 4: Soft launch
- Week 5-6: Full launch

---

## I'm Ready to Start

**Tell me**:
1. Which option you prefer (A/B/C)?
2. Can you provide Square credentials today?
3. Can you export customer data this week?
4. What's your target launch date?

I'll prioritize accordingly and start building! 🚀
