import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Balkan Barber</h1>
          <p className="hero-subtitle">Downtown Jersey City Barber</p>
          <p className="hero-description">
            Come in for a professional cut or hot towel shave. We start every appointment with a consultation, 
            and take our time to give you the right cut or shave. At Balkan Barber, we like the old-school style 
            with the new-school touch. We prefer to use scissors whenever possible to provide a really personalized 
            handcrafted touch. We finish our haircuts with a clean line using a straight edge razor, a blow dryer 
            and, when appropriate, high-end hair products, which we also sell.
          </p>
          <button className="cta-button" onClick={() => navigate('/booking')}>
            Book Your Appointment
          </button>
        </div>
        <div className="hero-image">
          <img 
            src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&h=600&fit=crop" 
            alt="Classic Barbershop Experience"
          />
        </div>
      </section>

      <section className="info-section">
        <div className="info-card">
          <div className="info-icon">
            <img src="/images/hours-icon.png" alt="Hours" />
          </div>
          <h3>Hours</h3>
          <p>Monday–Friday: 10am–7pm</p>
          <p>Saturday-Sunday: 9am-4pm</p>
        </div>

        <div className="info-card">
          <div className="info-icon">
            <img src="/images/location-icon.png" alt="Our Location" />
          </div>
          <h3>Our Location</h3>
          <p>332 Barrow St</p>
          <p>Jersey City, NJ 07302</p>
          <p>Call: (201) 433-2870</p>
        </div>

        <div className="info-card">
          <div className="info-icon">
            <img src="/images/services-icon.png" alt="Services" />
          </div>
          <h3>Services</h3>
          <p>Professional Cuts</p>
          <p>Hot Towel Shaves</p>
          <p>Straight Edge Razor Line-ups</p>
        </div>
      </section>

      <section className="quick-booking">
        <h2>Ready for a Fresh Look?</h2>
        <button className="booking-button" onClick={() => navigate('/booking')}>
          Book Now
        </button>
      </section>
    </div>
  );
}

export default HomePage;
