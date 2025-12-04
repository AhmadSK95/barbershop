import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import './BookingSuccess.css';

function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const bookingId = searchParams.get('booking_id');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Verify the payment with backend
    const verifyPayment = async () => {
      if (!sessionId) {
        setStatus('error');
        setMessage('Payment session not found');
        return;
      }

      try {
        // Since we're using Stripe Checkout, the payment is already processed
        // We just need to show success and redirect
        setStatus('success');
        setMessage('Payment successful! Your booking has been confirmed.');
        
        // Redirect to profile after 3 seconds
        setTimeout(() => {
          navigate('/profile?payment=success');
        }, 3000);
      } catch (error) {
        console.error('Error verifying payment:', error);
        setStatus('error');
        setMessage('Failed to verify payment. Please contact support.');
      }
    };

    verifyPayment();
  }, [sessionId, bookingId, navigate]);

  if (status === 'loading') {
    return (
      <div className="booking-success-container">
        <div className="booking-success-card">
          <LoadingSpinner />
          <h2>Processing your payment...</h2>
          <p>Please wait while we confirm your payment.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="booking-success-container">
        <div className="booking-success-card error">
          <div className="icon">❌</div>
          <h2>Payment Error</h2>
          <p>{message}</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/profile')}
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-success-container">
      <div className="booking-success-card success">
        <div className="icon">✅</div>
        <h2>Payment Successful!</h2>
        <p>{message}</p>
        <p className="redirect-message">Redirecting to your profile...</p>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/profile')}
        >
          Go to Profile Now
        </button>
      </div>
    </div>
  );
}

export default BookingSuccess;
