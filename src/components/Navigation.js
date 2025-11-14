import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navigation.css';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          ✂️ Balkan Barber
        </Link>
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
        <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            Home
          </Link>
          <Link 
            to="/about" 
            className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            About
          </Link>
          <Link
            to="/booking" 
            className={`nav-link nav-link-booking ${location.pathname === '/booking' ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            Book Now
          </Link>
          {isAuthenticated ? (
            <>
              {user?.role === 'admin' && (
                <>
                  <Link 
                    to="/admin" 
                    className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
                    onClick={closeMobileMenu}
                  >
                    📊 Dashboard
                  </Link>
                  <Link 
                    to="/config" 
                    className={`nav-link ${location.pathname === '/config' ? 'active' : ''}`}
                    onClick={closeMobileMenu}
                  >
                    ⚙️ Config
                  </Link>
                </>
              )}
              <Link 
                to="/profile" 
                className={`nav-link nav-user ${location.pathname === '/profile' ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                👤 {user?.firstName}
              </Link>
              <button onClick={() => { logout(); closeMobileMenu(); }} className="nav-link nav-logout">
                Logout
              </button>
            </>
          ) : (
            <Link 
              to="/login" 
              className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
