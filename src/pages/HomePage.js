import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Scissors, Calendar } from 'lucide-react';
import SEO, { getLocalBusinessSchema, getWebsiteSchema } from '../components/SEO';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();

  return (
    <>
      <SEO 
        title="Home"
        description="Premium barbershop in Downtown Jersey City at 332 Barrow St. Expert barbers specializing in scissors-focused cuts, straight edge razor shaves, and personalized grooming. Book your appointment online today!"
        schema={[getLocalBusinessSchema(), getWebsiteSchema()]}
      />
      <div className="home-page">
        <section className="hero-section fade-in-up">
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
        <div className="info-card fade-in-up delay-100">
          <div className="info-icon">
            <Clock size={64} color="#d4a574" strokeWidth={1.5} />
          </div>
          <h3>Hours</h3>
          <p>Monday–Friday: 10am–7pm</p>
          <p>Saturday-Sunday: 9am-4pm</p>
        </div>

        <div className="info-card fade-in-up delay-200">
          <div className="info-icon">
            <MapPin size={64} color="#d4a574" strokeWidth={1.5} />
          </div>
          <h3>Our Location</h3>
          <p>332 Barrow St</p>
          <p>Jersey City, NJ 07302</p>
          <p>Call: (201) 433-2870</p>
        </div>

        <div className="info-card fade-in-up delay-300">
          <div className="info-icon">
            <Scissors size={64} color="#d4a574" strokeWidth={1.5} />
          </div>
          <h3>Services</h3>
          <p>Professional Cuts</p>
          <p>Hot Towel Shaves</p>
          <p>Straight Edge Razor Line-ups</p>
        </div>
      </section>

      <section className="quick-booking fade-in-up delay-300">
        <h2>Ready for a Fresh Look?</h2>
        <button className="booking-button" onClick={() => navigate('/booking')}>
          <Calendar className="btn-icon" size={24} style={{marginRight: '10px'}}/>
          Book Now
        </button>
      </section>

      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Balkan Barbers</h3>
            <p>Downtown Jersey City's Premier Barber Shop</p>
          </div>
          
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><button onClick={() => navigate('/')}>Home</button></li>
              <li><button onClick={() => navigate('/about')}>About</button></li>
              <li><button onClick={() => navigate('/booking')}>Book Appointment</button></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Contact</h4>
            <p>332 Barrow St</p>
            <p>Jersey City, NJ 07302</p>
            <p>(201) 433-2870</p>
          </div>

          <div className="footer-section hiring-section">
            <div className="hiring-badge">✂️ We're Hiring!</div>
            <p>Join our talented team</p>
            <button className="hiring-button" onClick={() => navigate('/careers')}>
              View Open Positions
            </button>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Balkan Barbers. All rights reserved.</p>
        </div>
      </footer>
    </div>
    </>
  );
}

export default HomePage;
