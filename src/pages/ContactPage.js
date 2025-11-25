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
                <p>332 Barrow St</p>
                <p>Jersey City, NJ 07302</p>
                <p>United States</p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">📞</div>
              <div className="info-details">
                <h3>Call Us</h3>
                <p><a href="tel:+12014332870">(201) 433-2870</a></p>
                <p>Available during business hours</p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">✉️</div>
              <div className="info-details">
                <h3>Email Us</h3>
                <p><a href="mailto:info@balkanbarbershop.com">info@balkanbarbershop.com</a></p>
                <p>We'll respond within 24 hours</p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">🕐</div>
              <div className="info-details">
                <h3>Business Hours</h3>
                <p>Monday - Friday: 10:00 AM - 7:00 PM</p>
                <p>Saturday - Sunday: 9:00 AM - 4:00 PM</p>
              </div>
            </div>
          </div>

          <div className="map-section">
            <h2>Find Us on the Map</h2>
            <div className="map-container">
              <iframe
                title="Balkan Barbers Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3023.5875874698957!2d-74.04826892345!3d40.71884497139!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c2509a7aa0abc5%3A0x5c1f7b8f3c0e5e89!2s332%20Barrow%20St%2C%20Jersey%20City%2C%20NJ%2007302!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus"
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
