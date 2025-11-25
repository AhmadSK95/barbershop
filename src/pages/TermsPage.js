import React from 'react';
import './LegalPage.css';

function TermsPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-updated">Last Updated: November 25, 2025</p>

        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using Balkan Barbers' booking system, you accept and agree to be bound by the terms
              and provision of this agreement. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Booking Policy</h2>
            <p>
              <strong>Appointments:</strong> All appointments are subject to availability and confirmation. We reserve
              the right to refuse service to anyone.
            </p>
            <p>
              <strong>Cancellations:</strong> Please provide at least 24 hours notice for cancellations. Late
              cancellations or no-shows may be subject to restrictions on future bookings.
            </p>
            <p>
              <strong>Rescheduling:</strong> Appointments may be rescheduled up to 2 hours before the scheduled time,
              subject to availability.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials. You agree to notify
              us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Services</h2>
            <p>
              We strive to provide high-quality barbering services. However, results may vary based on individual
              hair type and condition. We are not liable for outcomes that do not meet your expectations, provided
              services were performed with reasonable skill and care.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Payment</h2>
            <p>
              Payment is due at the time of service. We accept cash, credit cards, and other payment methods as
              indicated. Prices are subject to change without notice.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Liability</h2>
            <p>
              Balkan Barbers and its employees are not liable for any indirect, incidental, special, or consequential
              damages arising from the use of our services or this booking system.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of our services after changes
              constitutes acceptance of the modified terms.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:info@balkanbarbers.com">info@balkanbarbers.com</a> or call{' '}
              <a href="tel:+15551234567">(555) 123-4567</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default TermsPage;
