import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingAPI, userAPI } from '../services/api';
import { format } from 'date-fns';
import { useLocation, useNavigate } from 'react-router-dom';
import { services } from '../data';
import './ProfilePage.css';

function ProfilePage() {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('orders'); // 'profile', 'password', 'orders'
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchBookings();
    }
  }, [location, activeTab]); // Refresh when navigation changes or tab switches to orders
  
  useEffect(() => {
    // Update profile form when user changes
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

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
          service: {
            name: booking.service_name,
            duration: booking.duration
          },
          barber: {
            id: booking.barber_id,
            name: barberName,
            specialty: booking.barber_specialty
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
      // Handle full ISO timestamps (2025-11-25T00:00:00.000Z) or date strings (2025-11-25)
      if (dateString.includes('T')) {
        // Extract just the date portion from timestamp
        const datePart = dateString.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return format(date, 'MMM dd, yyyy');
      } else {
        // Parse date string as local date to avoid timezone issues
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return format(date, 'MMM dd, yyyy');
      }
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
    
    if (matchedService && booking.barber) {
      // Navigate to booking page with pre-selected service and barber, starting at step 3 (date/time selection)
      navigate('/booking', { 
        state: { 
          preselectedServices: [matchedService],
          preselectedBarber: {
            id: booking.barber.id,
            name: booking.barber.name,
            specialty: booking.barber.specialty
          },
          startAtStep: 3
        } 
      });
    } else if (matchedService) {
      // If only service found, start at barber selection
      navigate('/booking', { 
        state: { 
          preselectedServices: [matchedService],
          startAtStep: 1
        } 
      });
    } else {
      // If service not found, just navigate to booking page
      navigate('/booking');
    }
  };
  
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage({ type: '', text: '' });
    
    try {
      const response = await userAPI.updateProfile(profileForm);
      
      if (response.data.success) {
        // Update user in context
        const updatedUser = response.data.data.user;
        setUser({
          ...user,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          phone: updatedUser.phone
        });
        
        setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => setProfileMessage({ type: '', text: '' }), 3000);
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setProfileMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to update profile. Please try again.' 
      });
    } finally {
      setProfileLoading(false);
    }
  };
  
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage({ type: '', text: '' });
    
    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      setPasswordLoading(false);
      return;
    }
    
    try {
      const response = await userAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      if (response.data.success) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setPasswordMessage({ type: '', text: '' }), 3000);
      }
    } catch (err) {
      console.error('Password change error:', err);
      setPasswordMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to change password. Please try again.' 
      });
    } finally {
      setPasswordLoading(false);
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
            {user?.phone && <p className="profile-phone">{user?.phone}</p>}
          </div>
        </div>
        
        <div className="profile-tabs">
          <button 
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile
          </button>
          <button 
            className={`tab-btn ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            🔒 Password
          </button>
          <button 
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📋 Orders
          </button>
        </div>

        {activeTab === 'profile' && (
          <div className="profile-form-section">
            <h2>Update Profile</h2>
            
            {profileMessage.text && (
              <div className={`message ${profileMessage.type}`}>
                {profileMessage.text}
              </div>
            )}
            
            <form onSubmit={handleProfileUpdate} className="profile-form">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  required
                  minLength={2}
                  maxLength={50}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  required
                  minLength={2}
                  maxLength={50}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="(123) 456-7890"
                  minLength={10}
                  maxLength={15}
                />
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={profileLoading}
              >
                {profileLoading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>
        )}
        
        {activeTab === 'password' && (
          <div className="password-form-section">
            <h2>Change Password</h2>
            <p className="password-requirements">
              Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
            </p>
            
            {passwordMessage.text && (
              <div className={`message ${passwordMessage.type}`}>
                {passwordMessage.text}
              </div>
            )}
            
            <form onSubmit={handlePasswordChange} className="password-form">
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={passwordLoading}
              >
                {passwordLoading ? 'Changing Password...' : 'Change Password'}
              </button>
            </form>
          </div>
        )}
        
        {activeTab === 'orders' && (
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
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
