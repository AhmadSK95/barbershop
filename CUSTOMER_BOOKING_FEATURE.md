# Customer Booking Feature for Admin/Barber

## Overview
When an admin or barber creates a booking, they can now provide customer information (name and email) so the booking confirmation is sent to the customer instead of the admin/barber.

## How It Works

### Frontend (BookingSummary.js)

**Role Detection**:
- Checks if logged-in user is `admin` or `barber`
- If yes, displays customer information form

**Customer Information Form** (displayed before booking summary):
- **First Name*** (required)
- **Last Name*** (required)
- **Email*** (required) - Where booking confirmation will be sent
- **Phone** (optional) - For SMS notifications

**Validation**:
- Ensures all required fields are filled
- Validates email format
- Shows toast error if validation fails

**Data Sent to Backend**:
```javascript
{
  serviceIds: [...],
  barberId: ...,
  bookingDate: "2025-12-04",
  bookingTime: "10:00",
  notes: "",
  // Admin/barber specific fields
  customerFirstName: "John",
  customerLastName: "Doe",
  customerEmail: "john.doe@example.com",
  customerPhone: "+1 (555) 123-4567"
}
```

### Backend (bookingController.js)

**Customer Info Handling**:
```javascript
// Determine if this is an admin/barber booking for a customer
const isAdminOrBarberBooking = (userRole === 'admin' || userRole === 'barber') && customerEmail;

// Use customer information if provided, otherwise use logged-in user
const customerInfo = isAdminOrBarberBooking ? {
  firstName: customerFirstName,
  lastName: customerLastName,
  email: customerEmail,
  phone: customerPhone || null
} : {
  firstName: req.user.first_name,
  lastName: req.user.last_name,
  email: req.user.contact_email || req.user.email,
  phone: req.user.phone
};
```

**Email Notifications**:
- Customer confirmation email sent to `customerInfo.email`
- Barber notification email sent to barber's contact_email
- Customer name in emails uses `customerInfo.firstName` `customerInfo.lastName`

**SMS Notifications** (if phone provided):
- Customer SMS sent to `customerInfo.phone`
- Barber SMS includes `customerInfo` name in the notification

## User Flow

### For Regular Users
1. Navigate to booking page
2. Select barber, services, date, time
3. Review booking summary
4. Confirm booking
5. **No customer information form shown** - booking created for logged-in user

### For Admin/Barber Users
1. Navigate to booking page (same URL: `/booking`)
2. Select barber, services, date, time
3. **See customer information form** before booking summary:
   - Fill in customer's first name, last name
   - Enter customer's email (confirmation will be sent here)
   - Optionally add customer's phone
4. Review booking summary
5. Confirm booking
6. Customer receives confirmation at their email

## Database Behavior

**No Database Changes Required**:
- Booking still created with `user_id` = admin/barber's ID
- Customer information is used **only for notifications**
- No new tables or columns needed

**Future Enhancement Consideration**:
Could add optional `customer_email`, `customer_name` columns to `bookings` table to track who the booking was actually for, but current implementation works without schema changes.

## UI Design

**Customer Information Form Styling**:
- Gold border (`border: 1px solid var(--gold)`)
- Dark background (`background: rgba(26, 15, 10, 0.6)`)
- Grid layout (responsive, 2-4 columns depending on screen size)
- Required fields marked with red asterisk (`*`)
- Email icon with message: "📧 Booking confirmation will be sent to this email address"

**Form Fields**:
- All inputs have gold borders
- Dark backgrounds with cream text
- Consistent padding and rounded corners
- Placeholders for guidance

## Testing

### Test as Admin/Barber:
1. Login as admin (`admin@barbershop.com` / `Admin@123456`) or barber
2. Navigate to http://34.226.11.9/booking
3. Complete booking flow
4. **Verify customer information form appears** on summary page
5. Fill in customer details (e.g., `customer@test.com`)
6. Confirm booking
7. **Check customer's email inbox** for confirmation

### Test as Regular User:
1. Login as regular user
2. Navigate to booking page
3. Complete booking flow
4. **Verify no customer information form** - direct to summary
5. Confirm booking
6. **Check your own email** for confirmation

## Email Content

**Customer Confirmation Email**:
- **To**: `customerInfo.email` (provided by admin/barber)
- **Subject**: "Booking Confirmation - Balkan Barber"
- **Content**:
  ```
  Hi [customerInfo.firstName],
  
  Your booking has been confirmed:
  - Service: [service names]
  - Barber: [barber name]
  - Date: [booking date]
  - Time: [booking time]
  - Total: $[price]
  ```

**Barber Notification Email**:
- **To**: Barber's `contact_email`
- **Subject**: "New Booking - Balkan Barber"
- **Content**: Includes customer name from `customerInfo`

## Security & Validation

**Input Validation**:
✅ First name: Required, 2-50 characters
✅ Last name: Required, 2-50 characters
✅ Email: Required, valid email format (regex validated)
✅ Phone: Optional, no strict validation (accepts various formats)

**Role-Based Access**:
✅ Customer form only shown to `admin` and `barber` roles
✅ Regular users cannot see or submit customer information
✅ Backend validates that user has admin/barber role before using customer info

**Email Sending**:
✅ Uses AWS SES with verified sender (ahmad2609.as@gmail.com)
✅ Customer email must be verified in AWS SES (sandbox mode) or sender domain must be verified (production)
✅ Errors in email sending do not fail the booking creation

## Benefits

1. **Admin Efficiency**: Admins can create bookings for walk-in customers
2. **Barber Convenience**: Barbers can book for customers via phone/in-person requests
3. **Customer Experience**: Customers receive confirmations even if booked by staff
4. **No Login Required**: Customers don't need accounts if booked by admin/barber
5. **Audit Trail**: Booking still tracked under admin/barber's user_id

## Limitations & Future Enhancements

**Current Limitations**:
- Customer information not stored in database (only used for notifications)
- No customer account created automatically
- Booking history shows under admin/barber's profile, not customer's

**Future Enhancements**:
1. Add `customer_email`, `customer_name`, `customer_phone` columns to `bookings` table
2. Optionally create user accounts for customers when booked by admin
3. Allow customers to claim bookings via email link
4. Separate admin booking view showing customer names
5. Search bookings by customer email/name

## Files Modified

### Frontend:
- `src/components/BookingSummary.js`
  - Added `useAuth` import
  - Added customer information state
  - Added customer information form UI
  - Added validation for customer fields
  - Updated booking data to include customer info

### Backend:
- `backend/src/controllers/bookingController.js`
  - Extract customer info from request body
  - Detect admin/barber role
  - Create `customerInfo` object (use provided or logged-in user)
  - Use `customerInfo` for all email/SMS notifications
  - Log customer email being used

## Deployment

✅ Deployed to: http://34.226.11.9
✅ Frontend: Port 3000
✅ Backend: Port 5001
✅ Database: Preserved (no schema changes)

## Support

**For Issues**:
1. Check backend logs: `docker compose logs backend`
2. Verify user role: Check user object in browser console
3. Test email delivery: Check AWS SES send statistics
4. Check form validation: Open browser dev tools console

**Common Issues**:
- **Form not showing**: Verify logged-in user has `admin` or `barber` role
- **Email not received**: Check AWS SES sandbox mode restrictions
- **Validation error**: Ensure all required fields filled with valid data
