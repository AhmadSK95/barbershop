import React, { useState } from 'react';
import { paymentAPI } from '../services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import './PaymentModal.css';

const PaymentModal = ({ booking, onClose, onSuccess }) => {
  const [processing, setProcessing] = useState(false);

  const handleConfirmPayment = async () => {
    try {
      setProcessing(true);

      const response = await paymentAPI.chargeBooking(booking.id, booking.totalPrice);

      if (response.data.success) {
        toast.success(`Payment successful! Charged $${booking.totalPrice}`);
        onSuccess();
        onClose();
      } else {
        toast.error(response.data.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Failed to process payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCardBrand = (brand) => {
    if (!brand) return 'Card';
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const getCardIcon = (brand) => {
    const icons = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
      diners: '💳',
      jcb: '💳',
      unionpay: '💳'
    };
    return icons[brand?.toLowerCase()] || '💳';
  };

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h2>💰 Confirm Payment</h2>
          <button className="payment-modal-close" onClick={onClose} disabled={processing}>
            ×
          </button>
        </div>

        <div className="payment-modal-body">
          <div className="payment-info-section">
            <h3>Booking Details</h3>
            <div className="payment-detail-row">
              <span className="payment-label">Customer:</span>
              <span className="payment-value">{booking.customer?.name}</span>
            </div>
            <div className="payment-detail-row">
              <span className="payment-label">Email:</span>
              <span className="payment-value">{booking.customer?.email}</span>
            </div>
            <div className="payment-detail-row">
              <span className="payment-label">Service:</span>
              <span className="payment-value">{booking.service?.name}</span>
            </div>
            <div className="payment-detail-row">
              <span className="payment-label">Barber:</span>
              <span className="payment-value">{booking.barber?.name}</span>
            </div>
          </div>

          <div className="payment-info-section">
            <h3>Payment Method</h3>
            <div className="payment-card-info">
              <span className="card-icon">{getCardIcon(booking.cardBrand)}</span>
              <span className="card-details">
                {formatCardBrand(booking.cardBrand)} ending in ••••{booking.cardLast4}
              </span>
            </div>
          </div>

          <div className="payment-amount-section">
            <div className="payment-amount-row">
              <span className="payment-amount-label">Total Amount:</span>
              <span className="payment-amount-value">${booking.totalPrice}</span>
            </div>
          </div>

          <div className="payment-warning">
            <p>⚠️ This will charge the customer's saved payment method immediately.</p>
            <p>This action cannot be undone without processing a refund.</p>
          </div>
        </div>

        <div className="payment-modal-footer">
          <button
            className="payment-btn-cancel"
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </button>
          <button
            className="payment-btn-confirm"
            onClick={handleConfirmPayment}
            disabled={processing}
          >
            {processing ? (
              <>
                <LoadingSpinner size="small" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>💳</span>
                <span>Charge ${booking.totalPrice}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
