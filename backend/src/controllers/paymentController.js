const pool = require('../config/database');
const {
  stripe,
  createCustomer,
  attachPaymentMethod,
  verifyCard,
  chargeCustomer,
  processRefund,
  getCustomerPaymentMethods
} = require('../utils/stripeClient');

// @desc    Create Stripe Checkout Session for payment
// @route   POST /api/payments/create-checkout-session  
// @access  Private
const createCheckoutSession = async (req, res) => {
  try {
    const { amount, bookingId } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userName = `${req.user.firstName} ${req.user.lastName}`;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup', // Setup mode for saving card without immediate charge
      customer_email: userEmail,
      success_url: `${process.env.FRONTEND_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/booking`,
      metadata: {
        userId: userId.toString(),
        bookingId: bookingId || 'pending',
        userName: userName
      }
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create checkout session'
    });
  }
};

// @desc    Create setup intent for Payment Element
// @route   POST /api/payments/create-setup-intent
// @access  Private
const createSetupIntent = async (req, res) => {
  try {
    // Get user info from auth middleware
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userName = `${req.user.firstName} ${req.user.lastName}`;

    // Create setup intent for future payments
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['card'],
      usage: 'off_session',
      customer: req.user.stripeCustomerId || undefined,
      metadata: {
        userId: userId.toString(),
        userEmail: userEmail,
        userName: userName
      }
    });

    res.json({
      success: true,
      data: {
        clientSecret: setupIntent.client_secret
      }
    });
  } catch (error) {
    console.error('Create setup intent error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize payment. Please try again.'
    });
  }
};

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

// @desc    Create Stripe Checkout Session for existing booking
// @route   POST /api/payments/create-checkout-session/:bookingId
// @access  Private
const createCheckoutSessionForBooking = async (req, res) => {
  const client = await pool.connect();
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userName = `${req.user.firstName} ${req.user.lastName}`;

    // Get booking details
    const bookingResult = await client.query(
      `SELECT b.*, s.name as service_name, s.price as service_price
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       WHERE b.id = $1 AND b.user_id = $2`,
      [bookingId, userId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or you do not have permission to access it'
      });
    }

    const booking = bookingResult.rows[0];

    // Check if already paid
    if (booking.payment_verified) {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been paid'
      });
    }

    // Create Stripe customer if not exists
    let stripeCustomerId = booking.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await createCustomer(userEmail, userName);
      stripeCustomerId = customer.id;
      
      // Update booking with customer ID
      await client.query(
        'UPDATE bookings SET stripe_customer_id = $1 WHERE id = $2',
        [stripeCustomerId, bookingId]
      );
    }

    // Create Stripe Checkout Session in payment mode
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: booking.service_name,
              description: `Barbershop Service - Booking #${bookingId}`
            },
            unit_amount: Math.round(booking.total_price * 100) // Convert to cents
          },
          quantity: 1
        }
      ],
      success_url: `${process.env.FRONTEND_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${process.env.FRONTEND_URL}/profile?payment=cancelled`,
      metadata: {
        userId: userId.toString(),
        bookingId: bookingId.toString(),
        userName: userName
      }
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    console.error('Create checkout session for booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create checkout session'
    });
  } finally {
    client.release();
  }
};

// @desc    Handle Stripe webhook events
// @route   POST /api/payments/webhook
// @access  Public (verified by Stripe signature)
const handleWebhook = async (req, res) => {
  const client = await pool.connect();
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const bookingId = session.metadata.bookingId;
        
        console.log('Payment completed for booking:', bookingId);
        
        if (bookingId) {
          // Get payment method details
          let paymentMethodId = session.payment_method;
          let cardBrand = null;
          let cardLast4 = null;
          
          if (paymentMethodId) {
            try {
              const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
              cardBrand = paymentMethod.card?.brand || null;
              cardLast4 = paymentMethod.card?.last4 || null;
            } catch (err) {
              console.error('Error retrieving payment method:', err);
            }
          }
          
          // Update booking with payment info
          await client.query(
            `UPDATE bookings 
             SET payment_verified = true,
                 payment_status = 'paid',
                 payment_amount = $1,
                 stripe_payment_method_id = $2,
                 card_brand = $3,
                 card_last_4 = $4,
                 stripe_charge_id = $5,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6`,
            [
              session.amount_total / 100, // Convert cents to dollars
              paymentMethodId,
              cardBrand,
              cardLast4,
              session.payment_intent,
              bookingId
            ]
          );
          
          console.log(`✅ Booking ${bookingId} marked as paid`);
        }
        break;
      }
      
      case 'checkout.session.expired': {
        const session = event.data.object;
        const bookingId = session.metadata.bookingId;
        
        console.log('Checkout session expired for booking:', bookingId);
        // Optionally handle expired sessions
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    // Return 200 to acknowledge receipt
    res.json({ received: true });
  } catch (err) {
    console.error('Error handling webhook:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  } finally {
    client.release();
  }
};

module.exports = {
  createCheckoutSession,
  createCheckoutSessionForBooking,
  createSetupIntent,
  verifyCardAndSave,
  chargeCustomerCard,
  refundPayment,
  handleWebhook
};
