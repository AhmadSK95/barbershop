# UI Improvements - Reschedule & Cancel Features

**Date:** November 23, 2025  
**Status:** ✅ Completed

## Overview

Enhanced the booking management UI by adding reschedule and cancel buttons to both user profile and admin dashboard. Fixed styling issues with white backgrounds on booking cards.

## Changes Made

### 1. User Profile Page (ProfilePage.js)

#### New Features
- **Cancel Button**: Added cancel functionality for pending/confirmed bookings
  - Shows confirmation dialog before canceling
  - Refreshes booking list after successful cancellation
  - Only visible for bookings that can be canceled

- **Reschedule Button**: Already existed, now properly styled and positioned
  - Appears before cancel button
  - Only shows for pending/confirmed bookings

#### Button Order
Left to right (or top to bottom on mobile):
1. **📅 Reschedule** (gray gradient) - Modify appointment date/time
2. **❌ Cancel** (red gradient) - Cancel the appointment
3. **🔄 Reorder** (gold gradient) - Book same service again

#### Code Changes
- Added `handleCancel()` function to call booking cancellation API
- Added `canCancel()` helper to determine button visibility
- Updated booking actions section with conditional rendering

**File:** `/src/pages/ProfilePage.js`

```javascript
const handleCancel = async (booking) => {
  if (!window.confirm('Are you sure you want to cancel this appointment?')) {
    return;
  }
  
  try {
    const response = await bookingAPI.cancelBooking(booking._id);
    if (response.data.success) {
      fetchBookings();
      alert('Appointment cancelled successfully');
    }
  } catch (err) {
    console.error('Error cancelling booking:', err);
    alert(err.response?.data?.message || 'Failed to cancel booking. Please try again.');
  }
};

const canCancel = (booking) => {
  return ['pending', 'confirmed'].includes(booking.status);
};
```

### 2. Admin Dashboard (AdminPage.js)

#### New Features
- **Reschedule Button**: Admins can now reschedule any pending/confirmed booking
  - Calendar icon (📅) button in actions column
  - Opens same RescheduleModal used in user profile
  - Updates bookings list after successful reschedule
  - Positioned between status dropdown and cancel button

#### Code Changes
- Imported `RescheduleModal` component
- Added `rescheduleModalOpen` and `selectedBooking` state
- Added `handleReschedule()` to transform admin booking format
- Added `handleRescheduleSuccess()` callback
- Added `barber_id` to booking transformation (needed for reschedule)
- Rendered modal at end of component

**File:** `/src/pages/AdminPage.js`

```javascript
const handleReschedule = (booking) => {
  const transformedBooking = {
    _id: booking.id,
    date: booking.date,
    time: booking.time,
    status: booking.status,
    service: booking.service,
    barber: {
      id: booking.barber_id,
      name: booking.barber.name
    }
  };
  setSelectedBooking(transformedBooking);
  setRescheduleModalOpen(true);
};
```

### 3. Styling Updates

#### ProfilePage.css
Added comprehensive button styling for cancel button:

```css
.cancel-btn {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 700;
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  border: 2px solid #e57373;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cancel-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
  background: linear-gradient(135deg, #e57373 0%, #dc3545 100%);
}
```

**Mobile Responsive:**
- All action buttons (reschedule, cancel, reorder) stack vertically
- Full width on mobile devices
- Consistent spacing and layout

**File:** `/src/pages/ProfilePage.css`

#### AdminPage.css
Added reschedule button styling for admin table:

```css
.reschedule-btn-admin {
  background: linear-gradient(135deg, #6c757d, #495057);
  color: #ffffff;
  border: 2px solid #adb5bd;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 700;
  font-size: 1.2rem;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
  transition: all 0.3s;
  line-height: 1;
}

.reschedule-btn-admin:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.5);
  background: linear-gradient(135deg, #adb5bd, #6c757d);
}
```

**Mobile Responsive:**
- Action buttons stack vertically in admin table
- Full width on small screens

**File:** `/src/pages/AdminPage.css`

## User Flow

### Customer User Flow
1. Navigate to Profile page
2. Click "Orders" tab
3. View booking history with status badges
4. For pending/confirmed bookings, see 3 action buttons:
   - **Reschedule**: Change date/time of appointment
   - **Cancel**: Cancel the appointment (with confirmation)
   - **Reorder**: Book same service again (new booking)

### Admin User Flow
1. Navigate to Admin Dashboard
2. View bookings table with all customer appointments
3. For pending/confirmed bookings, see actions:
   - **Status Dropdown**: Change status (pending/confirmed/completed)
   - **📅 Icon**: Reschedule appointment
   - **Cancel Button**: Cancel appointment

## Button Behavior

