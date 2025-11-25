import React from 'react';
import { Link } from 'react-router-dom';
import './NotFoundPage.css';

function NotFoundPage() {
  return (
    <div className="notfound-page">
      <div className="notfound-container">
        <div className="notfound-content">
          <h1 className="notfound-code">404</h1>
          <h2 className="notfound-title">✂️ Oops! Page Not Found</h2>
          <p className="notfound-message">
            Looks like this page took an unexpected haircut. Let's get you back on track!
          </p>
          
          <div className="notfound-links">
            <Link to="/" className="notfound-link primary">
              🏠 Go Home
            </Link>
            <Link to="/book" className="notfound-link">
              📅 Book Appointment
            </Link>
            <Link to="/about" className="notfound-link">
              ℹ️ About Us
            </Link>
            <Link to="/contact" className="notfound-link">
              📞 Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
