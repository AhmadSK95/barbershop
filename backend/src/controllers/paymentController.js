const pool = require('../config/database');
const {
  createCustomer,
  attachPaymentMethod,
  verifyCard,
  chargeCustomer,
  processRefund,
  getCustomerPaymentMethods
} = require('../utils/stripeClient');

// @desc    Verify card with $1 authorization and save payment method
// @route   POST /api/payments/verify-card
// @access  Private
const verifyCardAndSave = async (req, res) => {
  const client = await pool.connect();
  try {
    const { paymentMethodId, email, name } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: 'Payment method ID is required'
      });
    }

    // Get user info from auth middleware
    const userId = req.user.id;
    const userEmail = email || req.user.email;
    const userName = name || `${req.user.firstName} ${req.user.lastName}`;

    // Check if user already has a Stripe customer ID
    let stripeCustomerId = req.user.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await createCustomer(userEmail, userName);
      stripeCustomerId = customer.id;

      // Save customer ID to users table
      await client.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [stripeCustomerId, userId]
      );
    }

    // Attach payment method to customer
    await attachPaymentMethod(paymentMethodId, stripeCustomerId);

    // Verify card with $1 authorization (immediately released)
    const verification = await verifyCard(stripeCustomerId, paymentMethodId);

    // Get payment method details
    const paymentMethods = await getCustomerPaymentMethods(stripeCustomerId);
    const savedMethod = paymentMethods.find(pm => pm.id === paymentMethodId);

    res.json({
      success: true,
      message: 'Card verified and saved successfully',
      data: {
        customerId: stripeCustomerId,
        paymentMethodId: paymentMethodId,
        cardBrand: savedMethod?.card?.brand || 'card',
        cardLast4: savedMethod?.card?.last4 || '****',
        verified: true
      }
    });
  } catch (error) {
    console.error('Verify card error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify card. Please try again.'
    });
  } finally {
    client.release();
  }
};

// @desc    Charge customer's saved payment method
// @route   POST /api/payments/charge
// @access  Private (Admin only)
const chargeCustomerCard = async (req, res) => {
  const client = await pool.connect();
  try {
    const { bookingId, amount } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID and amount are required'
      });
    }

    // Get booking with payment info
    const bookingResult = await client.query(
      `SELECT b.*, u.email, u.first_name, u.last_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookingResult.rows[0];

    if (!booking.stripe_customer_id || !booking.stripe_payment_method_id) {
      return res.status(400).json({
        success: false,
        message: 'No saved payment method for this booking'
      });
    }

    // Charge the customer
    const charge = await chargeCustomer(
      booking.stripe_customer_id,
      booking.stripe_payment_method_id,
      amount,
      `Barbershop service - Booking #${bookingId}`
    );

    // Update booking with charge info
    await client.query(
      `UPDATE bookings 
       SET payment_status = 'paid', 
           payment_amount = $1, 
           stripe_charge_id = $2 
       WHERE id = $3`,
      [amount, charge.id, bookingId]
    );

    // Record payment in payments table
    await client.query(
      `INSERT INTO payments (booking_id, amount, stripe_charge_id, status, payment_method)
       VALUES ($1, $2, $3, 'succeeded', 'card')`,
      [bookingId, amount, charge.id]
    );

    res.json({
      success: true,
      message: `Successfully charged $${amount}`,
      data: {
        chargeId: charge.id,
        amount: amount,
        customer: `${booking.first_name} ${booking.last_name}`
      }
    });
  } catch (error) {
    console.error('Charge customer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to charge customer. Please try again.'
    });
  } finally {
    client.release();
  }
};

// @desc    Process refund
// @route   POST /api/payments/refund
// @access  Private (Admin only)
const refundPayment = async (req, res) => {
  const client = await pool.connect();
  try {
    const { chargeId, amount, bookingId } = req.body;

    if (!chargeId) {
      return res.status(400).json({
        success: false,
        message: 'Charge ID is required'
      });
    }

    // Process refund (partial if amount specified)
    const refund = await processRefund(chargeId, amount);

    // Update payment and booking status
    if (bookingId) {
      await client.query(
        `UPDATE bookings 
         SET payment_status = 'refunded' 
         WHERE id = $1`,
        [bookingId]
      );

      await client.query(
        `UPDATE payments 
         SET status = 'refunded', refund_amount = $1 
         WHERE stripe_charge_id = $2`,
        [refund.amount / 100, chargeId]
      );
    }

    res.json({
      success: true,
      message: `Refund processed successfully: $${refund.amount / 100}`,
      data: {
        refundId: refund.id,
        amount: refund.amount / 100
      }
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process refund. Please try again.'
    });
  } finally {
    client.release();
  }
};

module.exports = {
  verifyCardAndSave,
  chargeCustomerCard,
  refundPayment
};
