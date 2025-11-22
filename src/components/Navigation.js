import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Scissors, Menu, X, Home, Info, Calendar, Briefcase, LayoutDashboard, Settings, User, LogOut, LogIn } from 'lucide-react';
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
          <Scissors className="nav-icon-logo" size={24} />
          <span>Balkan Barber</span>
        </Link>
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <Home size={18} className="nav-icon" />
            <span>Home</span>
          </Link>
          <Link 
            to="/about" 
            className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <Info size={18} className="nav-icon" />
            <span>About</span>
          </Link>
          <Link 
            to="/careers" 
            className={`nav-link ${location.pathname === '/careers' ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <Briefcase size={18} className="nav-icon" />
            <span>Careers</span>
          </Link>
          <Link
            to="/booking" 
            className={`nav-link nav-link-booking ${location.pathname === '/booking' ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <Calendar size={18} className="nav-icon" />
            <span>Book Now</span>
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
                    <LayoutDashboard size={18} className="nav-icon" />
                    <span>Dashboard</span>
                  </Link>
                  <Link 
                    to="/config" 
                    className={`nav-link ${location.pathname === '/config' ? 'active' : ''}`}
                    onClick={closeMobileMenu}
                  >
                    <Settings size={18} className="nav-icon" />
                    <span>Config</span>
                  </Link>
                </>
              )}
              <Link 
                to="/profile" 
                className={`nav-link nav-user ${location.pathname === '/profile' ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                <User size={18} className="nav-icon" />
                <span>{user?.firstName}</span>
              </Link>
              <button onClick={() => { logout(); closeMobileMenu(); }} className="nav-link nav-logout">
                <LogOut size={18} className="nav-icon" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <Link 
              to="/login" 
              className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <LogIn size={18} className="nav-icon" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
