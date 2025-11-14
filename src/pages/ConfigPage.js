import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './ConfigPage.css';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function ConfigPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('barbers');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Barbers state
  const [barbers, setBarbers] = useState([]);
  const [editingBarber, setEditingBarber] = useState(null);
  const [newBarber, setNewBarber] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    specialty: '',
    rating: 5.0,
    serviceIds: [],
    imageFile: null
  });

  // Services state
  const [services, setServices] = useState([]);
  const [editingService, setEditingService] = useState(null);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    price: '',
    duration: 30
  });

  // Availability settings state
  const [availabilitySettings, setAvailabilitySettings] = useState({
    businessHoursStart: '10:00',
    businessHoursEnd: '19:00',
    bookingSlotDuration: 30,
    daysOpen: [1, 2, 3, 4, 5, 6] // Monday to Saturday
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user, activeTab]);

  // Always fetch services for the multi-select
  useEffect(() => {
    if (user?.role === 'admin' && services.length === 0) {
      fetchServices();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'barbers') {
        await fetchBarbers();
      } else if (activeTab === 'services') {
        await fetchServices();
      } else if (activeTab === 'availability') {
        await fetchAvailabilitySettings();
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBarbers = async () => {
    const response = await fetch(`${API_URL}/config/barbers`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    if (data.success) {
      setBarbers(data.data.barbers);
    }
  };

  const fetchServices = async () => {
    const response = await fetch(`${API_URL}/config/services`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    if (data.success) {
      setServices(data.data.services);
    }
  };

  const fetchAvailabilitySettings = async () => {
    const response = await fetch(`${API_URL}/config/availability/settings`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    if (data.success) {
      // Convert settings array to object
      const settings = {};
      data.data.settings.forEach(setting => {
        if (setting.setting_key === 'business_hours_start') {
          settings.businessHoursStart = setting.setting_value;
        } else if (setting.setting_key === 'business_hours_end') {
          settings.businessHoursEnd = setting.setting_value;
        } else if (setting.setting_key === 'booking_slot_duration') {
          settings.bookingSlotDuration = parseInt(setting.setting_value);
        } else if (setting.setting_key === 'days_open') {
          settings.daysOpen = JSON.parse(setting.setting_value);
        }
      });
      setAvailabilitySettings(prev => ({ ...prev, ...settings }));
    }
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Barber handlers
  const handleCreateBarber = async (e) => {
    e.preventDefault();
    try {
      // TODO: Handle image upload to server if imageFile exists
      const barberData = {
        ...newBarber,
        imageUrl: newBarber.imageFile ? `/images/barbers/${newBarber.imageFile.name}` : ''
      };
      delete barberData.imageFile;

      const response = await fetch(`${API_URL}/config/barbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(barberData)
      });
      const data = await response.json();
      if (data.success) {
        showSuccess('Barber created successfully');
        setNewBarber({ firstName: '', lastName: '', email: '', password: '', specialty: '', rating: 5.0, serviceIds: [], imageFile: null });
        fetchBarbers();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to create barber');
    }
  };

  const handleUpdateBarber = async (barberId) => {
    try {
      const response = await fetch(`${API_URL}/config/barbers/${barberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editingBarber)
      });
      const data = await response.json();
      if (data.success) {
        showSuccess('Barber updated successfully');
        setEditingBarber(null);
        fetchBarbers();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to update barber');
    }
  };

  const handleDeleteBarber = async (barberId) => {
    if (!window.confirm('Are you sure you want to delete this barber?')) return;
    
    try {
      const response = await fetch(`${API_URL}/config/barbers/${barberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        showSuccess('Barber deleted successfully');
        fetchBarbers();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to delete barber');
    }
  };

  const handleToggleBarberActive = async (barber) => {
    try {
      const response = await fetch(`${API_URL}/config/barbers/${barber.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isActive: !barber.is_active })
      });
      const data = await response.json();
      if (data.success) {
        showSuccess(`Barber ${barber.is_active ? 'deactivated' : 'activated'}`);
        fetchBarbers();
      }
    } catch (err) {
      setError('Failed to update barber status');
    }
  };

  // Service handlers
  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/config/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newService)
      });
      const data = await response.json();
      if (data.success) {
        showSuccess('Service created successfully');
        setNewService({ name: '', description: '', price: '', duration: 30 });
        fetchServices();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to create service');
    }
  };

  const handleUpdateService = async (serviceId) => {
    try {
      const response = await fetch(`${API_URL}/config/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editingService)
      });
      const data = await response.json();
      if (data.success) {
        showSuccess('Service updated successfully');
        setEditingService(null);
        fetchServices();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to update service');
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    
    try {
      const response = await fetch(`${API_URL}/config/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        showSuccess('Service deleted successfully');
        fetchServices();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to delete service');
    }
  };

  const handleToggleServiceActive = async (service) => {
    try {
      const response = await fetch(`${API_URL}/config/services/${service.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isActive: !service.is_active })
      });
      const data = await response.json();
      if (data.success) {
        showSuccess(`Service ${service.is_active ? 'deactivated' : 'activated'}`);
        fetchServices();
      }
    } catch (err) {
      setError('Failed to update service status');
    }
  };

  // Availability handlers
  const handleUpdateAvailability = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/config/availability/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(availabilitySettings)
      });
      const data = await response.json();
      if (data.success) {
        showSuccess('Availability settings updated successfully');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to update availability settings');
    }
  };

  const toggleDayOpen = (day) => {
    setAvailabilitySettings(prev => {
      const daysOpen = prev.daysOpen.includes(day)
        ? prev.daysOpen.filter(d => d !== day)
        : [...prev.daysOpen, day].sort();
      return { ...prev, daysOpen };
    });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="config-page">
        <div className="config-container">
          <div className="error-message">
            ⚠️ Access Denied. Admin privileges required.
          </div>
        </div>
      </div>
    );
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="config-page">
      <div className="config-container">
        <div className="config-header">
          <h1 className="config-title">⚙️ Configuration</h1>
          <p className="config-subtitle">Manage your barbershop settings</p>
        </div>

        {successMessage && (
          <div className="success-banner">
            ✅ {successMessage}
          </div>
        )}

        {error && (
          <div className="error-banner">
            ❌ {error}
          </div>
        )}

        <div className="config-tabs">
          <button
            className={`config-tab ${activeTab === 'barbers' ? 'active' : ''}`}
            onClick={() => setActiveTab('barbers')}
          >
            👨‍💼 Barbers
          </button>
          <button
            className={`config-tab ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            ✂️ Services
          </button>
          <button
            className={`config-tab ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => setActiveTab('availability')}
          >
            📅 Availability
          </button>
        </div>

        <div className="config-content">
          {loading && <div className="loading-message">Loading...</div>}

          {/* Barbers Tab */}
          {activeTab === 'barbers' && !loading && (
            <div className="barbers-section">
              <div className="section-card">
                <h2>Add New Barber</h2>
                <form onSubmit={handleCreateBarber} className="config-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input
                        type="text"
                        value={newBarber.firstName}
                        onChange={(e) => setNewBarber({ ...newBarber, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input
                        type="text"
                        value={newBarber.lastName}
                        onChange={(e) => setNewBarber({ ...newBarber, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        value={newBarber.email}
                        onChange={(e) => setNewBarber({ ...newBarber, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Password *</label>
                      <input
                        type="password"
                        value={newBarber.password}
                        onChange={(e) => setNewBarber({ ...newBarber, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Specialty</label>
                      <input
                        type="text"
                        value={newBarber.specialty}
                        onChange={(e) => setNewBarber({ ...newBarber, specialty: e.target.value })}
                        placeholder="e.g., Master Barber - All Services"
                      />
                    </div>
                    <div className="form-group">
                      <label>Rating</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={newBarber.rating}
                        onChange={(e) => setNewBarber({ ...newBarber, rating: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Services Offered *</label>
                    <div className="multi-select-container">
                      {services.map(service => (
                        <label key={service.id} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={newBarber.serviceIds.includes(service.id)}
                            onChange={(e) => {
                              const serviceIds = e.target.checked
                                ? [...newBarber.serviceIds, service.id]
                                : newBarber.serviceIds.filter(id => id !== service.id);
                              setNewBarber({ ...newBarber, serviceIds });
                            }}
                          />
                          <span>{service.name} (${service.price})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Barber Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewBarber({ ...newBarber, imageFile: e.target.files[0] })}
                    />
                    {newBarber.imageFile && (
                      <p className="file-name">Selected: {newBarber.imageFile.name}</p>
                    )}
                  </div>
                  <button type="submit" className="btn-primary">Add Barber</button>
                </form>
              </div>

              <div className="section-card">
                <h2>Existing Barbers</h2>
                <div className="items-list">
                  {barbers.map(barber => (
                    <div key={barber.id} className={`item-card ${!barber.is_active ? 'inactive' : ''}`}>
                      {editingBarber?.id === barber.id ? (
                        <div className="edit-form">
                          <div className="form-row">
                            <input
                              type="text"
                              value={editingBarber.firstName}
                              onChange={(e) => setEditingBarber({ ...editingBarber, firstName: e.target.value })}
                              placeholder="First Name"
                            />
                            <input
                              type="text"
                              value={editingBarber.lastName}
                              onChange={(e) => setEditingBarber({ ...editingBarber, lastName: e.target.value })}
                              placeholder="Last Name"
                            />
                          </div>
                          <input
                            type="text"
                            value={editingBarber.specialty}
                            onChange={(e) => setEditingBarber({ ...editingBarber, specialty: e.target.value })}
                            placeholder="Specialty"
                          />
                          <div className="form-row">
                            <input
                              type="number"
                              min="0"
                              max="5"
                              step="0.1"
                              value={editingBarber.rating}
                              onChange={(e) => setEditingBarber({ ...editingBarber, rating: parseFloat(e.target.value) })}
                            />
                            <input
                              type="text"
                              value={editingBarber.imageUrl || ''}
                              onChange={(e) => setEditingBarber({ ...editingBarber, imageUrl: e.target.value })}
                              placeholder="Image URL"
                            />
                          </div>
                          <div className="edit-actions">
                            <button onClick={() => handleUpdateBarber(barber.id)} className="btn-save">Save</button>
                            <button onClick={() => setEditingBarber(null)} className="btn-cancel">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="item-info">
                            <h3>{barber.first_name} {barber.last_name}</h3>
                            <p className="item-detail">{barber.email}</p>
                            <p className="item-detail">{barber.specialty}</p>
                            <p className="item-detail">⭐ {barber.rating}</p>
                            {barber.image_url && <p className="item-detail">🖼️ {barber.image_url}</p>}
                            <span className={`status-badge ${barber.is_active ? 'active' : 'inactive'}`}>
                              {barber.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="item-actions">
                            <button
                              onClick={() => setEditingBarber({
                                id: barber.id,
                                firstName: barber.first_name,
                                lastName: barber.last_name,
                                specialty: barber.specialty,
                                rating: barber.rating,
                                imageUrl: barber.image_url
                              })}
                              className="btn-edit"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleBarberActive(barber)}
                              className="btn-toggle"
                            >
                              {barber.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button onClick={() => handleDeleteBarber(barber.id)} className="btn-delete">Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && !loading && (
            <div className="services-section">
              <div className="section-card">
                <h2>Add New Service</h2>
                <form onSubmit={handleCreateService} className="config-form">
                  <div className="form-group">
                    <label>Service Name *</label>
                    <input
                      type="text"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      required
                      placeholder="e.g., Haircut - Master Barber"
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={newService.description}
                      onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                      placeholder="Service description"
                      rows="3"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Price ($) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newService.price}
                        onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Duration (minutes) *</label>
                      <input
                        type="number"
                        min="15"
                        step="15"
                        value={newService.duration}
                        onChange={(e) => setNewService({ ...newService, duration: parseInt(e.target.value) })}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary">Add Service</button>
                </form>
              </div>

              <div className="section-card">
                <h2>Existing Services</h2>
                <div className="items-list">
                  {services.map(service => (
                    <div key={service.id} className={`item-card ${!service.is_active ? 'inactive' : ''}`}>
                      {editingService?.id === service.id ? (
                        <div className="edit-form">
                          <input
                            type="text"
                            value={editingService.name}
                            onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                            placeholder="Service Name"
                          />
                          <textarea
                            value={editingService.description}
                            onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                            placeholder="Description"
                            rows="2"
                          />
                          <div className="form-row">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editingService.price}
                              onChange={(e) => setEditingService({ ...editingService, price: e.target.value })}
                              placeholder="Price"
                            />
                            <input
                              type="number"
                              min="15"
                              step="15"
                              value={editingService.duration}
                              onChange={(e) => setEditingService({ ...editingService, duration: parseInt(e.target.value) })}
                              placeholder="Duration"
                            />
                          </div>
                          <div className="edit-actions">
                            <button onClick={() => handleUpdateService(service.id)} className="btn-save">Save</button>
                            <button onClick={() => setEditingService(null)} className="btn-cancel">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="item-info">
                            <h3>{service.name}</h3>
                            <p className="item-detail">{service.description}</p>
                            <p className="item-detail">💵 ${service.price} • ⏱️ {service.duration} min</p>
                            <span className={`status-badge ${service.is_active ? 'active' : 'inactive'}`}>
                              {service.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="item-actions">
                            <button
                              onClick={() => setEditingService({
                                id: service.id,
                                name: service.name,
                                description: service.description,
                                price: service.price,
                                duration: service.duration
                              })}
                              className="btn-edit"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleServiceActive(service)}
                              className="btn-toggle"
                            >
                              {service.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button onClick={() => handleDeleteService(service.id)} className="btn-delete">Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Availability Tab */}
          {activeTab === 'availability' && !loading && (
            <div className="availability-section">
              <div className="section-card">
                <h2>Business Hours & Settings</h2>
                <form onSubmit={handleUpdateAvailability} className="config-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Opening Time</label>
                      <input
                        type="time"
                        value={availabilitySettings.businessHoursStart}
                        onChange={(e) => setAvailabilitySettings({ ...availabilitySettings, businessHoursStart: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Closing Time</label>
                      <input
                        type="time"
                        value={availabilitySettings.businessHoursEnd}
                        onChange={(e) => setAvailabilitySettings({ ...availabilitySettings, businessHoursEnd: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Booking Slot Duration (minutes)</label>
                    <select
                      value={availabilitySettings.bookingSlotDuration}
                      onChange={(e) => setAvailabilitySettings({ ...availabilitySettings, bookingSlotDuration: parseInt(e.target.value) })}
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">60 minutes</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Days Open</label>
                    <div className="days-selector">
                      {dayNames.map((day, index) => (
                        <button
                          key={index}
                          type="button"
                          className={`day-button ${availabilitySettings.daysOpen.includes(index) ? 'selected' : ''}`}
                          onClick={() => toggleDayOpen(index)}
                        >
                          {day.substring(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="btn-primary">Update Settings</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConfigPage;
