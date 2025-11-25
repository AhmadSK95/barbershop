import React, { useState } from 'react';
import { generateTimeSlots } from '../data';

function DateTimeSelection({ selectedDate, selectedTime, selectedBarber, selectedServices, onDateSelect, onTimeSelect, onNext, onBack }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const timeSlots = selectedDate ? generateTimeSlots(selectedDate) : [];
  
  // Convert 24-hour time to 12-hour format
  const convertTo12Hour = (time24) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes}`;
  };
  
  // Split time slots into AM and PM
  const amSlots = timeSlots.filter(slot => {
    const hour = parseInt(slot.split(':')[0]);
    return hour < 12;
  });
  
  const pmSlots = timeSlots.filter(slot => {
    const hour = parseInt(slot.split(':')[0]);
    return hour >= 12;
  });

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      // Format date string without timezone conversion
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const dayStr = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${dayStr}`;
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      days.push({ day, dateString, isPast });
    }

    return days;
  };

  const previousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const calendarDays = generateCalendar();

  return (
    <div className="step-container">
      <h2>🗓️ Choose Your Adventure Time</h2>
      
      {selectedBarber && (
        <p style={{ textAlign: 'center', color: '#c19a6b', marginBottom: '0.5rem' }}>
          ✂️ Barber: <strong>{selectedBarber.name}</strong>
        </p>
      )}
      {selectedServices && selectedServices.length > 0 && (
        <p style={{ textAlign: 'center', color: '#c19a6b', marginBottom: '1rem' }}>
          📋 Services: <strong>{selectedServices.map(s => s.name).join(', ')}</strong>
        </p>
      )}
      
      <div className="section">
        <div className="calendar-container">
          <div className="calendar-header">
            <button className="calendar-nav" onClick={previousMonth}>◀</button>
            <h3 className="calendar-title">{months[currentMonth]} {currentYear}</h3>
            <button className="calendar-nav" onClick={nextMonth}>▶</button>
          </div>

          <div className="calendar-weekdays">
            {daysOfWeek.map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((dayObj, idx) => {
              if (!dayObj) {
                return <div key={`empty-${idx}`} className="calendar-day empty"></div>;
              }

              const isSelected = selectedDate === dayObj.dateString;
              // Compare with today using local date
              const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              const isToday = dayObj.dateString === todayString;

              return (
                <div
                  key={idx}
                  className={`calendar-day ${
                    dayObj.isPast ? 'past' : ''
                  } ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => !dayObj.isPast && onDateSelect(dayObj.dateString)}
                >
                  <span>{dayObj.day}</span>
                  {isSelected && <div className="selected-indicator">✨</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedDate && (
        <div className="section time-section">
          <h3>⚡ Select Time Slot</h3>
          
          {/* AM Slots */}
          {amSlots.length > 0 && (
            <div className="time-period-section">
              <div className="time-period-label">AM</div>
              <div className="time-grid">
                {amSlots.map((slot, idx) => (
                  <div
                    key={idx}
                    className={`time-slot ${selectedTime === slot ? 'selected' : ''}`}
                    onClick={() => onTimeSelect(slot)}
                  >
                    <span className="time-icon">🕐</span>
                    {convertTo12Hour(slot)}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* PM Slots */}
          {pmSlots.length > 0 && (
            <div className="time-period-section">
              <div className="time-period-label">PM</div>
              <div className="time-grid">
                {pmSlots.map((slot, idx) => (
                  <div
                    key={idx}
                    className={`time-slot ${selectedTime === slot ? 'selected' : ''}`}
                    onClick={() => onTimeSelect(slot)}
                  >
                    <span className="time-icon">🕐</span>
                    {convertTo12Hour(slot)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="button-group">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={!selectedDate || !selectedTime}
        >
          Continue → 
        </button>
      </div>
    </div>
  );
}

export default DateTimeSelection;
