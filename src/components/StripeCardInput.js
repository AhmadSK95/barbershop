import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import api from '../services/api';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#e8d7c3',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#c19a6b'
      }
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a'
    }
  },
  hidePostalCode: true
};

const StripeCardInput = forwardRef((props, ref) => {
  const { disabled } = props;
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [consent, setConsent] = useState(false);

  const handleCardChange = (event) => {
    setCardComplete(event.complete);
  };

  const verifyCard = async () => {
    if (!stripe || !elements || !cardComplete || !consent) {
      return null;
    }

    try {
      setProcessing(true);

      // Create payment method from card element
      const cardElement = elements.getElement(CardElement);
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        toast.error(error.message);
        return null;
      }

      // Send payment method to backend for verification
      const response = await api.post('/payments/verify-card', {
        paymentMethodId: paymentMethod.id
      });

      if (response.data.success) {
        toast.success('Card verified successfully! Processing booking...');
        return response.data.data;
      } else {
        toast.error(response.data.message || 'Card verification failed');
        return null;
      }
    } catch (err) {
      console.error('Card verification error:', err);
      toast.error(err.response?.data?.message || 'Failed to verify card');
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
        background: 'rgba(0, 0, 0, 0.5)',
        padding: '1rem',
        borderRadius: '4px',
        border: '1px solid var(--gold)',
        marginBottom: '1rem'
      }}>
        <CardElement 
          options={CARD_ELEMENT_OPTIONS}
          onChange={handleCardChange}
          disabled={disabled || processing}
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
        🔒 Your card will be securely saved for payment at checkout. A $1 verification hold will appear and be immediately released.
      </p>

      <p style={{
        fontSize: '0.85rem',
        color: '#c19a6b',
        marginTop: '0.5rem',
        marginBottom: 0
      }}>
        Test cards: 4242 4242 4242 4242 (success), 4000 0000 0000 0002 (decline)
      </p>
    </div>
  );
});

StripeCardInput.displayName = 'StripeCardInput';

export default StripeCardInput;
