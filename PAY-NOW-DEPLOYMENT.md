# Pay Now Feature - Deployment Guide

## Overview
The "Pay Now" feature allows customers to add payment to existing bookings from their booking history, rather than requiring payment before booking confirmation. This uses Stripe Checkout (hosted payment page) which simplifies PCI compliance and avoids raw card data handling issues.

## Features Implemented
1. ✅ "Pay Now" button in booking history (ProfilePage.js) for unpaid bookings
2. ✅ Stripe Checkout session creation for existing bookings
3. ✅ Payment success page with automatic redirect
4. ✅ Stripe webhook handler to update booking payment status
5. ✅ Payment field tracking (card brand, last 4 digits, payment status)

## Environment Variables Required

### Backend (.env)
Add the following to your `.env` file (both local and production):

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY

# Stripe Webhook Secret (get from Stripe Dashboard after setting up webhook)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Frontend URL (MUST be production URL for webhooks to work)
FRONTEND_URL=https://balkan.thisisrikisart.com
```

### Frontend (.env)
```bash
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
```

## Deployment Steps

### 1. Update Environment Variables on Server

SSH into your server:
```bash
ssh -i barbershop-key.pem ubuntu@34.226.11.9
cd /home/ubuntu/barbershop
```

Edit the `.env` file:
```bash
nano .env
```

Add/update these lines:
```
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
FRONTEND_URL=https://balkan.thisisrikisart.com
```

Save and exit (Ctrl+X, Y, Enter)

### 2. Deploy Code Changes

Run the deployment script:
```bash
./deploy-safe.sh
```

This will:
- Pull latest code from Git
- Rebuild Docker containers
- Restart services without losing data

### 3. Set Up Stripe Webhook

#### 3.1 Get Webhook Signing Secret

1. Go to Stripe Dashboard: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Enter endpoint URL: `https://balkan.thisisrikisart.com/api/payments/webhook`
4. Select events to listen to:
   - `checkout.session.completed` (required)
   - `checkout.session.expired` (optional)
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)

#### 3.2 Update Server Environment

SSH back into server and add the webhook secret:
```bash
nano .env
```

Update:
```
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET_HERE
```

Restart backend:
```bash
docker-compose restart backend
```

### 4. Test the Integration

#### 4.1 Test Payment Flow

1. Log in as a customer at https://balkan.thisisrikisart.com
2. Create a booking (payment should NOT be required)
3. Go to Profile → Orders
4. Find the booking and click "💳 Pay Now"
5. Complete payment on Stripe Checkout page (use test card: `4242 4242 4242 4242`)
6. Verify redirect to success page
7. Check booking history - payment status should update to "Paid"

#### 4.2 Test Webhook

Check backend logs to verify webhook received:
```bash
docker-compose logs -f backend | grep -i webhook
```

Expected output:
```
Payment completed for booking: <booking_id>
✅ Booking <booking_id> marked as paid
```

#### 4.3 Verify Database

Connect to database:
```bash
docker exec -it barbershop_postgres psql -U barbershop_user -d barbershop_db
```

Check booking payment status:
```sql
SELECT id, payment_verified, payment_status, card_brand, card_last_4 
FROM bookings 
WHERE id = <booking_id>;
```

Expected result:
```
 id | payment_verified | payment_status | card_brand | card_last_4 
----+------------------+----------------+------------+-------------
  1 | t                | paid           | visa       | 4242
```

## Stripe Test Cards

Use these test cards in development:

| Card Number         | Brand      | Result                    |
|---------------------|------------|---------------------------|
| 4242 4242 4242 4242 | Visa       | Success                   |
| 5555 5555 5555 4444 | Mastercard | Success                   |
| 4000 0000 0000 0002 | Visa       | Card declined             |
| 4000 0000 0000 9995 | Visa       | Insufficient funds        |

- Use any future expiration date (e.g., 12/34)
- Use any 3-digit CVC (e.g., 123)
- Use any billing zip code (e.g., 12345)

## Switching to Production Mode

When ready to accept real payments:

### 1. Get Production API Keys

1. Go to Stripe Dashboard
2. Switch to "Live mode" (toggle in top-right)
3. Go to Developers → API keys
4. Copy "Publishable key" (starts with `pk_live_`)
5. Reveal and copy "Secret key" (starts with `sk_live_`)

### 2. Update Environment Variables

Replace test keys with live keys in `.env`:
```bash
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY
```

### 3. Set Up Production Webhook

