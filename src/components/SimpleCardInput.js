import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import api from '../services/api';

const SimpleCardInput = forwardRef((props, ref) => {
  const { disabled } = props;
  const [processing, setProcessing] = useState(false);
  const [consent, setConsent] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? '/' + v.substring(2, 4) : '');
    }
    return v;
  };

  const verifyCard = async () => {
    if (!consent) {
      toast.error('Please accept the payment authorization terms');
      return null;
    }

    try {
      setProcessing(true);

      // Create Stripe Checkout session
      const response = await api.post('/payments/create-checkout-session', {
        amount: 1, // $1 for verification
        bookingId: 'pending'
      });

      if (response.data.success) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.data.url;
        return { redirecting: true };
      } else {
        toast.error(response.data.message || 'Failed to initialize payment');
        return null;
      }
    } catch (err) {
      console.error('Payment initialization error:', err);
      toast.error('Failed to initialize payment: ' + (err.response?.data?.message || err.message));
      return null;
    } finally {
      setProcessing(false);
    }
  };

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

      <p style={{ color: 'var(--cream)', marginBottom: '1rem' }}>
        You'll be redirected to Stripe's secure payment page to enter your card details.
      </p>

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
        <div style={{ textAlign: 'center', color: 'var(--gold)', marginBottom: '1rem' }}>
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
        🔒 Powered by Stripe - PCI compliant and secure. Your card information is never stored on our servers.
      </p>
    </div>
  );
});

SimpleCardInput.displayName = 'SimpleCardInput';

export default SimpleCardInput;
