import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import './ForgotPasswordPage.css';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await authAPI.forgotPassword(email);
      
      if (response.data.success) {
        setSubmitted(true);
        setMessage({ 
          type: 'success', 
          text: 'If an account exists with this email, a password reset link has been sent. Please check your email.' 
        });
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      // Still show success message for security (don't reveal if email exists)
      setSubmitted(true);
      setMessage({ 
        type: 'success', 
        text: 'If an account exists with this email, a password reset link has been sent. Please check your email.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="forgot-password-card">
          <h1>Reset Password</h1>
          
          {!submitted ? (
            <>
              <p className="forgot-password-description">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              
              <form onSubmit={handleSubmit} className="forgot-password-form">
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    disabled={loading}
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="success-message-box">
              <div className="success-icon">✓</div>
              <p>{message.text}</p>
              <p className="success-subtext">
                If you don't see the email, please check your spam folder.
              </p>
            </div>
          )}
          
          <div className="forgot-password-footer">
            <Link to="/login" className="back-to-login">
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
