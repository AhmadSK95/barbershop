# Booking Rescheduling Feature

**Status:** ✅ Completed  
**Date:** November 23, 2025

## Overview

Users can now reschedule their upcoming appointments through the Profile page. The feature respects business policies, validates availability, and sends notifications to both customers and barbers.

## Features

### User Interface

- **Reschedule Button**: Appears on booking cards for `pending` and `confirmed` appointments
- **Modal Interface**: 
  - Displays current appointment details
  - Shows policy window notice (default: 2 hours before appointment)
  - Date picker (tomorrow to 3 months out)
  - Real-time available time slots
  - New appointment summary before confirmation

### Business Rules

1. **Policy Window**: Appointments can only be rescheduled at least X hours before the scheduled time (configurable via `settings.reschedule_window_hours`)
2. **Status Restrictions**: Only `pending` or `confirmed` bookings can be rescheduled
3. **Ownership**: Users can only reschedule their own bookings
4. **Availability**: New time slot must be available for the selected barber

### Backend Implementation

#### New Controller
**File:** `/backend/src/controllers/rescheduleController.js`

**Endpoints:**
1. `POST /api/bookings/:id/reschedule`
   - Protected route (user must be authenticated)
   - Request body: `{ newDate, newTime }`
   - Validates policy window, ownership, status, and availability
   - Updates booking and resets reminder flags
   - Sends email/SMS notifications

2. `GET /api/bookings/reschedule/available-slots`
   - Public route (optional auth)
   - Query params: `date`, `barberId` (optional)
   - Returns available time slots based on business hours
   - Filters out already booked times
   - Excludes past times if selecting today

#### Database Changes
- When rescheduled, booking status resets to `pending`
- Reminder flags (`reminder_24h_sent`, `reminder_2h_sent`) reset to `false`

#### Routes
**File:** `/backend/src/routes/bookingRoutes.js`

```javascript
router.post('/:id/reschedule', protect, rescheduleBooking);
router.get('/reschedule/available-slots', getAvailableSlotsForReschedule);
```

### Frontend Implementation

#### Component
**File:** `/src/components/RescheduleModal.js`

**Features:**
- Fetches policy window from settings API
- Loads available slots dynamically when date changes
- Validates date/time selection
- Displays loading states and error messages
- Calls reschedule endpoint with new date/time
- Triggers parent callback on success

**Styling:**
**File:** `/src/components/RescheduleModal.css`
- Responsive modal design
- Time slot grid layout
- Error/success message styling
- Mobile-friendly (full-width buttons, stacked layout)

#### Integration
**File:** `/src/pages/ProfilePage.js`

**Changes:**
- Added `rescheduleModalOpen` and `selectedBooking` state
- `handleReschedule()`: Opens modal with selected booking
- `handleRescheduleSuccess()`: Closes modal and refreshes bookings
- `canReschedule()`: Determines if reschedule button should show
- Reschedule button appears before Reorder button (only for eligible bookings)

**Styling:**
**File:** `/src/pages/ProfilePage.css`
- `reschedule-btn` styling with gray gradient
- Mobile responsive: buttons stack vertically

## User Flow

1. User navigates to Profile page → Orders tab
2. For pending/confirmed bookings, "Reschedule" button appears
3. Click "Reschedule" → Modal opens showing current appointment details
4. Select new date from date picker (tomorrow onwards)
5. Available time slots load automatically
6. Select desired time slot (grid highlights selection)
7. Review new appointment summary
8. Click "Confirm Reschedule"
9. Modal closes, bookings list refreshes with updated appointment
10. Notifications sent to customer and barber

## Notifications

When a booking is rescheduled:
- **Customer**: Receives email/SMS with old and new appointment details
- **Barber**: Receives notification about the rescheduled appointment

Email subject: `"Appointment Rescheduled - [Service Name]"`

## Configuration

Policy window is controlled by the `settings` table:

```sql
SELECT * FROM settings WHERE setting_key = 'reschedule_window_hours';
-- Default: 2 hours
```

