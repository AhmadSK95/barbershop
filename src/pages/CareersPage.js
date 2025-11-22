import React, { useState } from 'react';
import { Briefcase, Mail, Phone, User, FileText, Upload, CheckCircle } from 'lucide-react';
import api from '../services/api';
import './CareersPage.css';

function CareersPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    message: ''
  });
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const positions = ['Barber', 'Receptionist', 'Manager', 'Other'];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a PDF, DOC, or DOCX file');
        e.target.value = '';
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        e.target.value = '';
        return;
      }

      setResume(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.email || !formData.phone || !formData.position) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Prepare form data for multipart/form-data
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('position', formData.position);
      submitData.append('message', formData.message);
      
      if (resume) {
        submitData.append('resume', resume);
      }

      // Submit application
      const response = await api.post('/careers/apply', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setSuccess(true);
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          position: '',
          message: ''
        });
        setResume(null);
        // Reset file input
        document.getElementById('resume-upload').value = '';
      } else {
        setError(response.data.message || 'Failed to submit application');
      }
    } catch (err) {
      console.error('Error submitting application:', err);
      setError(err.response?.data?.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="careers-page">
      <div className="careers-hero">
        <div className="careers-hero-content">
          <h1>Join Our Team</h1>
          <p className="tagline">Help Us Deliver Premium Grooming Experiences</p>
        </div>
      </div>

      <section className="careers-content">
        <div className="careers-intro">
          <h2>We're Hiring! ✂️</h2>
          <p>
            At Balkan Barbers, we're always looking for talented individuals who are passionate 
            about providing exceptional grooming services. If you love what you do and want to be 
            part of a team that values craftsmanship, professionalism, and customer satisfaction, 
            we'd love to hear from you!
          </p>
        </div>

        <div className="positions-section">
          <h3>Open Positions</h3>
          <div className="positions-grid">
            <div className="position-card">
              <div className="position-icon">✂️</div>
              <h4>Barber</h4>
              <p>Experienced barber with expertise in classic and modern cuts</p>
            </div>
            <div className="position-card">
              <div className="position-icon">📋</div>
              <h4>Receptionist</h4>
              <p>Friendly, organized professional for front desk operations</p>
            </div>
            <div className="position-card">
              <div className="position-icon">💼</div>
              <h4>Manager</h4>
              <p>Leadership experience in hospitality or service industry</p>
            </div>
            <div className="position-card">
              <div className="position-icon">🌟</div>
              <h4>Other</h4>
              <p>Have unique skills? Tell us what you can bring to the team</p>
            </div>
          </div>
        </div>

        {success ? (
          <div className="success-message">
            <CheckCircle size={64} color="#D4A574" />
            <h2>Application Submitted!</h2>
            <p>
              Thank you for your interest in joining Balkan Barbers. We've received your application 
              and will review it carefully. We'll get back to you soon!
            </p>
            <button 
              className="submit-another-btn"
              onClick={() => setSuccess(false)}
            >
              Submit Another Application
            </button>
          </div>
        ) : (
          <div className="application-form-section">
            <h3>Apply Now</h3>
            <p className="form-description">
              Fill out the form below to submit your application. We'll review it and get back to you soon!
            </p>

            {error && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}

            <form className="application-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">
                    <User size={20} />
                    Full Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">
                    <Mail size={20} />
                    Email Address <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">
                    <Phone size={20} />
                    Phone Number <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="position">
                    <Briefcase size={20} />
                    Position <span className="required">*</span>
                  </label>
                  <select
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a position...</option>
                    {positions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="message">
                  <FileText size={20} />
                  Cover Letter / Message (Optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about yourself and why you'd be a great fit for our team..."
                  rows="6"
                />
              </div>

              <div className="form-group">
                <label htmlFor="resume-upload">
                  <Upload size={20} />
                  Resume / CV (Optional)
                </label>
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    id="resume-upload"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                  />
                  {resume && (
                    <p className="file-name">
                      Selected: <strong>{resume.name}</strong>
                    </p>
                  )}
                  <p className="file-hint">PDF, DOC, or DOCX • Max 5MB</p>
                </div>
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>

              <p className="required-note">
                <span className="required">*</span> Required fields
              </p>
            </form>
          </div>
        )}

        <div className="why-join-section">
          <h3>Why Join Balkan Barbers?</h3>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">💰</div>
              <h4>Competitive Pay</h4>
              <p>Fair compensation with opportunities for tips and bonuses</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">📈</div>
              <h4>Career Growth</h4>
              <p>Training and development opportunities to advance your skills</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">👥</div>
              <h4>Great Team</h4>
              <p>Work with passionate professionals in a friendly environment</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">⏰</div>
              <h4>Flexible Hours</h4>
              <p>Work-life balance with reasonable scheduling</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default CareersPage;
