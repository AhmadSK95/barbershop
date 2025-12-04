const Stripe = require('stripe');

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

/**
 * Create a Stripe customer
 * @param {Object} customerData - Customer information
 * @param {string} customerData.email - Customer email
 * @param {string} customerData.name - Customer name
 * @param {string} customerData.phone - Customer phone (optional)
 * @returns {Promise<Object>} Stripe customer object
 */
const createCustomer = async ({ email, name, phone }) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      phone: phone || undefined,
      metadata: {
        source: 'barbershop_booking'
      }
    });
    
    console.log(`✅ Stripe customer created: ${customer.id}`);
    return customer;
  } catch (error) {
    console.error('❌ Error creating Stripe customer:', error);
    throw new Error(`Failed to create Stripe customer: ${error.message}`);
  }
};

/**
 * Attach payment method to customer
 * @param {string} customerId - Stripe customer ID
 * @param {string} paymentMethodId - Stripe payment method ID
 * @returns {Promise<Object>} Payment method object
 */
const attachPaymentMethod = async (customerId, paymentMethodId) => {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId
    });
    
    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });
    
    console.log(`✅ Payment method ${paymentMethodId} attached to customer ${customerId}`);
    return paymentMethod;
  } catch (error) {
    console.error('❌ Error attaching payment method:', error);
    throw new Error(`Failed to attach payment method: ${error.message}`);
  }
};

/**
 * Create a $1 authorization to verify card (will be released)
 * @param {string} customerId - Stripe customer ID
 * @param {string} paymentMethodId - Stripe payment method ID
 * @returns {Promise<Object>} Payment intent object
 */
const verifyCard = async (customerId, paymentMethodId) => {
  try {
    // Create $1 authorization (not captured)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100, // $1.00 in cents
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      capture_method: 'manual', // Don't capture, just authorize
      confirm: true,
      description: 'Card verification (will not be charged)',
      metadata: {
        type: 'card_verification'
      }
    });
    
    // Immediately cancel the authorization to release the hold
    if (paymentIntent.status === 'requires_capture') {
      await stripe.paymentIntents.cancel(paymentIntent.id);
      console.log(`✅ Card verified and $1 hold released: ${paymentIntent.id}`);
    }
    
    return paymentIntent;
  } catch (error) {
    console.error('❌ Error verifying card:', error);
    throw new Error(`Card verification failed: ${error.message}`);
  }
};

/**
 * Charge a customer's saved payment method
 * @param {Object} chargeData - Charge information
 * @param {string} chargeData.customerId - Stripe customer ID
 * @param {string} chargeData.paymentMethodId - Stripe payment method ID
 * @param {number} chargeData.amount - Amount in dollars
 * @param {string} chargeData.description - Charge description
 * @param {Object} chargeData.metadata - Additional metadata
 * @returns {Promise<Object>} Payment intent object
 */
const chargeCustomer = async ({ customerId, paymentMethodId, amount, description, metadata = {} }) => {
  try {
    const amountInCents = Math.round(amount * 100);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      description: description || 'Barbershop service',
      metadata: {
        ...metadata,
        source: 'admin_checkout'
      }
    });
    
    console.log(`✅ Successfully charged customer $${amount}: ${paymentIntent.id}`);
    return paymentIntent;
  } catch (error) {
    console.error('❌ Error charging customer:', error);
    throw new Error(`Payment failed: ${error.message}`);
  }
};

/**
 * Process a full or partial refund
 * @param {Object} refundData - Refund information
 * @param {string} refundData.chargeId - Stripe charge/payment intent ID
 * @param {number} refundData.amount - Amount to refund in dollars (optional, full refund if not specified)
 * @param {string} refundData.reason - Refund reason
 * @returns {Promise<Object>} Refund object
 */
const processRefund = async ({ chargeId, amount, reason }) => {
  try {
    const refundData = {
      payment_intent: chargeId,
      reason: reason || 'requested_by_customer'
    };
    
    // If amount specified, do partial refund
    if (amount) {
      refundData.amount = Math.round(amount * 100);
    }
    
    const refund = await stripe.refunds.create(refundData);
    
    console.log(`✅ Refund processed: ${refund.id} - $${refund.amount / 100}`);
    return refund;
  } catch (error) {
    console.error('❌ Error processing refund:', error);
    throw new Error(`Refund failed: ${error.message}`);
  }
};

/**
 * Get customer's payment methods
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<Array>} Array of payment methods
 */
const getCustomerPaymentMethods = async (customerId) => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });
    
    return paymentMethods.data;
  } catch (error) {
    console.error('❌ Error getting payment methods:', error);
    throw new Error(`Failed to get payment methods: ${error.message}`);
  }
};

module.exports = {
  stripe,
  createCustomer,
  attachPaymentMethod,
  verifyCard,
  chargeCustomer,
  processRefund,
  getCustomerPaymentMethods
};
