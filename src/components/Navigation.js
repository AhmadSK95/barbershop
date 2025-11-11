import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navigation.css';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          ✂️ Balkan Barber
        </Link>
        <div className="nav-links">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link 
            to="/about" 
            className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}
          >
            About
          </Link>
          <Link 
            to="/virtual-tryon" 
            className={`nav-link ${location.pathname === '/virtual-tryon' ? 'active' : ''}`}
          >
            ✨ Try Styles
          </Link>
          <Link 
            to="/booking" 
            className={`nav-link nav-link-booking ${location.pathname === '/booking' ? 'active' : ''}`}
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
                  >
                    📊 Dashboard
                  </Link>
                  <Link 
                    to="/config" 
                    className={`nav-link ${location.pathname === '/config' ? 'active' : ''}`}
                  >
                    ⚙️ Config
                  </Link>
                </>
              )}
              <Link 
                to="/profile" 
                className={`nav-link nav-user ${location.pathname === '/profile' ? 'active' : ''}`}
              >
                👤 {user?.firstName}
              </Link>
              <button onClick={logout} className="nav-link nav-logout">
                Logout
              </button>
            </>
          ) : (
            <Link 
              to="/login" 
              className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}
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
