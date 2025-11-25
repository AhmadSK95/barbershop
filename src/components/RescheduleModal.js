import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import LoadingSpinner from './LoadingSpinner';
import './RescheduleModal.css';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function RescheduleModal({ booking, onClose, onSuccess }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState('');
  const [policyWindow, setPolicyWindow] = useState(2);

  useEffect(() => {
    // Fetch policy window
    fetchPolicyWindow();
  }, []);

  useEffect(() => {
    // Fetch available slots when date changes
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  const fetchPolicyWindow = async () => {
    try {
      const response = await fetch(`${API_URL}/config/availability/settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        const setting = data.data.settings.find(s => s.setting_key === 'reschedule_window_hours');
        if (setting) {
          setPolicyWindow(parseInt(setting.setting_value));
        }
      }
    } catch (err) {
      console.error('Error fetching policy:', err);
    }
  };

  const fetchAvailableSlots = async () => {
    setLoadingSlots(true);
    setError('');
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        ...(booking.barber?.id && { barberId: booking.barber.id })
      });

      const response = await fetch(`${API_URL}/bookings/reschedule/available-slots?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setAvailableSlots(data.data.availableSlots);
        if (data.data.availableSlots.length === 0) {
          setError('No available time slots for this date');
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
      setError('Failed to load available times');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      setError('Please select both date and time');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/bookings/${booking._id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          newDate: selectedDate,
          newTime: selectedTime + ':00'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('✅ Booking rescheduled successfully!');
        onSuccess();
        onClose();
      } else {
        setError(data.message);
        alert('❌ Failed to reschedule: ' + data.message);
      }
    } catch (err) {
      console.error('Error rescheduling:', err);
      const errorMsg = err.message || 'Failed to reschedule booking';
      setError(errorMsg);
      alert('❌ Error: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatOriginalDate = () => {
    try {
      const dateStr = booking.date.includes('T') 
        ? booking.date.split('T')[0] 
        : booking.date;
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, 'EEEE, MMMM d, yyyy');
    } catch (err) {
      return booking.date;
    }
  };

  const formatOriginalTime = () => {
    try {
      const [hours, minutes] = booking.time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch (err) {
      return booking.time;
    }
  };

  // Get min date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Get max date (3 months from now)
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔄 Reschedule Appointment</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Current Booking Info */}
          <div className="current-booking-info">
            <h3>Current Appointment</h3>
            <div className="booking-detail">
              <strong>Date:</strong> {formatOriginalDate()}
            </div>
            <div className="booking-detail">
              <strong>Time:</strong> {formatOriginalTime()}
            </div>
            <div className="booking-detail">
              <strong>Service:</strong> {booking.service?.name}
            </div>
            <div className="booking-detail">
              <strong>Barber:</strong> {booking.barber?.name}
            </div>
          </div>

          {/* Policy Notice */}
          <div className="policy-notice">
            ⚠️ Appointments must be rescheduled at least {policyWindow} hours in advance
          </div>

          {/* New Date Selection */}
          <div className="form-group">
            <label>Select New Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime('');
              }}
              min={minDate}
              max={maxDateStr}
              className="date-input"
            />
          </div>

          {/* Time Selection */}
          {selectedDate && (
            <div className="form-group">
              <label>Select New Time</label>
              {loadingSlots ? (
                <div className="loading-slots">
                  <LoadingSpinner size="small" message="Loading available times..." />
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="time-slots-grid">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      className={`time-slot ${selectedTime === slot ? 'selected' : ''}`}
                      onClick={() => setSelectedTime(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="no-slots">No available time slots for this date</div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Selected Summary */}
          {selectedDate && selectedTime && (
            <div className="new-appointment-summary">
              <h4>New Appointment:</h4>
              <p>
                {(() => {
                  const [year, month, day] = selectedDate.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  return format(date, 'EEEE, MMMM d, yyyy');
                })()} at {selectedTime}
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="btn-secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleReschedule}
            disabled={loading || !selectedDate || !selectedTime}
          >
            {loading ? (
              <>
                <LoadingSpinner size="small" /> Rescheduling...
              </>
            ) : 'Confirm Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RescheduleModal;
