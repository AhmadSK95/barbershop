import React, { useState, useEffect } from 'react';
import { bookingAPI } from '../services/api';
import { barbers } from '../data';

function BarberSelection({ selectedBarber, selectedServices, selectedDate, selectedTime, onSelect, onNext, onBack }) {
  const [availableBarbers, setAvailableBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch barbers - either all barbers or available barbers for specific date/time
  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let barbersData;
        
        // If date and time are selected, fetch only available barbers
        if (selectedDate && selectedTime) {
          const response = await bookingAPI.getAvailableBarbers(selectedDate, selectedTime);
          barbersData = response.data.data.barbers;
        } else {
          // Otherwise, show all barbers from local data
          barbersData = barbers;
        }
        
        const availableBarbersFromAPI = barbersData;
        
        // Map barbers to match consistent data structure
        const mappedBarbers = availableBarbersFromAPI.map(barber => {
          // Handle both API format (first_name/last_name) and local format (name)
          const name = barber.first_name || barber.name;
          
          // Map first name to image path
          const imageMap = {
            'Al': '/images/barbers/al.jpeg',
            'Cynthia': '/images/barbers/cynthia.jpeg',
            'Eric': '/images/barbers/eric.jpg',
            'John': '/images/barbers/john.jpg',
            'Nick': '/images/barbers/nick.jpeg',
            'Riza': '/images/barbers/riza.jpeg'
          };
          
          return {
            id: barber.id,
            name: name,
            specialty: barber.specialty,
            rating: barber.rating || barber.rating,
            image: imageMap[name] || barber.image || barber.photo || null
          };
        });
        
        // Add "Any Available" option if there are barbers
        if (mappedBarbers.length > 0) {
          mappedBarbers.unshift({
            id: null,
            name: 'Any Available',
            specialty: 'Let us choose the best barber for you',
            rating: null
          });
        }
        
        setAvailableBarbers(mappedBarbers);
      } catch (err) {
        console.error('Error fetching barbers:', err);
        setError('Failed to load barbers. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBarbers();
  }, [selectedDate, selectedTime]);

  // Filter barbers based on selected services
  const getFilteredBarbers = () => {
    // If no services selected yet, show all barbers
    if (!selectedServices || selectedServices.length === 0) {
      return availableBarbers;
    }
    
    // Check if any service requires Master Barber
    const hasMasterService = selectedServices.some(service => 
      service.name.includes('Master Barber')
    );
    
    // Check if any service requires Senior Barber
    const hasSeniorService = selectedServices.some(service => 
      service.name.includes('Senior Barber')
    );
    
    // If both Master and Senior services are selected, show all barbers that can do either
    if (hasMasterService && hasSeniorService) {
      return availableBarbers.filter(barber => 
        barber.specialty.includes('Master Barber') || 
        barber.specialty.includes('Senior Barber') || 
        barber.name === 'Any Available'
      );
    }
    
    // If only Master Barber service selected, show only Master Barbers
    if (hasMasterService) {
      return availableBarbers.filter(barber => 
        barber.specialty.includes('Master Barber') || barber.name === 'Any Available'
      );
    }
    
    // If only Senior Barber service selected, show Senior and Master Barbers
    if (hasSeniorService) {
      return availableBarbers.filter(barber => 
        barber.specialty.includes('Senior Barber') || 
        barber.specialty.includes('Master Barber') || 
        barber.name === 'Any Available'
      );
    }
    
    // For other services (Buzz Cut, Beard Trim, etc.), show all available barbers
    return availableBarbers;
  };

  const filteredBarbers = getFilteredBarbers();

  if (loading) {
    return (
      <div className="step-container">
        <h2>Choose Your Barber</h2>
        <p style={{ textAlign: 'center', color: '#c19a6b', marginTop: '2rem' }}>
          Loading barbers...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="step-container">
        <h2>Choose Your Barber</h2>
        <p style={{ textAlign: 'center', color: '#ff6b6b', marginTop: '2rem' }}>
          {error}
        </p>
        {onBack && (
          <div className="button-group">
            <button className="btn btn-secondary" onClick={onBack}>
              Back
            </button>
          </div>
        )}
      </div>
    );
  }

  if (filteredBarbers.length === 0) {
    return (
      <div className="step-container">
        <h2>Choose Your Barber</h2>
        <p style={{ textAlign: 'center', color: '#ff6b6b', marginTop: '2rem' }}>
          {selectedDate && selectedTime 
            ? `⚠️ No barbers available for ${selectedDate} at ${selectedTime}`
            : '⚠️ No barbers available'
          }
        </p>
        {selectedDate && selectedTime && (
          <p style={{ textAlign: 'center', color: '#c19a6b', marginBottom: '1.5rem' }}>
            Please go back and select a different date or time.
          </p>
        )}
        {onBack && (
          <div className="button-group">
            <button className="btn btn-secondary" onClick={onBack}>
              Back
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="step-container">
      <h2>Choose Your Barber</h2>
      {selectedDate && selectedTime ? (
        <p style={{ textAlign: 'center', color: '#c19a6b', marginBottom: '1.5rem' }}>
          📅 {selectedDate} at {selectedTime}
        </p>
      ) : (
        <p style={{ textAlign: 'center', color: '#c19a6b', marginBottom: '1.5rem' }}>
          Select your preferred barber (availability will be checked for your chosen date & time)
        </p>
      )}
      {selectedServices && selectedServices.length > 0 && filteredBarbers.length < availableBarbers.length && (
        <p style={{ textAlign: 'center', color: '#c19a6b', marginBottom: '1.5rem' }}>
          Showing barbers qualified for your selected services
        </p>
      )}
      <div className="card-grid">
        {filteredBarbers.map(barber => (
          <div
            key={barber.id}
            className={`card barber-card ${selectedBarber?.id === barber.id ? 'selected' : ''}`}
            onClick={() => onSelect(barber)}
          >
            <div className="barber-avatar">
              {barber.image ? (
                <img src={barber.image} alt={barber.name} />
              ) : (
                <span>{barber.name.split(' ').map(n => n[0]).join('')}</span>
              )}
            </div>
            <h3>{barber.name}</h3>
            <p className="specialty">{barber.specialty}</p>
            {barber.rating && (
              <div className="rating">
                ⭐ {barber.rating}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="button-group">
        {onBack && (
          <button className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={!selectedBarber}
        >
          Continue to Services
        </button>
      </div>
    </div>
  );
}

export default BarberSelection;