### Reschedule Button
- **Visibility**: Only for `pending` or `confirmed` bookings
- **Action**: Opens modal to select new date/time
- **Validation**: Checks policy window (default 2 hours before appointment)
- **Result**: Updates booking, resets status to `pending`, resets reminder flags
- **Notifications**: Sends email/SMS to customer and barber

### Cancel Button
- **Visibility**: Only for `pending` or `confirmed` bookings
- **Action**: Shows confirmation dialog, then cancels booking
- **Result**: Updates booking status to `cancelled`
- **Notifications**: Sends cancellation notification

### Reorder Button
- **Visibility**: Always visible (all bookings)
- **Action**: Navigates to booking page with pre-filled service/barber
- **Result**: Creates entirely new booking

## API Endpoints Used

### User Actions
```
PUT /api/bookings/:id/cancel
POST /api/bookings/:id/reschedule
```

### Admin Actions
```
GET /api/bookings/all
PUT /api/bookings/:id/status
PUT /api/bookings/:id/cancel
POST /api/bookings/:id/reschedule
GET /api/bookings/reschedule/available-slots
```

## Testing Checklist

### User Profile
- [x] Reschedule button appears for pending bookings
- [x] Reschedule button appears for confirmed bookings
- [x] Reschedule button hidden for cancelled bookings
- [x] Reschedule button hidden for completed bookings
- [x] Cancel button appears for pending bookings
- [x] Cancel button appears for confirmed bookings
- [x] Cancel button hidden for cancelled/completed bookings
- [x] Reorder button always visible
- [x] Cancel shows confirmation dialog
- [x] Successful cancel refreshes booking list
- [x] Buttons stack vertically on mobile
- [x] All buttons full-width on mobile

### Admin Dashboard
- [x] Reschedule icon (📅) appears in actions column
- [x] Reschedule only for pending/confirmed bookings
- [x] Clicking reschedule opens modal
- [x] Modal shows current booking details
- [x] Can select new date and time
- [x] Successful reschedule refreshes table
- [x] Status dropdown still functional
- [x] Cancel button still functional
- [x] Mobile responsive layout

## Known Issues & Limitations

1. **White Background on Booking Cards**: 
   - Issue: Some booking cards have bright white backgrounds reducing readability
   - Current Status: Using dark brown background `rgba(58, 36, 23, 0.8)`
   - If still too bright, the opacity or color values can be adjusted

2. **Confirmation Dialogs**:
   - Using browser `confirm()` which has basic styling
   - Future: Could replace with custom modal for better UX

3. **Mobile Button Order**:
   - Buttons stack in reverse order on mobile (CSS flex-direction: column-reverse)
   - Could be adjusted if different order preferred

## Future Enhancements

1. **Batch Actions**: Allow admins to reschedule/cancel multiple bookings at once
2. **Inline Editing**: Edit booking details directly in admin table
3. **Quick Reschedule**: Suggest next available slot automatically
4. **Drag & Drop**: Drag bookings to reschedule in calendar view
5. **Custom Confirmation Modals**: Replace browser confirms with styled modals
6. **Undo Cancellation**: Allow reverting a cancellation within X minutes
7. **Reason for Cancellation**: Collect reason when canceling (dropdown or text)

## Files Modified

### Frontend
- ✅ `/src/pages/ProfilePage.js` - Added cancel button and functionality
- ✅ `/src/pages/ProfilePage.css` - Added cancel button styles, mobile responsive
- ✅ `/src/pages/AdminPage.js` - Added reschedule button and modal integration
- ✅ `/src/pages/AdminPage.css` - Added reschedule button styles

### Documentation
- ✅ `/UI_IMPROVEMENTS_RESCHEDULE_CANCEL.md` (this file)

## Rollback Instructions

If issues arise, revert these commits:
1. Remove cancel button code from ProfilePage.js (lines 278-300, 543-550)
2. Remove cancel button CSS from ProfilePage.css (lines 450-474)
3. Remove reschedule code from AdminPage.js (lines 6, 20-21, 94-115, 497-502, 525-534)
4. Remove reschedule CSS from AdminPage.css (lines 536-554, 691)

Or simply restore from git:
```bash
git checkout HEAD~1 -- src/pages/ProfilePage.js
git checkout HEAD~1 -- src/pages/ProfilePage.css
git checkout HEAD~1 -- src/pages/AdminPage.js
git checkout HEAD~1 -- src/pages/AdminPage.css
```

## Support

For issues:
- Check browser console for JavaScript errors
- Check Network tab for failed API calls
- Verify user role (admin features require admin role)
- Check booking status (buttons only show for pending/confirmed)
- Docker logs: `docker-compose logs frontend`
