import React from 'react';
import './LegalPage.css';

function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-updated">Last Updated: November 25, 2025</p>

        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us, including:
            </p>
            <ul>
              <li>Name, email address, phone number</li>
              <li>Booking details (date, time, service preferences)</li>
              <li>Payment information (processed securely through our payment provider)</li>
              <li>Account credentials (password is encrypted)</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Process and manage your bookings</li>
              <li>Send appointment reminders via email or SMS</li>
              <li>Communicate with you about services</li>
              <li>Improve our services and user experience</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Information Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share your information with:
            </p>
            <ul>
              <li>Service providers who assist in operating our business (email, SMS, payment processing)</li>
              <li>Law enforcement when required by law</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information, including:
            </p>
            <ul>
              <li>Encrypted password storage (bcrypt)</li>
              <li>Secure HTTPS connections</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Opt-out of promotional communications</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Cookies and Tracking</h2>
            <p>
              We use essential cookies for authentication and session management. We do not use tracking cookies for advertising purposes.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Children's Privacy</h2>
            <p>
              Our services are not directed to individuals under 18. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Changes to Privacy Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or want to exercise your rights, contact us at{' '}
              <a href="mailto:privacy@balkanbarbers.com">privacy@balkanbarbers.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPage;
