import React, { useState, forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import { loadStripe } from '@stripe/stripe-js';
import api from '../services/api';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

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
    if (!cardNumber || !expiry || !cvc || !cardholderName || !consent) {
      if (!consent) {
        toast.error('Please accept the payment authorization terms');
      } else {
        toast.error('Please fill in all card details');
      }
      return null;
    }

    // Validate card number length (13-19 digits)
    const cardDigits = cardNumber.replace(/\s/g, '');
    if (cardDigits.length < 13 || cardDigits.length > 19) {
      toast.error('Invalid card number');
      return null;
    }

    // Validate expiry
    const [month, year] = expiry.split('/');
    if (!month || !year || parseInt(month) > 12 || parseInt(month) < 1) {
      toast.error('Invalid expiry date');
      return null;
    }

    // Validate CVC (3-4 digits)
    if (cvc.length < 3 || cvc.length > 4) {
      toast.error('Invalid CVC');
      return null;
    }

    try {
      setProcessing(true);

      // Send card details to backend for secure tokenization
      const tokenResponse = await api.post('/payments/create-payment-method', {
        cardNumber: cardNumber.replace(/\s/g, ''),
        expMonth: parseInt(month),
        expYear: parseInt('20' + year),
        cvc: cvc,
        cardholderName: cardholderName
      });

      if (!tokenResponse.data.success) {
        toast.error(tokenResponse.data.message || 'Failed to process card');
        return null;
      }

      const { paymentMethodId, cardBrand, cardLast4 } = tokenResponse.data.data;

      // Now verify the card with $1 authorization
      const response = await api.post('/payments/verify-card', {
        paymentMethodId: paymentMethodId
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
      toast.error('Failed to verify card: ' + (err.response?.data?.message || err.message));
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

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ color: 'var(--gold)', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          Cardholder Name *
        </label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="John Doe"
          disabled={disabled || processing}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--gold)',
            borderRadius: '4px',
            color: '#e8d7c3',
            fontSize: '1rem'
          }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ color: 'var(--gold)', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          Card Number *
        </label>
        <input
          type="text"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          placeholder="1234 5678 9012 3456"
          maxLength="19"
          disabled={disabled || processing}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--gold)',
            borderRadius: '4px',
            color: '#e8d7c3',
            fontSize: '1rem',
            letterSpacing: '0.05em'
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ color: 'var(--gold)', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            Expiry (MM/YY) *
          </label>
          <input
            type="text"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            placeholder="12/25"
            maxLength="5"
            disabled={disabled || processing}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--gold)',
              borderRadius: '4px',
              color: '#e8d7c3',
              fontSize: '1rem'
            }}
          />
        </div>
        <div>
          <label style={{ color: 'var(--gold)', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            CVC *
          </label>
          <input
            type="text"
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/[^0-9]/g, '').substring(0, 4))}
            placeholder="123"
            maxLength="4"
            disabled={disabled || processing}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--gold)',
              borderRadius: '4px',
              color: '#e8d7c3',
              fontSize: '1rem'
            }}
          />
        </div>
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
        🔒 Your card will be securely processed by Stripe. A $1 verification hold will appear and be immediately released.
      </p>

      <p style={{
        fontSize: '0.85rem',
        color: '#c19a6b',
        marginTop: '0.5rem',
        marginBottom: 0
      }}>
        Test card: 4242 4242 4242 4242, Expiry: 12/25, CVC: 123
      </p>
    </div>
  );
});

SimpleCardInput.displayName = 'SimpleCardInput';

export default SimpleCardInput;
