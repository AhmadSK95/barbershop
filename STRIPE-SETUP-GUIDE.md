# Stripe Payment Integration - Setup Guide

## Overview
This guide explains how to set up and use the Stripe payment integration that allows customers to save payment methods during booking and enables admins to charge saved cards from the dashboard.

## 🔑 Prerequisites

1. **Stripe Account**: Create a free account at [stripe.com](https://stripe.com)
2. **API Keys**: Get your test/live keys from the Stripe Dashboard

## 📦 Installation

### 1. Install Dependencies (Already Done)
The required packages are already in `package.json`:
- Backend: `stripe` (v20.0.0)
- Frontend: `@stripe/stripe-js` and `@stripe/react-stripe-js`

### 2. Configure Environment Variables

#### Backend Configuration
Edit `backend/.env` (or create from `backend/.env.example`):

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**To get your keys:**
1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click "Developers" → "API keys"
3. Copy "Publishable key" (starts with `pk_test_`) and "Secret key" (starts with `sk_test_`)

#### Frontend Configuration
Edit `.env` in the root directory (or create from `.env.example`):

```bash
# Stripe Publishable Key (Frontend)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Backend API URL
REACT_APP_API_URL=http://localhost:5001/api
```

### 3. Run Database Migration

Ensure PostgreSQL is running, then execute:

```bash
cd backend
node src/config/add-stripe-payment-fields.js
```

This adds the following columns to the `bookings` table:
- `stripe_customer_id` - Stripe customer ID
- `stripe_payment_method_id` - Saved payment method ID
- `card_brand` - Card brand (Visa, Mastercard, etc.)
- `card_last_4` - Last 4 digits of card
- `payment_status` - Payment status (pending/paid/refunded)
- `payment_amount` - Amount charged
- `payment_verified` - Whether card was verified
- `stripe_charge_id` - Stripe charge/payment intent ID

Also creates a `payments` table for detailed transaction tracking.

## 🔄 How It Works

### Customer Flow (Booking)

1. **Customer Creates Booking**
   - Selects service, barber, date/time
   - Proceeds to payment step

2. **Card Verification**
   - Customer enters card details in Stripe Payment Element
   - System creates Stripe Customer if not exists
   - Card verified with $1 authorization (immediately released)
   - Payment method saved to Stripe and database
   - Booking created with `payment_status = 'pending'`

3. **Booking Confirmation**
   - Customer receives booking confirmation
   - Payment is NOT charged yet
   - Card is saved for checkout at the store

### Admin Flow (Dashboard Payment)

1. **View Bookings**
   - Admin logs into dashboard
   - Sees all bookings with payment status
   - Payment column shows: ✓ Paid, ⏳ Pending, or ↩ Refunded
   - Card column shows saved card (e.g., "Visa ••••4242")

2. **Confirm Booking**
   - Admin changes booking status to "Confirmed"
   - "💳 Pay Now" button appears for bookings with saved payment methods

3. **Charge Payment**
   - Admin clicks "Pay Now"
   - Payment modal shows:
     - Booking details (customer, service, barber)
     - Saved card information
     - Total amount
     - Confirmation warning
   - Admin clicks "Charge $XX.XX"
   - Stripe charges the saved card
   - Booking updated to `payment_status = 'paid'`
   - Success notification displayed

4. **Handle Failures**
   - If payment fails (insufficient funds, expired card):
     - Error message shown to admin
     - Payment status remains "pending"
     - Admin can retry or request alternative payment

## 🎨 UI Features

### Admin Dashboard

**New Columns:**
- **Payment Status Badge**
  - Green: ✓ Paid
  - Yellow: ⏳ Pending
  - Gray: ↩ Refunded

- **Card Info**
  - Displays: "Visa ••••4242"
  - Shows "No card saved" if no payment method

- **Pay Now Button**
  - Visible only when:
    - Booking is confirmed or completed
    - Payment status is pending
    - Customer has saved payment method
  - Green button with card icon
  - Opens payment confirmation modal

### Payment Modal

Styled to match the barbershop theme:
- Dark brown gradient background
- Gold borders and accents
- Clear booking summary
- Card information display
- Total amount highlighted
- Warning messages
- Cancel and Confirm buttons

## 🧪 Testing

### Test Cards (Stripe Test Mode)

Use these cards in test mode:

| Card Number | Behavior |
|-------------|----------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Decline (generic) |
| 4000 0000 0000 9995 | Decline (insufficient funds) |
| 4000 0027 6000 3184 | Requires authentication (3D Secure) |

**Expiration:** Any future date (e.g., 12/34)  
**CVC:** Any 3 digits (e.g., 123)  
**ZIP:** Any 5 digits (e.g., 12345)

### Test Workflow

1. **Test Card Verification:**
   ```bash
   # Start backend
   cd backend && npm run dev
   
   # Start frontend (new terminal)
   npm start
   ```

2. **Create Test Booking:**
   - Register/login as customer
   - Create a booking
   - Enter test card: 4242 4242 4242 4242
   - Complete booking

3. **Test Admin Charging:**
   - Login as admin (admin@barbershop.com / Admin@123456)
   - Go to Dashboard
   - Find the test booking
   - Change status to "Confirmed"
   - Click "Pay Now"
   - Confirm payment

4. **Verify in Stripe:**
   - Log into Stripe Dashboard
   - Go to Payments → All payments
   - See the $1 verification (canceled)
   - See the actual charge

## 🔒 Security

### PCI Compliance
✅ **You are PCI compliant!** Stripe handles all card data:
- Card details never touch your servers
- Only tokenized payment methods stored
- Stripe Payment Elements are PCI-compliant by default

### Best Practices Implemented
- Admin-only payment charging (role-based access control)
- HTTPS required in production
- Webhook signature verification
- Rate limiting on payment endpoints
- SQL injection prevention (parameterized queries)

## 🚨 Troubleshooting

### "Payment initialization failed"
**Cause:** Stripe keys not configured or invalid  
**Fix:** 
1. Check `.env` and `backend/.env` for correct keys
2. Ensure keys start with `pk_test_` and `sk_test_`
3. Restart both servers after changing `.env`

### "No saved payment method for this booking"
**Cause:** Customer didn't complete card verification during booking  
**Fix:** Customer must rebook and complete payment verification

### "Stripe customer not found"
**Cause:** Database migration not run  
**Fix:** Run `node backend/src/config/add-stripe-payment-fields.js`

### Webhook Errors (Production Only)
**Cause:** Webhook secret not configured  
**Fix:**
1. In Stripe Dashboard: Developers → Webhooks → Add endpoint
2. URL: `https://yourdomain.com/api/payments/webhook`
3. Events: `checkout.session.completed`, `checkout.session.expired`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET` in `.env`

## 📊 Database Schema

### Bookings Table (Payment Columns)
```sql
ALTER TABLE bookings ADD COLUMN stripe_customer_id VARCHAR(255);
ALTER TABLE bookings ADD COLUMN stripe_payment_method_id VARCHAR(255);
ALTER TABLE bookings ADD COLUMN card_last_4 VARCHAR(4);
ALTER TABLE bookings ADD COLUMN card_brand VARCHAR(50);
ALTER TABLE bookings ADD COLUMN payment_verified BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN payment_amount DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN stripe_charge_id VARCHAR(255);
```

### Payments Table
```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  user_id INTEGER REFERENCES users(id),
  stripe_charge_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  stripe_payment_method_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) NOT NULL,
  card_last_4 VARCHAR(4),
  card_brand VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  refunded_at TIMESTAMP,
  refund_amount DECIMAL(10,2),
  refund_reason TEXT
);
```

## 🚀 Production Deployment

### Before Going Live

1. **Switch to Live Keys:**
   ```bash
   STRIPE_SECRET_KEY=sk_live_...
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