1. Go to Stripe Dashboard (Live mode) → Developers → Webhooks
2. Add endpoint: `https://balkan.thisisrikisart.com/api/payments/webhook`
3. Select events: `checkout.session.completed`, `checkout.session.expired`
4. Copy the new signing secret
5. Update `STRIPE_WEBHOOK_SECRET` in `.env`

### 4. Restart Services

```bash
./deploy-safe.sh
```

## Troubleshooting

### Payment Not Updating After Checkout

**Symptom**: User completes payment but booking still shows as unpaid

**Possible Causes**:
1. Webhook not configured or secret is wrong
2. Webhook endpoint not reachable from Stripe
3. FRONTEND_URL is set to localhost instead of production URL

**Solution**:
```bash
# Check webhook secret is set
docker-compose exec backend printenv | grep STRIPE_WEBHOOK_SECRET

# Check backend logs for webhook errors
docker-compose logs backend | grep -i webhook

# Test webhook manually from Stripe Dashboard → Webhooks → Send test webhook
```

### "404 Not Found" After Payment

**Symptom**: After completing payment, user sees 404 error

**Possible Causes**:
1. Frontend not built/deployed with new BookingSuccess route
2. Nginx not configured to handle `/booking/success` route

**Solution**:
```bash
# Rebuild and redeploy frontend
./deploy-safe.sh

# Check Nginx config handles SPA routing
cat /etc/nginx/sites-available/barbershop
```

Nginx should have:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### "Pay Now" Button Not Showing

**Symptom**: Customer doesn't see Pay Now button in booking history

**Possible Causes**:
1. Booking already marked as paid (`payment_verified = true`)
2. Booking status is not `confirmed` or `pending`
3. Frontend not deployed with new changes

**Solution**:
```sql
-- Check booking status
SELECT id, status, payment_verified FROM bookings WHERE id = <booking_id>;

-- If needed, reset payment status for testing
UPDATE bookings SET payment_verified = false, payment_status = NULL WHERE id = <booking_id>;
```

### Webhook Signature Verification Failed

**Symptom**: Backend logs show "Webhook signature verification failed"

**Possible Causes**:
1. Wrong webhook secret in `.env`
2. Body parser is parsing webhook body (needs raw body)

**Solution**:
1. Verify webhook secret matches Stripe Dashboard
2. Code already handles raw body for `/api/payments/webhook` route (no action needed)

## Security Notes

1. **Never commit real API keys to Git** - Use environment variables
2. **Use test mode keys in development** - Only switch to live mode in production
3. **Keep webhook secret secure** - It verifies Stripe's identity
4. **Validate webhook signatures** - Already implemented in `handleWebhook`
5. **Use HTTPS in production** - Required by Stripe (already configured)

## Files Changed

### Backend
- `backend/src/controllers/paymentController.js` - Added `createCheckoutSessionForBooking`, `handleWebhook`
- `backend/src/routes/paymentRoutes.js` - Added `/create-checkout-session/:bookingId`, `/webhook` routes
- `backend/src/controllers/bookingController.js` - Updated `getMyBookings` to include payment fields
- `backend/src/app.js` - Added raw body parsing for webhook route

### Frontend
- `src/pages/ProfilePage.js` - Added `handlePayNow`, `canPayNow`, Pay Now button
- `src/pages/BookingSuccess.js` - New success page component
- `src/pages/BookingSuccess.css` - Success page styles
- `src/App.js` - Added `/booking/success` route

## Database Schema

Payment fields already exist in `bookings` table:
- `payment_verified` (boolean) - Whether payment method is verified
- `payment_status` (varchar) - Payment status: 'paid', 'pending', 'failed', 'refunded'
- `payment_amount` (decimal) - Amount paid
- `stripe_customer_id` (varchar) - Stripe customer ID
- `stripe_payment_method_id` (varchar) - Stripe payment method ID
- `stripe_charge_id` (varchar) - Stripe charge/payment intent ID
- `card_brand` (varchar) - Card brand (visa, mastercard, etc.)
- `card_last_4` (varchar) - Last 4 digits of card

No database migration needed - fields were added in previous session.

## Next Steps

1. **Deploy to production** following steps above
2. **Set up webhook** in Stripe Dashboard
3. **Test payment flow** with test cards
4. **Monitor webhook logs** for first few payments
5. **Switch to live mode** when ready to accept real payments

## Support

If you encounter issues:
1. Check backend logs: `docker-compose logs -f backend`
2. Check Stripe Dashboard for webhook delivery status
3. Verify environment variables are set correctly
4. Test with Stripe test cards before using real cards