To change the window:
```sql
UPDATE settings 
SET setting_value = '4' 
WHERE setting_key = 'reschedule_window_hours';
```

## API Examples

### Reschedule Booking
```bash
curl -X POST http://localhost:5001/api/bookings/123/reschedule \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newDate": "2025-11-25",
    "newTime": "14:00:00"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "message": "Booking rescheduled successfully",
  "data": {
    "booking": {
      "id": 123,
      "booking_date": "2025-11-25",
      "booking_time": "14:00:00",
      "status": "pending",
      "reminder_24h_sent": false,
      "reminder_2h_sent": false
    }
  }
}
```

**Error Responses:**
```json
// Too close to appointment
{
  "success": false,
  "message": "Cannot reschedule within 2 hours of appointment"
}

// Slot already booked
{
  "success": false,
  "message": "Selected time slot is not available"
}

// Invalid status
{
  "success": false,
  "message": "Cannot reschedule cancelled or completed bookings"
}
```

### Get Available Slots
```bash
curl "http://localhost:5001/api/bookings/reschedule/available-slots?date=2025-11-25&barberId=2"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "availableSlots": [
      "10:00", "10:30", "11:00", "11:30",
      "14:00", "14:30", "15:00"
    ]
  }
}
```

## Testing

### Manual Testing Steps

1. **Happy Path:**
   - Login as customer
   - Navigate to Profile → Orders
   - Click "Reschedule" on a pending booking
   - Select date (2+ days in future)
   - Select available time slot
   - Confirm reschedule
   - Verify booking updates in list
   - Check email/SMS notifications

2. **Policy Window Validation:**
   - Try to reschedule a booking less than 2 hours away
   - Should show error: "Cannot reschedule within X hours"

3. **Status Validation:**
   - Try to reschedule a cancelled booking
   - Reschedule button should not appear

4. **Availability Check:**
   - Book all time slots for a specific date
   - Try to reschedule to that date
   - Should show "No available time slots for this date"

5. **Mobile Responsiveness:**
   - Open modal on mobile device
   - Verify buttons stack vertically
   - Time slots should wrap properly

## Files Modified/Created

### Backend
- ✅ Created: `/backend/src/controllers/rescheduleController.js`
- ✅ Modified: `/backend/src/routes/bookingRoutes.js`

### Frontend
- ✅ Created: `/src/components/RescheduleModal.js`
- ✅ Created: `/src/components/RescheduleModal.css`
- ✅ Modified: `/src/pages/ProfilePage.js`
- ✅ Modified: `/src/pages/ProfilePage.css`

### Documentation
- ✅ Created: `/RESCHEDULE_FEATURE.md` (this file)

## Future Enhancements

Potential improvements for future iterations:

1. **Bulk Rescheduling**: Allow rescheduling multiple appointments at once
2. **Suggest Alternative Times**: If selected slot unavailable, show nearest alternatives
3. **Barber Calendar View**: Show barber's full schedule when rescheduling
4. **Reschedule History**: Track all rescheduling events in audit logs
5. **Flexible Policy Windows**: Different windows for different service types
6. **Admin Override**: Allow admins to bypass policy window restrictions
7. **Peak Time Warnings**: Warn users when rescheduling to busy time slots

## Known Limitations

1. Cannot change barber or service during reschedule (use "Reorder" for that)
2. Policy window applies uniformly to all bookings
3. No validation for barber availability beyond simple slot checking
4. Notifications sent regardless of user preferences (no opt-out)

## Troubleshooting

**Issue:** Reschedule button doesn't appear
- **Solution:** Check booking status (must be `pending` or `confirmed`)

**Issue:** "Failed to load available times"
- **Solution:** Verify backend is running, check network tab for errors

**Issue:** Modal doesn't close after successful reschedule
- **Solution:** Check browser console for errors, verify `onSuccess` callback

**Issue:** Time slots show past times
- **Solution:** Clear browser cache, verify server time zone configuration

## Support

For issues or questions, check:
- Backend logs: `docker-compose logs backend`
- Frontend console: Browser DevTools → Console
- Database state: `SELECT * FROM bookings WHERE id = X;`