2. **Enable HTTPS:**
   - Stripe requires HTTPS for webhooks
   - Use Let's Encrypt or your hosting provider's SSL

3. **Set Up Webhooks:**
   - Add webhook endpoint in Stripe Dashboard
   - URL: `https://yourdomain.com/api/payments/webhook`
   - Update `STRIPE_WEBHOOK_SECRET` in `.env`

4. **Test Live Mode:**
   - Use real card to test (will actually charge)
   - Refund test transactions immediately

5. **Monitor Stripe Dashboard:**
   - Check payment success rates
   - Review failed payments
   - Set up email alerts for disputes

## 💡 Additional Features (Not Implemented)

These were intentionally excluded but can be added:
- Automatic email receipts
- Partial refunds from UI
- Payment analytics dashboard
- Recurring payments
- Tipping functionality
- Multiple payment methods (PayPal, Apple Pay)

## 📞 Support

**Stripe Support:** https://support.stripe.com  
**Stripe Test Cards:** https://stripe.com/docs/testing  
**Stripe Dashboard:** https://dashboard.stripe.com

## 🎉 Summary

You now have a fully integrated Stripe payment system that:
- ✅ Saves customer cards securely
- ✅ Allows admin checkout from dashboard
- ✅ Is PCI compliant (no card data on your servers)
- ✅ Includes payment status tracking
- ✅ Has a beautiful, themed UI
- ✅ Is production-ready with proper security

Happy charging! 💳✨
