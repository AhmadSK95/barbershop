import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    contactEmail: '',
    password: '',
    confirmPassword: '',
    phone: '',
    smsConsent: false,
  });
  const [emailSameAsUsername, setEmailSameAsUsername] = useState(false);
  const [contactEmailSameAsEmail, setContactEmailSameAsEmail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    const name = e.target.name;
    
    let updates = { [name]: value };
    
    // Auto-populate email from username if checkbox is checked
    if (name === 'username' && emailSameAsUsername) {
      updates.email = value;
      // If contact_email is also synced to email, update it too
      if (contactEmailSameAsEmail) {
        updates.contactEmail = value;
      }
    }
    
    // Auto-populate contact_email from email if checkbox is checked
    if (name === 'email' && contactEmailSameAsEmail) {
      updates.contactEmail = value;
    }
    
    setFormData({
      ...formData,
      ...updates,
    });
    setError('');
  };
  
  const handleEmailSameAsUsername = (e) => {
    const checked = e.target.checked;
    setEmailSameAsUsername(checked);
    if (checked) {
      setFormData({
        ...formData,
        email: formData.username,
        contactEmail: contactEmailSameAsEmail ? formData.username : formData.contactEmail
      });
    }
  };
  
  const handleContactEmailSameAsEmail = (e) => {
    const checked = e.target.checked;
    setContactEmailSameAsEmail(checked);
    if (checked) {
      setFormData({
        ...formData,
        contactEmail: formData.email
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    // Validate SMS consent if phone number provided
    if (formData.phone && !formData.smsConsent) {
      setError('Please consent to receive SMS notifications to use this phone number');
      return;
    }

    setLoading(true);

    const { confirmPassword, ...userData } = formData;
    const result = await register(userData);

    if (result.success) {
      setSuccess('Registration successful! Please check your email to verify your account.');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000); // Give user time to see the message
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join us today</p>

          {error && <div className="auth-error">{error}</div>}
          {success && (
            <div className="auth-success">
              ✅ {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="John"
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Choose a unique username"
                minLength="3"
                maxLength="50"
                pattern="[a-zA-Z0-9._-]+"
                title="Username can only contain letters, numbers, dots, underscores, and hyphens"
              />
              <small style={{color: '#999', fontSize: '0.85rem'}}>Used for login authentication</small>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your.email@example.com"
                disabled={emailSameAsUsername}
              />
              <small style={{color: '#999', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem'}}>Used for login purposes (can be same as username)</small>
              <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem', color: '#ddd'}}>
                <input
                  type="checkbox"
                  checked={emailSameAsUsername}
                  onChange={handleEmailSameAsUsername}
                  style={{marginRight: '0.5rem', cursor: 'pointer'}}
                />
                Same as username
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="contactEmail">Contact Email</label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                required
                placeholder="contact@example.com"
                disabled={contactEmailSameAsEmail}
              />
              <small style={{color: '#999', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem'}}>Where you'll receive booking confirmations and notifications</small>
              <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem', color: '#ddd'}}>
                <input
                  type="checkbox"
                  checked={contactEmailSameAsEmail}
                  onChange={handleContactEmailSameAsEmail}
                  style={{marginRight: '0.5rem', cursor: 'pointer'}}
                />
                Same as email address
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number (Optional)</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (123) 456-7890"
              />
              <small style={{color: '#999', fontSize: '0.85rem'}}>For booking confirmations and reminders</small>
            </div>

            {formData.phone && (
              <div className="form-group" style={{marginTop: '1rem'}}>
                <label style={{display: 'flex', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.95rem'}}>
                  <input
                    type="checkbox"
                    name="smsConsent"
                    checked={formData.smsConsent}
                    onChange={handleChange}
                    required
                    style={{marginRight: '0.75rem', marginTop: '0.25rem', cursor: 'pointer'}}
                  />
                  <span style={{lineHeight: '1.5', color: '#ddd'}}>
                    I agree to receive transactional SMS messages including booking confirmations, 
                    appointment reminders, and service updates. Message frequency varies. 
                    Reply STOP to opt-out anytime. Standard message and data rates may apply.
                  </span>
                </label>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="At least 8 characters"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Re-enter your password"
              />
            </div>

            <button 
              type="submit" 
              className="auth-button"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
