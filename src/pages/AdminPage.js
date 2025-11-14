import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingAPI } from '../services/api';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './AdminPage.css';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function AdminPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, confirmed, completed, cancelled

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAllBookings();
    }
  }, [user]);

  const fetchAllBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/bookings/all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      
      const data = await response.json();
      const bookingsData = data.data?.bookings || data.bookings || [];
      
      // Transform backend data
      const transformedBookings = bookingsData.map(booking => ({
        id: booking.id,
        date: booking.booking_date,
        time: booking.booking_time,
        status: booking.status,
        totalPrice: booking.total_price,
        notes: booking.notes,
        createdAt: booking.created_at,
        service: {
          name: booking.service_name
        },
        customer: {
          name: `${booking.customer_first_name} ${booking.customer_last_name}`,
          email: booking.customer_email
        },
        barber: {
          name: booking.barber_first_name && booking.barber_last_name
            ? `${booking.barber_first_name} ${booking.barber_last_name}`
            : 'Any Available'
        }
      }));
      
      setBookings(transformedBookings);
      setError(null);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await bookingAPI.cancel(bookingId);
      alert('✅ Booking cancelled successfully');
      // Refresh the bookings list
      fetchAllBookings();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      alert('❌ Failed to cancel booking: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await fetch(`${API_URL}/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      alert('✅ Booking status updated successfully');
      fetchAllBookings();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('❌ Failed to update status');
    }
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

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  // Calculate revenue statistics
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === today);
  const completedBookings = bookings.filter(b => b.status === 'completed');
  
  const revenue = {
    today: todayBookings.reduce((sum, b) => sum + (parseFloat(b.totalPrice) || 0), 0),
    todayCompleted: todayBookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (parseFloat(b.totalPrice) || 0), 0),
    total: completedBookings.reduce((sum, b) => sum + (parseFloat(b.totalPrice) || 0), 0),
    pending: bookings.filter(b => b.status === 'pending').reduce((sum, b) => sum + (parseFloat(b.totalPrice) || 0), 0),
    cancelled: bookings.filter(b => b.status === 'cancelled').reduce((sum, b) => sum + (parseFloat(b.totalPrice) || 0), 0),
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  if (user?.role !== 'admin') {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="error-message">
            ⚠️ Access Denied. Admin privileges required.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1 className="admin-title">📊 Dashboard</h1>
          <p className="admin-subtitle">Manage all bookings and appointments</p>
        </div>

        {/* Revenue Highlight Banner */}
        <div className="revenue-banner">
          <div className="revenue-main">
            <div className="revenue-icon">💰</div>
            <div className="revenue-content">
              <div className="revenue-label">Today's Revenue</div>
              <div className="revenue-amount">${revenue.todayCompleted.toFixed(2)}</div>
              <div className="revenue-details">
                {todayBookings.length} bookings today • {todayBookings.filter(b => b.status === 'completed').length} completed
              </div>
            </div>
          </div>
          <div className="revenue-stats-mini">
            <div className="revenue-stat">
              <div className="revenue-stat-label">Total Revenue</div>
              <div className="revenue-stat-value">${revenue.total.toFixed(2)}</div>
            </div>
            <div className="revenue-stat">
              <div className="revenue-stat-label">Pending</div>
              <div className="revenue-stat-value pending-color">${revenue.pending.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Statistics Graph */}
        <div className="stats-chart-container">
          <div className="chart-header">
            <h2>Booking Statistics</h2>
            <div className="chart-total-revenue">
              💵 Total Completed: <span>${revenue.total.toFixed(2)}</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'Total', count: stats.total, fill: '#8884d8' },
              { name: 'Pending', count: stats.pending, fill: '#ffc107' },
              { name: 'Confirmed', count: stats.confirmed, fill: '#28a745' },
              { name: 'Completed', count: stats.completed, fill: '#17a2b8' },
              { name: 'Cancelled', count: stats.cancelled, fill: '#dc3545' }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Filter Buttons */}
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={`filter-btn ${filter === 'confirmed' ? 'active' : ''}`}
            onClick={() => setFilter('confirmed')}
          >
            Confirmed
          </button>
          <button 
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
          <button 
            className={`filter-btn ${filter === 'cancelled' ? 'active' : ''}`}
            onClick={() => setFilter('cancelled')}
          >
            Cancelled
          </button>
        </div>

        {/* Bookings Table */}
        <div className="bookings-section">
          <h2>Bookings List</h2>
          
          {loading && (
            <div className="loading-message">Loading bookings...</div>
          )}
          
          {error && (
            <div className="error-message">{error}</div>
          )}
          
          {!loading && !error && filteredBookings.length === 0 && (
            <div className="no-bookings">
              <p>No bookings found for this filter</p>
            </div>
          )}
          
          {!loading && !error && filteredBookings.length > 0 && (
            <div className="bookings-table-container">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Barber</th>
                    <th>Date & Time</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>#{booking.id}</td>
                      <td>
                        <div className="customer-info">
                          <div className="customer-name">{booking.customer.name}</div>
                          <div className="customer-email">{booking.customer.email}</div>
                        </div>
                      </td>
                      <td>{booking.service.name}</td>
                      <td>{booking.barber.name}</td>
                      <td>
                        <div className="datetime-info">
                          <div>{formatDate(booking.date)}</div>
                          <div>{formatTime(booking.time)}</div>
                        </div>
                      </td>
                      <td className="price-cell">${booking.totalPrice}</td>
                      <td>{getStatusBadge(booking.status)}</td>
                      <td>
                        <div className="action-buttons">
                          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                            <>
                              <select 
                                className="status-select"
                                value={booking.status}
                                onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                              >
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="completed">Completed</option>
                              </select>
                              <button 
                                className="cancel-btn"
                                onClick={() => handleCancelBooking(booking.id)}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {(booking.status === 'cancelled' || booking.status === 'completed') && (
                            <span className="no-actions">No actions</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
