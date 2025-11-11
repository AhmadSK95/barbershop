import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AboutPage.css';

function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="about-page">
      <div className="about-hero">
        <h1>About Balkan Barber</h1>
        <p className="tagline">Downtown Jersey City Barber</p>
      </div>

      <section className="about-content">
        <div className="about-section">
          <img 
            src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=400&fit=crop" 
            alt="Barbershop Tools"
            className="about-image"
          />
          <div className="about-text">
            <h2>Our Story</h2>
            <p>
              Located in Downtown Jersey City at 332 Barrow St, Balkan Barber has become 
              a trusted destination for quality haircuts and grooming. We believe in taking 
              our time with every client, starting each appointment with a consultation to 
              understand exactly what you're looking for.
            </p>
            <p>
              Our talented barbers, Johnny and Riza, are absolute pros when it comes to haircuts. 
              They always listen to requests, pay attention to detail, and consistently deliver 
              fantastic results.
            </p>
          </div>
        </div>

        <div className="about-section reverse">
          <div className="about-text">
            <h2>Our Philosophy</h2>
            <p>
              At Balkan Barber, we like the old-school style with the new-school touch. 
              We prefer to use scissors whenever possible to provide a really personalized 
              handcrafted touch. Every haircut is finished with a clean line using a straight 
              edge razor, a blow dryer, and when appropriate, high-end hair products.
            </p>
            <p>
              The atmosphere in the shop is friendly and welcoming. We want you to leave 
              feeling refreshed and looking great. Whether you're coming in for a professional 
              cut or hot towel shave, we're here to provide exceptional service.
            </p>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&h=400&fit=crop" 
            alt="Barber at Work"
            className="about-image"
          />
        </div>

        <div className="testimonial-section">
          <h2>What Our Clients Say</h2>
          <div className="testimonial-card">
            <p className="testimonial-text">
              "Balkan Barber Shop has been my go-to for over 2 years now, and I couldn't be happier 
              with the service. Johnny and Riza are absolute pros when it comes to haircuts. They always 
              listen to my requests, pay attention to detail, and consistently deliver fantastic results. 
              The atmosphere in the shop is friendly and welcoming, and I always leave feeling refreshed 
              and looking great. If you're searching for a reliable and talented barber shop, I highly 
              recommend Balkan Barber Shop!"
            </p>
            <p className="testimonial-author">— Fatmir Sukaliq, verified Google review</p>
          </div>
        </div>

        <div className="values-section">
          <h2>Why Choose Us?</h2>
          <div className="values-grid">
            <div className="value-card">
              <h3>✂️ Scissors-Focused Cuts</h3>
              <p>Personalized handcrafted touch with traditional techniques</p>
            </div>
            <div className="value-card">
              <h3>🗡️ Straight Edge Razor</h3>
              <p>Clean line-ups and hot towel shaves</p>
            </div>
            <div className="value-card">
              <h3>💎 High-End Products</h3>
              <p>Premium hair products available for purchase</p>
            </div>
            <div className="value-card">
              <h3>👥 Expert Consultation</h3>
              <p>Every appointment starts with understanding your needs</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to Experience the Difference?</h2>
        <button className="book-button" onClick={() => navigate('/booking')}>
          Book Your Appointment
        </button>
      </section>
    </div>
  );
}

export default AboutPage;
