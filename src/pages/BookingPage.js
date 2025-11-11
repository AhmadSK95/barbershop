import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './BookingPage.css';
import ServiceSelection from '../components/ServiceSelection';
import DateTimeSelection from '../components/DateTimeSelection';
import BarberSelection from '../components/BarberSelection';
import BookingSummary from '../components/BookingSummary';

function BookingPage() {
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState({
    services: [],
    date: null,
    time: null,
    barber: null
  });

  // Handle reorder - preselect barber and services, start at date selection
  useEffect(() => {
    if (location.state?.preselectedServices || location.state?.preselectedBarber) {
      setBooking(prev => ({
        ...prev,
        services: location.state.preselectedServices || prev.services,
        barber: location.state.preselectedBarber || prev.barber
      }));
      
      if (location.state?.startAtStep) {
        setStep(location.state.startAtStep);
      }
      
      // Clear the state after using it
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const updateBooking = (field, value) => {
    setBooking(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);
  const resetBooking = () => {
    setStep(1);
    setBooking({
      services: [],
      date: null,
      time: null,
      barber: null
    });
  };

  const getTotalPrice = () => {
    return booking.services.reduce((total, service) => total + service.price, 0);
  };

  const getTotalDuration = () => {
    return booking.services.reduce((total, service) => total + service.duration, 0);
  };

  return (
    <div className="booking-page">
      <div className="booking-header">
        <h1 className="neon-title">✂️ BARBERSHOP QUEST ✂️</h1>
      </div>

      {/* Progress Summary Bar */}
      <div className="booking-progress-summary">
        <div className="progress-item">
          <span className="progress-label">Barber:</span>
          <span className="progress-value">{booking.barber ? booking.barber.name : '—'}</span>
        </div>
        <div className="progress-item">
          <span className="progress-label">Services:</span>
          <span className="progress-value">{booking.services.length > 0 ? `${booking.services.length} selected` : '—'}</span>
        </div>
        <div className="progress-item">
          <span className="progress-label">Date:</span>
          <span className="progress-value">{booking.date || '—'}</span>
        </div>
        <div className="progress-item">
          <span className="progress-label">Time:</span>
          <span className="progress-value">{booking.time || '—'}</span>
        </div>
        <div className="progress-item total">
          <span className="progress-label">Total:</span>
          <span className="progress-value">${getTotalPrice()}</span>
        </div>
      </div>

      <div className="booking-content">
        {step === 1 && (
          <BarberSelection
            selectedBarber={booking.barber}
            onSelect={(barber) => updateBooking('barber', barber)}
            onNext={nextStep}
            onBack={null}
          />
        )}

        {step === 2 && (
          <ServiceSelection
            selectedServices={booking.services}
            selectedBarber={booking.barber}
            onToggle={(service) => {
              const isSelected = booking.services.some(s => s.id === service.id);
              if (isSelected) {
                updateBooking('services', booking.services.filter(s => s.id !== service.id));
              } else {
                updateBooking('services', [...booking.services, service]);
              }
            }}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {step === 3 && (
          <DateTimeSelection
            selectedDate={booking.date}
            selectedTime={booking.time}
            selectedBarber={booking.barber}
            selectedServices={booking.services}
            onDateSelect={(date) => updateBooking('date', date)}
            onTimeSelect={(time) => updateBooking('time', time)}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {step === 4 && (
          <BookingSummary
            booking={booking}
            totalPrice={getTotalPrice()}
            totalDuration={getTotalDuration()}
            onConfirm={resetBooking}
            onBack={prevStep}
          />
        )}
      </div>
    </div>
  );
}

export default BookingPage;
