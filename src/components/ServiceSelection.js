import React from 'react';
import { services } from '../data';

function ServiceSelection({ selectedServices, selectedBarber, onToggle, onNext, onBack }) {
  return (
    <div className="step-container">
      <h2>Select Services</h2>
      {selectedBarber && (
        <p style={{ textAlign: 'center', color: '#c19a6b', marginBottom: '0.5rem' }}>
          ✂️ Barber: <strong>{selectedBarber.name}</strong>
        </p>
      )}
      <p style={{ textAlign: 'center', color: '#c19a6b', marginBottom: '1.5rem' }}>
        You can select multiple services
      </p>
      <div className="card-grid">
        {services.map(service => {
          const isSelected = selectedServices.some(s => s.id === service.id);
          return (
            <div
              key={service.id}
              className={`card ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggle(service)}
            >
              {isSelected && <div className="checkmark">✓</div>}
              <h3>{service.name}</h3>
              <p className="description">{service.description}</p>
              <div className="card-footer">
                <span className="price">${service.price}</span>
                <span className="duration">{service.duration} min</span>
              </div>
            </div>
          );
        })}
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
          disabled={selectedServices.length === 0}
        >
          Continue to Date & Time
        </button>
      </div>
    </div>
  );
}

export default ServiceSelection;
