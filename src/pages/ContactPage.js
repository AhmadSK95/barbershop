import React from 'react';
import SEO, { getLocalBusinessSchema } from '../components/SEO';
import './ContactPage.css';

function ContactPage() {
  return (
    <>
      <SEO 
        title="Contact Us"
        description="Visit Balkan Barber at 332 Barrow St, Jersey City, NJ 07302. Call (201) 433-2870 or book online. Open Mon-Fri 10AM-7PM, Sat-Sun 9AM-4PM."
        schema={getLocalBusinessSchema()}
      />
      <div className="contact-page">
        <div className="contact-container">
        <div className="contact-header">
          <h1 className="contact-title">✂️ Contact Us</h1>
          <p className="contact-subtitle">We'd love to hear from you</p>
        </div>

        <div className="contact-content">
          <div className="contact-info-section">
            <div className="info-card">
              <div className="info-icon">📍</div>
              <div className="info-details">
                <h3>Visit Us</h3>
                <p>123 Main Street</p>
                <p>City, State 12345</p>
                <p>United States</p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">📞</div>
              <div className="info-details">
                <h3>Call Us</h3>
                <p><a href="tel:+15551234567">(555) 123-4567</a></p>
                <p>Available during business hours</p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">✉️</div>
              <div className="info-details">
                <h3>Email Us</h3>
                <p><a href="mailto:info@balkanbarbers.com">info@balkanbarbers.com</a></p>
                <p>We'll respond within 24 hours</p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">🕐</div>
              <div className="info-details">
                <h3>Business Hours</h3>
                <p>Monday - Friday: 10:00 AM - 7:00 PM</p>
                <p>Saturday: 10:00 AM - 6:00 PM</p>
                <p>Sunday: Closed</p>
              </div>
            </div>
          </div>

          <div className="map-section">
            <h2>Find Us on the Map</h2>
            <div className="map-container">
              <iframe
                title="Balkan Barbers Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.2412648750455!2d-73.98784368459395!3d40.74844097932847!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDDCsDQ0JzU0LjQiTiA3M8KwNTknMDQuMyJX!5e0!3m2!1sen!2sus!4v1234567890123!5m2!1sen!2sus"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <p className="map-note">
              Located in the heart of downtown, with street parking and public transit nearby.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default ContactPage;
