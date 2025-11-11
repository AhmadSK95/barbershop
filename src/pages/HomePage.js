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
          <div className="info-icon">🕒</div>
          <h3>Hours</h3>
          <p>Monday–Friday: 10am–7pm</p>
          <p>Saturday-Sunday: 9am-4pm</p>
        </div>

        <div className="info-card">
          <div className="info-icon">📍</div>
          <h3>Our Location</h3>
          <p>332 Barrow St</p>
          <p>Jersey City, NJ 07302</p>
          <p>Call: (201) 433-2870</p>
        </div>

        <div className="info-card">
          <div className="info-icon">✨</div>
          <h3>Services</h3>
          <p>Professional Cuts</p>
          <p>Hot Towel Shaves</p>
          <p>Straight Edge Razor Line-ups</p>
        </div>
      </section>

      <section className="virtual-tryon-promo">
        <div className="promo-content">
          <div className="promo-badge">✨ NEW FEATURE</div>
          <h2>Try Before You Book</h2>
          <p>Use our AI-powered Virtual Try-On to see how different hairstyles look on you!</p>
          <div className="promo-buttons">
            <button className="cta-button primary" onClick={() => navigate('/virtual-tryon')}>
              📸 Try Virtual Styles
            </button>
            <button className="cta-button secondary" onClick={() => navigate('/booking')}>
              Book Appointment
            </button>
          </div>
        </div>
        <div className="promo-features">
          <div className="promo-feature">
            <span className="feature-icon">🤖</span>
            <span>AI Face Analysis</span>
          </div>
          <div className="promo-feature">
            <span className="feature-icon">💁</span>
            <span>Personalized Recommendations</span>
          </div>
          <div className="promo-feature">
            <span className="feature-icon">⚡</span>
            <span>Instant Results</span>
          </div>
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
