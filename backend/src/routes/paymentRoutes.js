const express = require('express');
const router = express.Router();
const {
  verifyCardAndSave,
  chargeCustomerCard,
  refundPayment
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

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
