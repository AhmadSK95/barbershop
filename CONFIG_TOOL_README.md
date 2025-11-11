# Barbershop Configuration Tool

## Overview
A comprehensive admin tool to configure the barbershop user journey including barbers, services, and availability settings.

## Features

### 1. **Barber Management** 👨‍💼
Manage all barbers in your barbershop:
- **Add New Barbers**: Create barber accounts with email, password, specialty, rating, and profile image
- **Edit Barbers**: Update barber information (name, specialty, rating, image URL)
- **Activate/Deactivate**: Toggle barber availability without deleting their account
- **Delete Barbers**: Remove barbers (only if they have no bookings)

**Fields:**
- First Name & Last Name (required)
- Email & Password (required)
- Specialty (e.g., "Master Barber - All Services")
- Rating (0-5 stars)
- Image URL (path to barber's photo)

### 2. **Service Management** ✂️
Configure all services offered:
- **Add Services**: Create new service offerings
- **Edit Services**: Modify service details, pricing, and duration
- **Activate/Deactivate**: Control which services are visible to customers
- **Delete Services**: Remove services (only if they have no bookings)

**Fields:**
- Service Name (required, e.g., "Haircut - Master Barber")
- Description (optional, detailed service info)
- Price in USD (required)
- Duration in minutes (required, in 15-minute increments)

### 3. **Availability Settings** 📅
Control business hours and booking configurations:
- **Business Hours**: Set opening and closing times
- **Booking Slot Duration**: Choose between 15, 30, or 60-minute slots
- **Days Open**: Select which days of the week the business operates

## Access

### Prerequisites
- Must be logged in as an **admin user**
- Admin role is required for all configuration endpoints

### Accessing the Tool
1. Log in with admin credentials
2. Navigate to: `/config` or click "⚙️ Config" in the navigation bar (visible only to admins)

## Backend API Endpoints

All endpoints require authentication and admin role.

### Barbers
- `GET /api/config/barbers` - Get all barbers
- `POST /api/config/barbers` - Create a new barber
- `PUT /api/config/barbers/:id` - Update barber details
- `DELETE /api/config/barbers/:id` - Delete a barber

### Services
- `GET /api/config/services` - Get all services
- `POST /api/config/services` - Create a new service
- `PUT /api/config/services/:id` - Update service details
- `DELETE /api/config/services/:id` - Delete a service

### Availability
- `GET /api/config/availability/settings` - Get business settings
- `PUT /api/config/availability/settings` - Update availability settings
- `GET /api/config/availability/barbers` - Get barber-specific availability
- `PUT /api/config/availability/barbers` - Update barber availability

## Database Requirements

The following tables need to exist in your PostgreSQL database:

### Users Table (Barbers)
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 5.0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
```

### Services Table
```sql
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Settings Table
```sql
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Barber Availability Table (Optional)
```sql
CREATE TABLE IF NOT EXISTS barber_availability (
  id SERIAL PRIMARY KEY,
  barber_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(barber_id, day_of_week, start_time)
);
```

## Usage Examples

### Adding a New Barber
1. Go to the "Barbers" tab
2. Fill in the form:
   - First Name: "John"
   - Last Name: "Smith"
   - Email: "john@barbershop.com"
   - Password: "secure_password"
   - Specialty: "Master Barber - All Services"
   - Rating: 5.0
   - Image URL: "/images/barbers/john.jpg"
3. Click "Add Barber"

### Creating a New Service
1. Go to the "Services" tab
2. Fill in the form:
   - Service Name: "Deluxe Haircut"
   - Description: "Premium haircut with consultation"
   - Price: 75
   - Duration: 45
3. Click "Add Service"

### Configuring Business Hours
1. Go to the "Availability" tab
2. Set opening time (e.g., 09:00)
3. Set closing time (e.g., 18:00)
4. Select booking slot duration (e.g., 30 minutes)
5. Click days to open (e.g., Mon-Sat)
6. Click "Update Settings"

## User Interface

### Navigation Tabs
- **Barbers**: Manage barber staff
- **Services**: Manage service offerings
- **Availability**: Configure business hours and settings

### Interactive Forms
- Inline editing for existing items
- Real-time validation
- Success/error notifications
- Confirmation dialogs for destructive actions

### Status Indicators
- **Active**: Green badge - item is visible to customers
- **Inactive**: Gray badge - item is hidden but not deleted

## Security Features

- Admin-only access (enforced at both frontend and backend)
- Password hashing for new barber accounts (bcrypt)
- Input validation on all forms
- Protection against deleting items with existing bookings
- JWT token authentication on all API requests

## Styling
The configuration page matches your existing admin aesthetic:
- Dark gradient background
- Golden/brown color scheme
- Responsive design for mobile devices
- Smooth animations and transitions
- Graffiti-inspired fonts (Playfair Display, Crimson Text)

## Troubleshooting

### "Access Denied" Error
- Ensure you're logged in as an admin user
- Check that your JWT token is valid

### Cannot Delete Barber/Service
- Items with existing bookings cannot be deleted
- Use the "Deactivate" button instead to hide them

### Settings Not Saving
- Check browser console for errors
- Verify database connection
- Ensure settings table exists

## Future Enhancements
- Barber-specific schedule management
- Service categories and grouping
- Bulk import/export functionality
- Image upload functionality
- Service pricing variations
- Holiday/closure management
