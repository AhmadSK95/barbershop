import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingAPI } from '../services/api';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import RescheduleModal from '../components/RescheduleModal';
import PaymentModal from '../components/PaymentModal';
import { SkeletonTable } from '../components/SkeletonLoader';
import './AdminPage.css';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function AdminPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, confirmed, completed, cancelled
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentBooking, setSelectedPaymentBooking] = useState(null);

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
        barber_id: booking.barber_id,
        // Payment fields
        stripeCustomerId: booking.stripe_customer_id,
        stripePaymentMethodId: booking.stripe_payment_method_id,
        cardBrand: booking.card_brand,
        cardLast4: booking.card_last_4,
        paymentStatus: booking.payment_status || 'pending',
        paymentAmount: booking.payment_amount,
        paymentVerified: booking.payment_verified,
        stripeChargeId: booking.stripe_charge_id,
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
      toast.success('Booking cancelled successfully');
      // Refresh the bookings list
      fetchAllBookings();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      toast.error('Failed to cancel booking: ' + (err.response?.data?.message || err.message));
    }
  };
  
  const handleReschedule = (booking) => {
    // Transform admin booking format to match what RescheduleModal expects
    const transformedBooking = {
      _id: booking.id,
      date: booking.date,
      time: booking.time,
      status: booking.status,
      service: booking.service,
      barber: {
        id: booking.barber_id,
        name: booking.barber.name
      }
    };
    setSelectedBooking(transformedBooking);
    setRescheduleModalOpen(true);
  };
  
  const handleRescheduleSuccess = () => {
    setRescheduleModalOpen(false);
    setSelectedBooking(null);
    fetchAllBookings();
  };
  
  const handlePayNow = (booking) => {
    setSelectedPaymentBooking(booking);
    setPaymentModalOpen(true);
  };
  
  const handlePaymentSuccess = () => {
    setPaymentModalOpen(false);
    setSelectedPaymentBooking(null);
    fetchAllBookings();
  };
  
  const getPaymentStatusBadge = (status) => {
    const statusClasses = {
      paid: 'payment-status-paid',
      pending: 'payment-status-pending',
      refunded: 'payment-status-refunded'
    };
    const statusText = {
      paid: '✓ Paid',
      pending: '⏳ Pending',
      refunded: '↩ Refunded'
    };
    return (
      <span className={`payment-status-badge ${statusClasses[status] || statusClasses.pending}`}>
        {statusText[status] || statusText.pending}
      </span>
    );
  };
  
  const formatCardInfo = (brand, last4) => {
    if (!brand || !last4) return 'No card saved';
    const brandFormatted = brand.charAt(0).toUpperCase() + brand.slice(1);
    return `${brandFormatted} ••••${last4}`;
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      // Optimistically update the status in state immediately
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus }
            : booking
        )
      );

      // Send update to server
      const response = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      // Show success message
      toast.success('Booking status updated successfully');
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
      // Revert the optimistic update on error
      fetchAllBookings();
    }
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

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (filter !== 'all') params.append('status', filter);
      
      const url = `${API_URL}/admin/analytics/bookings/export?${params.toString()}`;
      
      // Download the CSV file
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export error:', errorText);
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }
      
      // Check if response is actually CSV
      const contentType = response.headers.get('content-type');
      if (!contentType || (!contentType.includes('csv') && !contentType.includes('text/plain'))) {
        const text = await response.text();
        console.error('Unexpected response:', text);
        throw new Error('Server did not return CSV data');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `bookings_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('CSV exported successfully');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      toast.error(`Failed to export bookings: ${err.message}`);
    }
  };

  // Normalize date for comparison (extract YYYY-MM-DD portion)
  const normalizeDate = (dateString) => {
    if (!dateString) return '';
    // Handle both "2025-11-20" and "2025-11-20T00:00:00.000Z" formats
    return dateString.split('T')[0];
  };

  const filteredBookings = bookings.filter(booking => {
    // Filter by status
    if (filter !== 'all' && booking.status !== filter) return false;
    
    // Filter by date range
    if (startDate && normalizeDate(booking.date) < startDate) return false;
    if (endDate && normalizeDate(booking.date) > endDate) return false;
    
    // Filter by search term (customer name, email, or barber)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const customerMatch = booking.customer.name.toLowerCase().includes(term) ||
                           booking.customer.email.toLowerCase().includes(term);
      const barberMatch = booking.barber.name.toLowerCase().includes(term);
      const serviceMatch = booking.service?.name?.toLowerCase().includes(term);
      
      if (!customerMatch && !barberMatch && !serviceMatch) return false;
    }
    
    return true;
  });

  // Calculate revenue statistics
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => normalizeDate(b.date) === today);
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

        {/* Search and Filters */}
        <div className="admin-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Search by customer, barber, or service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="date-filters">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
              className="date-input"
            />
            <span className="date-separator">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
              className="date-input"
            />
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); setSearchTerm(''); }}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          </div>
          
          <div className="export-actions">
            <button onClick={handleExportCSV} className="export-csv-btn">
              📥 Export CSV
            </button>
            <div className="results-count">
              Showing {filteredBookings.length} of {bookings.length} bookings
            </div>
          </div>
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
            <SkeletonTable rows={8} columns={8} />
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
                    <th>Payment</th>
                    <th>Card</th>
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
                      <td>{getPaymentStatusBadge(booking.paymentStatus)}</td>
                      <td className="card-info-cell">
                        {formatCardInfo(booking.cardBrand, booking.cardLast4)}
                      </td>
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
                                className="reschedule-btn-admin"
                                onClick={() => handleReschedule(booking)}
                                title="Reschedule booking"
                              >
                                📅
                              </button>
                              {booking.stripePaymentMethodId && 
                               booking.paymentStatus === 'pending' && 
                               (booking.status === 'confirmed' || booking.status === 'completed') && (
                                <button 
                                  className="pay-now-btn"
                                  onClick={() => handlePayNow(booking)}
                                  title="Charge saved payment method"
                                >
                                  💳 Pay Now
                                </button>
                              )}
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
      
      {rescheduleModalOpen && selectedBooking && (
        <RescheduleModal
          booking={selectedBooking}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSelectedBooking(null);
          }}
          onSuccess={handleRescheduleSuccess}
        />
      )}
      
      {paymentModalOpen && selectedPaymentBooking && (
        <PaymentModal
          booking={selectedPaymentBooking}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedPaymentBooking(null);
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

export default AdminPage;
