import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingAPI } from '../services/api';
import { format } from 'date-fns';
import { useLocation, useNavigate } from 'react-router-dom';
import { services } from '../data';
import './ProfilePage.css';

function ProfilePage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [location]); // Refresh when navigation changes

  const fetchBookings = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await bookingAPI.getMyBookings();
      const bookingsData = response.data.data?.bookings || response.data.bookings || [];
      
      console.log('Fetched bookings:', bookingsData); // Debug log
      
      // Transform backend data to match frontend structure
      const transformedBookings = bookingsData.map(booking => {
        // Handle barber name - use only first name, remove 'Balkan' if present
        let barberName = 'Any Available';
        if (booking.barber_first_name) {
          if (booking.barber_first_name === 'Any Available') {
            barberName = 'Any Available';
          } else {
            barberName = booking.barber_first_name;
          }
        }

        return {
          _id: booking.id,
          date: booking.booking_date,
          time: booking.booking_time,
          status: booking.status,
          totalPrice: booking.total_price,
          notes: booking.notes,
          hairstyleImage: booking.hairstyle_image,
          service: {
            name: booking.service_name,
            duration: booking.duration
          },
          barber: {
            name: barberName
          },
          addons: [] // TODO: Fetch addons if needed
        };
      });
      
      setBookings(transformedBookings);
      setError(null);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load order history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      confirmed: 'status-confirmed',
      pending: 'status-pending',
      cancelled: 'status-cancelled',
      completed: 'status-completed'
    };
    return (
      <span className={`status-badge ${statusClasses[status] || ''}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (err) {
      return dateString;
    }
  };

  const formatTime = (timeString) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch (err) {
      return timeString;
    }
  };

  const handleReorder = (booking) => {
    // Find the service from the services list that matches the booking
    const matchedService = services.find(s => s.name === booking.service?.name);
    
    if (matchedService) {
      // Navigate to booking page with pre-selected service, starting at step 2 (date selection)
      navigate('/booking', { 
        state: { 
          preselectedServices: [matchedService],
          startAtStep: 2
        } 
      });
    } else {
      // If service not found, just navigate to booking page
      navigate('/booking');
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="profile-info">
            <h1>{user?.firstName} {user?.lastName}</h1>
            <p className="profile-email">{user?.email}</p>
            <p className="profile-phone">{user?.phone}</p>
          </div>
        </div>

        <div className="order-history">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Order History</h2>
            <button 
              className="btn btn-secondary"
              onClick={() => fetchBookings(true)}
              disabled={refreshing || loading}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
          
          {loading && !refreshing && (
            <div className="loading-message">Loading your bookings...</div>
          )}
          
          {error && (
            <div className="error-message">{error}</div>
          )}
          
          {!loading && !error && bookings.length === 0 && (
            <div className="no-bookings">
              <p>No bookings found</p>
              <a href="/booking" className="book-now-btn">Book Your First Appointment</a>
            </div>
          )}
          
          {!loading && !error && bookings.length > 0 && (
            <div className="bookings-list">
              {bookings.map((booking) => (
                <div key={booking._id || booking.id} className="booking-card">
                  <div className="booking-header">
                    <div className="booking-date">
                      <span className="date-icon">📅</span>
                      <span>{formatDate(booking.date)}</span>
                      <span className="time-separator">•</span>
                      <span>{formatTime(booking.time)}</span>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                  
                  <div className="booking-details">
                    <div className="detail-row">
                      <span className="detail-label">Barber:</span>
                      <span className="detail-value">{booking.barber?.name || 'N/A'}</span>
                    </div>
                    
                    <div className="detail-row">
                      <span className="detail-label">Service:</span>
                      <span className="detail-value">{booking.service?.name || 'N/A'}</span>
                    </div>
                    
                    {booking.addons && booking.addons.length > 0 && (
                      <div className="detail-row">
                        <span className="detail-label">Add-ons:</span>
                        <span className="detail-value">
                          {booking.addons.map(addon => addon.name).join(', ')}
                        </span>
                      </div>
                    )}
                    
                    <div className="detail-row total">
                      <span className="detail-label">Total:</span>
                      <span className="detail-value price">${booking.totalPrice}</span>
                    </div>
                  </div>
                  
                  {booking.notes && (
                    <div className="booking-notes">
                      <span className="notes-label">Notes:</span>
                      <span className="notes-text">{booking.notes}</span>
                    </div>
                  )}
                  
                  <div className="booking-actions">
                    <button 
                      className="btn btn-primary reorder-btn"
                      onClick={() => handleReorder(booking)}
                    >
                      🔄 Reorder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
