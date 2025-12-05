# Stripe Payment - Quick Reference Card

## 🚀 Quick Start (3 Steps)

### 1. Get Stripe Keys
```bash
# Visit: https://dashboard.stripe.com/test/apikeys
# Copy: Publishable key (pk_test_...) and Secret key (sk_test_...)
```

### 2. Configure Environment
```bash
# Backend: backend/.env
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE

# Frontend: .env (root directory)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

### 3. Run Migration
```bash
cd backend
node src/config/add-stripe-payment-fields.js
```

## 🧪 Test Cards

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0000 0000 0002` | ❌ Decline |
| `4000 0000 0000 9995` | ❌ Insufficient funds |

**Any future date, 3-digit CVC, 5-digit ZIP**

## 📍 Key Locations

### Backend Files
- **Stripe Client:** `backend/src/utils/stripeClient.js`
- **Payment Controller:** `backend/src/controllers/paymentController.js`
- **Payment Routes:** `backend/src/routes/paymentRoutes.js`
- **Migration Script:** `backend/src/config/add-stripe-payment-fields.js`

### Frontend Files
- **API Methods:** `src/services/api.js` (paymentAPI)
- **Payment Modal:** `src/components/PaymentModal.js`
- **Card Input:** `src/components/StripeCardInput.js`
- **Admin Dashboard:** `src/pages/AdminPage.js`

## 🎯 Admin Dashboard Features

### Payment Columns
- **Payment Status:** ✓ Paid / ⏳ Pending / ↩ Refunded
- **Card Info:** Visa ••••4242
- **Pay Now Button:** Only shows when:
  - Booking is confirmed/completed
  - Payment is pending
  - Card is saved

### How to Charge a Customer
1. Find booking in dashboard
2. Change status to "Confirmed"
3. Click "💳 Pay Now"
4. Review details in modal
5. Click "Charge $XX.XX"
6. Done! Payment processed instantly

## 🔧 Common Tasks

### View Stripe Payments
```bash
# Visit: https://dashboard.stripe.com/test/payments
```

### Refund a Payment
```javascript
// In Stripe Dashboard OR via API:
POST /api/payments/refund
{
  "chargeId": "pi_...",
  "amount": 60.00,  // Optional: partial refund
  "bookingId": 123
}
```

### Check Database Payment Status
```sql
SELECT id, payment_status, card_brand, card_last_4, payment_amount
FROM bookings
WHERE payment_status = 'pending';
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Payment initialization failed" | Check Stripe keys in `.env`, restart servers |
| "No saved payment method" | Customer must complete card verification during booking |
| Pay Now button not showing | Ensure booking is confirmed AND has saved card |
| Database error | Run migration script: `node backend/src/config/add-stripe-payment-fields.js` |

## 📊 Payment Workflow

```
Customer Books → Enters Card → $1 Auth (Released) → Card Saved
                                      ↓
Admin Dashboard → Confirms Booking → Pay Now → Charge Card → Paid
```

## 🔐 Security Checklist

- ✅ Never log or store raw card numbers
- ✅ Only admin can charge payments
- ✅ Use HTTPS in production
- ✅ Keep Stripe keys secret (not in git)
- ✅ Verify webhook signatures in production

## 🚀 Going Live

```bash
# 1. Switch to live keys (sk_live_... and pk_live_...)
# 2. Enable HTTPS on your domain
# 3. Set up webhook: https://yourdomain.com/api/payments/webhook
# 4. Test with real card (refund immediately)
# 5. Monitor Stripe dashboard
```

## 💰 Pricing

**Stripe Fees:**
- 2.9% + $0.30 per successful charge
- No monthly fees
- No setup fees
- Refunds: 2.9% fee is NOT refunded

**Example:**
- Charge: $60.00
- Stripe fee: $2.04
- You receive: $57.96

## 📞 Quick Links

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Test Mode:** https://dashboard.stripe.com/test
- **API Docs:** https://stripe.com/docs/api
- **Test Cards:** https://stripe.com/docs/testing
- **Support:** https://support.stripe.com

## 🎉 That's It!

You're ready to accept payments securely. No PCI compliance headaches!

For detailed info, see: `STRIPE-SETUP-GUIDE.md`
