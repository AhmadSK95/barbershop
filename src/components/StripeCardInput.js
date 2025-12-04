import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import api from '../services/api';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const PAYMENT_ELEMENT_OPTIONS = {
  layout: {
    type: 'tabs',
    defaultCollapsed: false,
    radios: false,
    spacedAccordionItems: false
  },
  wallets: {
    applePay: 'auto',
    googlePay: 'auto'
  },
  terms: {
    card: 'auto'
  }
};

// Inner component that uses Stripe hooks
const PaymentForm = forwardRef((props, ref) => {
  const { disabled } = props;
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [consent, setConsent] = useState(false);

  const handlePaymentChange = (event) => {
    setPaymentReady(event.complete);
  };

  const verifyCard = async () => {
    if (!stripe || !elements || !paymentReady || !consent) {
      if (!consent) {
        toast.error('Please accept the payment authorization terms');
      } else if (!paymentReady) {
        toast.error('Please complete your payment information');
      }
      return null;
    }

    try {
      setProcessing(true);

      // Confirm the setup intent
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast.error(submitError.message);
        return null;
      }

      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/booking',
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message);
        return null;
      }

      // Send payment method to backend for verification and saving
      const response = await api.post('/payments/verify-card', {
        paymentMethodId: setupIntent.payment_method
      });

      if (response.data.success) {
        toast.success('Payment method verified successfully! Processing booking...');
        return response.data.data;
      } else {
        toast.error(response.data.message || 'Payment verification failed');
        return null;
      }
    } catch (err) {
      console.error('Payment verification error:', err);
      toast.error(err.response?.data?.message || 'Failed to verify payment method');
      return null;
    } finally {
      setProcessing(false);
    }
  };

  // Expose verify function to parent component
  useImperativeHandle(ref, () => ({
    verifyCard
  }));

  return (
    <div className="payment-section" style={{
      background: 'rgba(26, 15, 10, 0.6)',
      padding: '1.5rem',
      borderRadius: '8px',
      border: '1px solid var(--gold)',
      marginTop: '2rem'
    }}>
      <h3 style={{ color: 'var(--gold)', marginBottom: '1rem' }}>
        💳 Payment Information
      </h3>
      
      <div style={{
        marginBottom: '1rem'
      }}>
        <PaymentElement 
          options={PAYMENT_ELEMENT_OPTIONS}
          onChange={handlePaymentChange}
        />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        marginBottom: '1rem'
      }}>
        <input
          type="checkbox"
          id="payment-consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={disabled || processing}
          style={{
            marginTop: '0.25rem',
            cursor: disabled || processing ? 'not-allowed' : 'pointer'
          }}
        />
        <label 
          htmlFor="payment-consent" 
          style={{ 
            color: 'var(--cream)', 
            fontSize: '0.9rem',
            cursor: disabled || processing ? 'not-allowed' : 'pointer'
          }}
        >
          I authorize a $1 verification charge (will be immediately released) and agree to save my payment method for checkout at the store.
        </label>
      </div>

      {processing && (
        <div style={{ textAlign: 'center', color: 'var(--gold)' }}>
          <LoadingSpinner size="small" />
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Verifying card...</p>
        </div>
      )}

      <p style={{
        fontSize: '0.85rem',
        color: 'var(--gold-light)',
        fontStyle: 'italic',
        marginTop: '1rem',
        marginBottom: 0
      }}>
        🔒 Your payment method will be securely saved for checkout. A $1 verification hold will appear and be immediately released.
      </p>

      {process.env.NODE_ENV === 'development' && (
        <p style={{
          fontSize: '0.85rem',
          color: '#c19a6b',
          marginTop: '0.5rem',
          marginBottom: 0
        }}>
          Test cards: 4242 4242 4242 4242 (success), 4000 0000 0000 0002 (decline)
        </p>
      )}
    </div>
  );
});

PaymentForm.displayName = 'PaymentForm';

// Wrapper component that creates the setup intent and Elements provider
const StripeCardInput = forwardRef((props, ref) => {
  const { disabled } = props;
  const [clientSecret, setClientSecret] = useState('');

  // Create setup intent when component mounts
  useEffect(() => {
    const createSetupIntent = async () => {
      try {
        console.log('[StripeCardInput] Requesting setup intent...');
        const response = await api.post('/payments/create-setup-intent');
        console.log('[StripeCardInput] Setup intent response:', response.data);
        
        if (response.data.success && response.data.data && response.data.data.clientSecret) {
          console.log('[StripeCardInput] Client secret received:', response.data.data.clientSecret.substring(0, 20) + '...');
          setClientSecret(response.data.data.clientSecret);
        } else {
          console.error('[StripeCardInput] Invalid response structure:', response.data);
          toast.error('Payment initialization failed: Invalid response');
          setClientSecret('ERROR'); // Set to error state to stop loading
        }
      } catch (error) {
        console.error('[StripeCardInput] Failed to create setup intent:', error);
        console.error('[StripeCardInput] Error response:', error.response?.data);
        toast.error('Failed to initialize payment form: ' + (error.response?.data?.message || error.message));
        setClientSecret('ERROR'); // Set to error state to stop loading
      }
    };

    createSetupIntent();
  }, []);

  if (!clientSecret) {
    return (
      <div className="payment-section" style={{
        background: 'rgba(26, 15, 10, 0.6)',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid var(--gold)',
        marginTop: '2rem',
        textAlign: 'center'
      }}>
        <h3 style={{ color: 'var(--gold)', marginBottom: '1rem' }}>
          💳 Payment Information
        </h3>
        <LoadingSpinner size="small" />
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--gold)' }}>
          Loading payment options...
        </p>
      </div>
    );
  }
  
  if (clientSecret === 'ERROR') {
    return (
      <div className="payment-section" style={{
        background: 'rgba(26, 15, 10, 0.6)',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid var(--gold)',
        marginTop: '2rem',
        textAlign: 'center'
      }}>
        <h3 style={{ color: 'var(--gold)', marginBottom: '1rem' }}>
          💳 Payment Information
        </h3>
        <p style={{ color: '#fa755a', fontSize: '0.9rem' }}>
          ⚠️ Unable to load payment form. Please refresh the page or contact support.
        </p>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#c19a6b',
        colorBackground: 'rgba(0, 0, 0, 0.5)',
        colorText: '#e8d7c3',
        colorDanger: '#fa755a',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        spacingUnit: '4px',
        borderRadius: '4px'
      }
    }
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm ref={ref} disabled={disabled} clientSecret={clientSecret} />
    </Elements>
  );
});

StripeCardInput.displayName = 'StripeCardInput';

export default StripeCardInput;
