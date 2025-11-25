import React from 'react';
import './SkeletonLoader.css';

export function SkeletonText({ lines = 3, width = '100%' }) {
  return (
    <div className="skeleton-text">
      {[...Array(lines)].map((_, i) => (
        <div 
          key={i} 
          className="skeleton-line" 
          style={{ width: i === lines - 1 ? '70%' : width }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton-circle" />
        <div className="skeleton-title" />
      </div>
      <div className="skeleton-content">
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

export function SkeletonBooking() {
  return (
    <div className="skeleton-booking">
      <div className="skeleton-booking-header">
        <div className="skeleton-date" />
        <div className="skeleton-badge" />
      </div>
      <div className="skeleton-booking-content">
        <SkeletonText lines={3} />
      </div>
      <div className="skeleton-booking-actions">
        <div className="skeleton-button" />
        <div className="skeleton-button" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {[...Array(columns)].map((_, i) => (
          <div key={i} className="skeleton-table-cell header" />
        ))}
      </div>
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="skeleton-table-row">
          {[...Array(columns)].map((_, colIndex) => (
            <div key={colIndex} className="skeleton-table-cell" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default SkeletonText;
