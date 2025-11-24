import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import './BarberDashboardPage.css';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function BarberDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.role === 'barber') {
      fetchDashboard();
    }
  }, [user]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/barbers/dashboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/barbers/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh dashboard
        fetchDashboard();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  const formatDate = (dateString) => {
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, 'EEE, MMM d, yyyy');
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

  const getStatusBadge = (status) => {
    const statusClasses = {
      confirmed: 'status-confirmed',
      pending: 'status-pending',
      completed: 'status-completed'
    };
    return (
      <span className={`status-badge ${statusClasses[status] || ''}`}>
        {status}
      </span>
    );
  };

  if (user?.role !== 'barber') {
    return (
      <div className="barber-dashboard-page">
        <div className="barber-container">
          <div className="error-message">
            ⚠️ Access Denied. Barber privileges required.
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="barber-dashboard-page">
        <div className="barber-container">
          <div className="loading-message">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="barber-dashboard-page">
        <div className="barber-container">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  const { today, upcoming } = dashboardData || {};
  const { bookings: todayBookings, stats } = today || { bookings: [], stats: {} };

  return (
    <div className="barber-dashboard-page">
      <div className="barber-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">✂️ Barber Dashboard</h1>
          <p className="dashboard-subtitle">Welcome, {user?.first_name}!</p>
        </div>

        {/* Today's Stats */}
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-label">Today's Appointments</div>
              <div className="stat-value">{stats.total || 0}</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-label">Completed</div>
              <div className="stat-value">{stats.completed || 0}</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-label">Today's Revenue</div>
              <div className="stat-value">${(stats.revenue || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bookings-section">
          <h2>Today's Schedule</h2>
          
          {todayBookings.length === 0 ? (
            <div className="empty-message">
              <p>No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="bookings-grid">
              {todayBookings.map(booking => (
                <div key={booking.id} className="booking-card">
                  <div className="booking-header">
                    <div className="booking-time">
                      <span className="time-icon">🕐</span>
                      <span className="time-value">{formatTime(booking.booking_time)}</span>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                  
                  <div className="booking-customer">
                    <strong>{booking.customer_first_name} {booking.customer_last_name}</strong>
                    <div className="customer-contact">
                      <div>📧 {booking.customer_email}</div>
                      {booking.customer_phone && <div>📞 {booking.customer_phone}</div>}
                    </div>
                  </div>
                  
                  <div className="booking-service">
                    <strong>Service:</strong> {booking.service_name}
                    {booking.service_duration && <span> ({booking.service_duration} min)</span>}
                  </div>
                  
                  {booking.addons && booking.addons.length > 0 && booking.addons[0].name && (
                    <div className="booking-addons">
                      <strong>Add-ons:</strong> {booking.addons.map(a => a.name).join(', ')}
                    </div>
                  )}
                  
                  <div className="booking-price">
                    <strong>Total:</strong> ${booking.total_price}
                  </div>
                  
                  {booking.notes && (
                    <div className="booking-notes">
                      <strong>Notes:</strong> {booking.notes}
                    </div>
                  )}
                  
                  {/* Status Actions */}
                  <div className="booking-actions">
                    {booking.status === 'pending' && (
                      <button
                        className="action-btn btn-confirm"
                        onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                      >
                        ✅ Confirm
                      </button>
                    )}
                    {(booking.status === 'pending' || booking.status === 'confirmed') && (
                      <>
                        <button
                          className="action-btn btn-complete"
                          onClick={() => handleStatusUpdate(booking.id, 'completed')}
                        >
                          ✔️ Mark Complete
                        </button>
                        <button
                          className="action-btn btn-cancel"
                          onClick={() => {
                            if (window.confirm('Cancel this appointment?')) {
                              handleStatusUpdate(booking.id, 'cancelled');
                            }
                          }}
                        >
                          ❌ Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Appointments */}
        {upcoming && upcoming.length > 0 && (
          <div className="upcoming-section">
            <h2>Upcoming Appointments (Next 7 Days)</h2>
            <div className="upcoming-list">
              {upcoming.map(booking => (
                <div key={booking.id} className="upcoming-item">
                  <div className="upcoming-date">
                    {formatDate(booking.booking_date)}
                  </div>
                  <div className="upcoming-time">
                    {formatTime(booking.booking_time)}
                  </div>
                  <div className="upcoming-customer">
                    {booking.customer_first_name} {booking.customer_last_name}
                  </div>
                  <div className="upcoming-service">
                    {booking.service_name}
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BarberDashboardPage;
