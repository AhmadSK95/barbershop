import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { bookingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import StripeCardInput from './StripeCardInput';

function BookingSummary({ booking, totalPrice, totalDuration, onConfirm, onBack }) {
  const [loading, setLoading] = useState(false);
  const [previewBarber, setPreviewBarber] = useState(null);
  const [loadingBarber, setLoadingBarber] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const paymentRef = useRef(null);
  
  // Customer information for admin/barber bookings
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  
  const isAdminOrBarber = user?.role === 'admin' || user?.role === 'barber';

  // Fetch preview barber if "Any Available" is selected
  useEffect(() => {
    const fetchPreviewBarber = async () => {
      if (booking.barber?.name === 'Any Available' && booking.date && booking.time) {
        try {
          setLoadingBarber(true);
          const response = await bookingAPI.previewAssignedBarber(booking.date, booking.time);
          setPreviewBarber(response.data.data.barber);
        } catch (error) {
          console.error('Failed to preview barber:', error);
        } finally {
          setLoadingBarber(false);
        }
      }
    };

    fetchPreviewBarber();
  }, [booking.barber, booking.date, booking.time]);

  const handleConfirm = async () => {
    // Validate customer information for admin/barber bookings
    if (isAdminOrBarber) {
      if (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.email) {
        toast.error('Please provide customer name and email');
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerInfo.email)) {
        toast.error('Please provide a valid email address');
        return;
      }
    }
    
    try {
      setLoading(true);

      // Verify card and get payment details
      let paymentData = null;
      if (paymentRef.current?.verifyCard) {
        paymentData = await paymentRef.current.verifyCard();
        if (!paymentData) {
          setLoading(false);
          return; // Card verification failed
        }
      }

      // Format the booking data for API
      console.log('DEBUG - Full booking object:', JSON.stringify(booking, null, 2));
      console.log('DEBUG - booking.barber:', booking.barber);
      console.log('DEBUG - booking.barber.id:', booking.barber?.id);
      
      const bookingData = {
        serviceIds: booking.services.map(service => service.id),
        // Use preview barber ID if available, otherwise send null for random assignment
        barberId: previewBarber ? previewBarber.id : 
                  (booking.barber?.name === 'Any Available' || !booking.barber?.id) ? null : booking.barber.id,
        bookingDate: booking.date,
        bookingTime: booking.time,
        notes: '',
        // Include customer information for admin/barber bookings
        ...(isAdminOrBarber && {
          customerFirstName: customerInfo.firstName,
          customerLastName: customerInfo.lastName,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone || null
        }),
        // Include Stripe payment data if available
        ...(paymentData && {
          stripeCustomerId: paymentData.customerId,
          stripePaymentMethodId: paymentData.paymentMethodId,
          cardBrand: paymentData.cardBrand,
          cardLast4: paymentData.cardLast4
        })
      };

      console.log('Creating booking:', bookingData); // Debug log
      const response = await bookingAPI.create(bookingData);
      console.log('Booking created:', response.data); // Debug log
      
      // Get assigned barber info from response
      const assignedBarber = response.data.data?.assignedBarber;
      
      // Show confirmation with assigned barber
      const bookingConfirmMessage = assignedBarber && booking.barber?.name === 'Any Available' 
        ? `Booking confirmed! Your barber: ${assignedBarber.name}.`
        : 'Booking confirmed!';
      
      // Simple success toast without payment link
      toast.success(
        <div>
          <p>{bookingConfirmMessage}</p>
          <p style={{ fontSize: '0.9em', marginTop: '0.5rem' }}>Confirmation email sent.</p>
          {paymentData && (
            <p style={{ fontSize: '0.9em', marginTop: '0.5rem', color: 'var(--gold)' }}>
              💳 Card saved: {paymentData.cardBrand} ••••{paymentData.cardLast4}
            </p>
          )}
        </div>,
        {
          autoClose: 5000
        }
      );
      
      // Reset booking state
      onConfirm();
      
      // Navigate to profile page immediately to show the updated booking
      navigate('/profile', { replace: true });
    } catch (err) {
      console.error('Booking error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to create booking. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="step-container">
      <h2>Booking Summary</h2>
      
      {isAdminOrBarber && (
        <div className="customer-info-section" style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: 'var(--gold)', marginBottom: '1rem' }}>Customer Information</h3>
          <div className="customer-info-form" style={{ 
            background: 'rgba(26, 15, 10, 0.6)', 
            padding: '1.5rem', 
            borderRadius: '8px',
            border: '1px solid var(--gold)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div className="form-group">
              <label htmlFor="firstName" style={{ color: 'var(--gold)', display: 'block', marginBottom: '0.5rem' }}>
                First Name <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="firstName"
                value={customerInfo.firstName}
                onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid var(--gold)',
                  background: 'rgba(0, 0, 0, 0.5)',
                  color: 'var(--cream)',
                  fontSize: '1rem'
                }}
                placeholder="Enter first name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="lastName" style={{ color: 'var(--gold)', display: 'block', marginBottom: '0.5rem' }}>
                Last Name <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="lastName"
                value={customerInfo.lastName}
                onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid var(--gold)',
                  background: 'rgba(0, 0, 0, 0.5)',
                  color: 'var(--cream)',
                  fontSize: '1rem'
                }}
                placeholder="Enter last name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="customerEmail" style={{ color: 'var(--gold)', display: 'block', marginBottom: '0.5rem' }}>
                Email <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="email"
                id="customerEmail"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid var(--gold)',
                  background: 'rgba(0, 0, 0, 0.5)',
                  color: 'var(--cream)',
                  fontSize: '1rem'
                }}
                placeholder="customer@example.com"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="customerPhone" style={{ color: 'var(--gold)', display: 'block', marginBottom: '0.5rem' }}>
                Phone (Optional)
              </label>
              <input
                type="tel"
                id="customerPhone"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid var(--gold)',
                  background: 'rgba(0, 0, 0, 0.5)',
                  color: 'var(--cream)',
                  fontSize: '1rem'
                }}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          <p style={{ 
            color: 'var(--gold-light)', 
            fontSize: '0.9rem', 
            marginTop: '0.75rem',
            fontStyle: 'italic'
          }}>
            📧 Booking confirmation will be sent to this email address
          </p>
        </div>
      )}
      
      <div className="summary-card">
        <div className="summary-section">
          <h3>Services</h3>
          {booking.services.map(service => (
            <div key={service.id} className="summary-item">
              <span>{service.name}</span>
              <span>${service.price}</span>
            </div>
          ))}
        </div>

        <div className="summary-section">
          <h3>Date & Time</h3>
          <div className="summary-item">
            <span>{booking.date}</span>
            <span>{booking.time}</span>
          </div>
        </div>

        <div className="summary-section">
          <h3>Barber</h3>
          <div className="summary-item">
            {loadingBarber ? (
              <span style={{ fontStyle: 'italic', color: '#c19a6b' }}>
                <LoadingSpinner size="small" /> Finding available barber...
              </span>
            ) : previewBarber ? (
              <>
                <span>{previewBarber.name}</span>
                <span>{previewBarber.specialty}</span>
              </>
            ) : booking.barber?.name === 'Any Available' ? (
              <>
                <span>Random Available Barber</span>
                <span style={{ fontStyle: 'italic', color: '#c19a6b' }}>Will be assigned upon confirmation</span>
              </>
            ) : (
              <>
                <span>{booking.barber?.name}</span>
                <span>{booking.barber?.specialty}</span>
              </>
            )}
          </div>
        </div>

        <div className="summary-total">
          <div className="summary-item">
            <strong>Total Duration</strong>
            <strong>{totalDuration} minutes</strong>
          </div>
          <div className="summary-item total-price">
            <strong>Total Price</strong>
            <strong>${totalPrice}</strong>
          </div>
        </div>
      </div>

      {/* Stripe Payment Section */}
      <StripeCardInput ref={paymentRef} disabled={loading} />

      <div className="button-group">
        <button className="btn btn-secondary" onClick={onBack} disabled={loading}>
          Back
        </button>
        <button className="btn btn-confirm" onClick={handleConfirm} disabled={loading}>
          {loading ? (
            <>
              <LoadingSpinner size="small" /> Creating Booking...
            </>
          ) : 'Confirm Booking'}
        </button>
      </div>
    </div>
  );
}

export default BookingSummary;
