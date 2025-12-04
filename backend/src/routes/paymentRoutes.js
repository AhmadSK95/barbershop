const express = require('express');
const router = express.Router();
const {
  createCheckoutSession,
  createCheckoutSessionForBooking,
  createSetupIntent,
  verifyCardAndSave,
  chargeCustomerCard,
  refundPayment,
  handleWebhook
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/payments/webhook
// @desc    Handle Stripe webhook events
// @access  Public (verified by Stripe signature)
router.post('/webhook', handleWebhook);

// All other routes require authentication
router.use(protect);

// @route   POST /api/payments/create-checkout-session
// @desc    Create Stripe Checkout Session
// @access  Private
router.post('/create-checkout-session', createCheckoutSession);

// @route   POST /api/payments/create-checkout-session/:bookingId
// @desc    Create Stripe Checkout Session for existing booking
// @access  Private
router.post('/create-checkout-session/:bookingId', createCheckoutSessionForBooking);

// @route   POST /api/payments/create-setup-intent
// @desc    Create setup intent for Payment Element
// @access  Private
router.post('/create-setup-intent', createSetupIntent);

// @route   POST /api/payments/verify-card
// @desc    Verify card with $1 authorization and save payment method
// @access  Private
router.post('/verify-card', verifyCardAndSave);

// @route   POST /api/payments/charge
// @desc    Charge customer's saved payment method
// @access  Private (Admin only)
router.post('/charge', authorize('admin'), chargeCustomerCard);

// @route   POST /api/payments/refund
// @desc    Process refund for a charge
// @access  Private (Admin only)
router.post('/refund', authorize('admin'), refundPayment);

module.exports = router;
