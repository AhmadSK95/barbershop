import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

function BookingSummary({ booking, totalPrice, totalDuration, onConfirm, onBack }) {
  const [loading, setLoading] = useState(false);
  const [previewBarber, setPreviewBarber] = useState(null);
  const [loadingBarber, setLoadingBarber] = useState(false);
  const navigate = useNavigate();

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
    try {
      setLoading(true);

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
        notes: ''
      };

      console.log('Creating booking:', bookingData); // Debug log
      const response = await bookingAPI.create(bookingData);
      console.log('Booking created:', response.data); // Debug log
      
      // Get assigned barber info from response
      const assignedBarber = response.data.data?.assignedBarber;
      
      // Show confirmation with assigned barber
      let confirmationMessage = 'Booking confirmed! ✅\n\nYou will receive a confirmation email shortly.';
      if (assignedBarber && booking.barber?.name === 'Any Available') {
        confirmationMessage = `Booking confirmed! ✅\n\nYour barber: ${assignedBarber.name}\n\nYou will receive a confirmation email shortly.`;
      }
      
      alert(confirmationMessage);
      
      // Reset booking state
      onConfirm();
      
      // Navigate to profile page immediately to show the updated booking
      navigate('/profile', { replace: true });
    } catch (err) {
      console.error('Booking error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to create booking. Please try again.';
      alert('❌ ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="step-container">
      <h2>Booking Summary</h2>
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
