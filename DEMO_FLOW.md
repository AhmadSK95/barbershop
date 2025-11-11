# 🎬 Application Flow Demonstration

This document demonstrates the complete user flow of the Barbershop Booking System.

## Prerequisites Check

Before running the application, you need:
- ✅ Node.js 18+ installed
- ✅ PostgreSQL 15+ installed and running
- ✅ Or use Docker (easiest option)

## Quick Start Options

### Option 1: Using Docker (Recommended - No PostgreSQL setup needed)

```bash
# From project root
cp .env.production .env

# Edit .env with minimal configuration:
# - Set DB_PASSWORD to any secure password
# - Set JWT_SECRET and JWT_REFRESH_SECRET (use: openssl rand -hex 32)
# - Email settings are optional for demo

# Start everything
docker-compose up -d --build

# Wait 30 seconds for database initialization
sleep 30

# Application is now running!
# Frontend: http://localhost
# Backend: http://localhost:5000
```

### Option 2: Local Setup (Requires PostgreSQL)

```bash
# 1. Install and start PostgreSQL
brew install postgresql@15  # macOS
brew services start postgresql@15

# 2. Create database and user
psql postgres -c "CREATE DATABASE barbershop_db;"
psql postgres -c "CREATE USER barbershop_user WITH PASSWORD 'barbershop123';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE barbershop_db TO barbershop_user;"

# 3. Setup backend
cd backend
npm install
npm run migrate  # Creates tables and seeds data

# 4. Start backend
npm run dev  # Runs on http://localhost:5000

# 5. In new terminal, start frontend
cd ..
npm install
npm start  # Runs on http://localhost:3000
```

---

## 📋 Complete Application Flow

### 1. Health Check

**Verify API is running:**
```bash
curl http://localhost:5000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-10-31T15:54:21.000Z"
}
```

---

### 2. View Available Services (Public)

**Endpoint:** `GET /api/users/services`

```bash
curl http://localhost:5000/api/users/services
```

**Response:**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": 1,
        "name": "Haircut",
        "description": "Classic or modern haircut",
        "price": "30.00",
        "duration": 30
      },
      {
        "id": 2,
        "name": "Beard Trim",
        "description": "Professional beard shaping and trimming",
        "price": "15.00",
        "duration": 15
      }
    ]
  }
}
```

---

### 3. View Available Barbers (Public)

**Endpoint:** `GET /api/users/barbers`

```bash
curl http://localhost:5000/api/users/barbers
```

**Response:**
```json
{
  "success": true,
  "data": {
    "barbers": [
      {
        "id": 1,
        "first_name": "Mike",
        "last_name": "Johnson",
        "specialty": "Classic Cuts",
        "rating": "4.90"
      },
      {
        "id": 2,
        "first_name": "Alex",
        "last_name": "Rodriguez",
        "specialty": "Modern Styles",
        "rating": "4.80"
      }
    ]
  }
}
```

---

### 4. User Registration

**Endpoint:** `POST /api/auth/register`

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "1234567890"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": 5,
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isVerified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwicm9sZSI6InVzZXIiLCJpYXQiOjE2OTg3NjU0MjEsImV4cCI6MTY5OTM3MDIyMX0.xYz...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwicm9sZSI6InVzZXIiLCJpYXQiOjE2OTg3NjU0MjEsImV4cCI6MTcwMTM1NzQyMX0.aBc..."
  }
}
```

**Note:** Save the `accessToken` for subsequent requests!

---

### 5. User Login

**Endpoint:** `POST /api/auth/login`

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@barbershop.com",
    "password": "Admin@123456"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "admin@barbershop.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin",
      "isVerified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 6. Get Current User Profile

**Endpoint:** `GET /api/auth/me`

```bash
# Replace YOUR_TOKEN with the accessToken from login
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "admin@barbershop.com",
      "first_name": "Admin",
      "last_name": "User",
      "role": "admin",
      "is_verified": true
    }
  }
}
```

---

### 7. Check Available Time Slots

**Endpoint:** `GET /api/bookings/available-slots?date=2024-11-01&barberId=1`

```bash
curl "http://localhost:5000/api/bookings/available-slots?date=2024-11-01&barberId=1"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "availableSlots": [
      "09:00:00",
      "09:30:00",
      "10:00:00",
      "10:30:00",
      "11:00:00",
      "14:00:00",
      "14:30:00",
      "15:00:00"
    ]
  }
}
```

---

### 8. Create a Booking (Requires Auth + Verified Email)

**Endpoint:** `POST /api/bookings`

```bash
# Note: For demo, you may need to manually verify the user in database
# OR login with admin account which is pre-verified

curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "serviceId": 1,
    "barberId": 1,
    "bookingDate": "2024-11-01",
    "bookingTime": "10:00:00",
    "addons": [1, 2],
    "notes": "Please use clippers for a fade"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "bookingId": 1
  }
}
```

---

### 9. Get User's Bookings

**Endpoint:** `GET /api/bookings`

```bash
curl http://localhost:5000/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": 1,
        "booking_date": "2024-11-01",
        "booking_time": "10:00:00",
        "total_price": "45.00",
        "status": "pending",
        "notes": "Please use clippers for a fade",
        "service_name": "Haircut",
        "duration": 30,
        "barber_first_name": "Mike",
        "barber_last_name": "Johnson"
      }
    ]
  }
}
```

---

### 10. Admin: View All Bookings

**Endpoint:** `GET /api/bookings/all` (Admin only)

```bash
# Login as admin first to get admin token
curl http://localhost:5000/api/bookings/all \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": 1,
        "booking_date": "2024-11-01",
        "booking_time": "10:00:00",
        "total_price": "45.00",
        "status": "pending",
        "service_name": "Haircut",
        "customer_first_name": "Admin",
        "customer_last_name": "User",
        "customer_email": "admin@barbershop.com",
        "barber_first_name": "Mike",
        "barber_last_name": "Johnson",
        "created_at": "2024-10-31T15:54:21.000Z"
      }
    ]
  }
}
```

---

### 11. Admin: Update Booking Status

**Endpoint:** `PUT /api/bookings/1/status` (Admin only)

```bash
curl -X PUT http://localhost:5000/api/bookings/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"status": "confirmed"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Booking status updated successfully"
}
```

---

### 12. Admin: View All Users

**Endpoint:** `GET /api/users` (Admin only)

```bash
curl http://localhost:5000/api/users \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "email": "admin@barbershop.com",
        "first_name": "Admin",
        "last_name": "User",
        "phone": null,
        "role": "admin",
        "is_verified": true,
        "created_at": "2024-10-31T10:00:00.000Z"
      },
      {
        "id": 5,
        "email": "john.doe@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "phone": "1234567890",
        "role": "user",
        "is_verified": false,
        "created_at": "2024-10-31T15:54:21.000Z"
      }
    ]
  }
}
```

---

### 13. Update User Profile

**Endpoint:** `PUT /api/users/profile`

```bash
curl -X PUT http://localhost:5000/api/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "phone": "9876543210"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": 5,
      "email": "john.doe@example.com",
      "first_name": "John",
      "last_name": "Smith",
      "phone": "9876543210",
      "role": "user",
      "is_verified": false
    }
  }
}
```

---

### 14. Password Reset Flow

**Step 1: Request Password Reset**
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "john.doe@example.com"}'
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent"
}
```

**Step 2: Reset Password (with token from email)**
```bash
curl -X POST http://localhost:5000/api/auth/reset-password/RESET_TOKEN_FROM_EMAIL \
  -H "Content-Type: application/json" \
  -d '{"password": "NewSecurePass123!"}'
```

---

### 15. Cancel Booking

**Endpoint:** `PUT /api/bookings/1/cancel`

```bash
curl -X PUT http://localhost:5000/api/bookings/1/cancel \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled successfully"
}
```

---

### 16. Logout

**Endpoint:** `POST /api/auth/logout`

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 🎯 Complete User Journey

### Scenario: New Customer Books a Haircut

1. **User visits website** → Views services and barbers (no login required)
2. **User registers** → Creates account with email/password
3. **Email verification** → (Optional) Verifies email via link
4. **User logs in** → Receives access token
5. **Browse services** → Sees available haircut options
6. **Check availability** → Selects date and sees available time slots
7. **Create booking** → Books haircut with preferred barber
8. **Confirmation** → Receives booking confirmation (email if configured)
9. **View bookings** → Checks upcoming appointments
10. **Profile management** → Updates personal information

### Scenario: Admin Manages System

1. **Admin logs in** → Uses admin credentials
2. **View dashboard** → Sees all bookings and users
3. **Manage bookings** → Updates booking statuses (confirm/complete/cancel)
4. **User management** → Views all users, changes roles
5. **Monitor system** → Checks booking patterns and user activity

---

## 🧪 Testing Tips

### Test with Different Roles

**Admin Account:**
- Email: admin@barbershop.com
- Password: Admin@123456
- Can: Manage all users, bookings, change roles

**Barber Accounts:**
- mike.johnson@barbershop.com / Barber@123
- Can: View and manage their own bookings

**Regular User:**
- Create new account via registration
- Can: Book appointments, manage own profile

### Database Verification

```bash
# Connect to database (if using local PostgreSQL)
psql -U barbershop_user -d barbershop_db

# Check tables
\dt

# View users
SELECT id, email, role, is_verified FROM users;

# View bookings
SELECT * FROM bookings;

# Exit
\q
```

---

## 🔧 Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is in use
lsof -ti:5000 | xargs kill -9

# Check PostgreSQL is running
psql postgres -c "SELECT version();"
```

### Database connection issues
```bash
# Verify database exists
psql postgres -c "\l" | grep barbershop_db

# Re-run migrations if needed
cd backend
npm run migrate
```

### Email not sending
- Email features are optional for demo
- Verification token is stored in database
- Admin account is pre-verified

---

## 📊 Sample Data Included

After running migrations, you'll have:

- ✅ 1 Admin user
- ✅ 3 Barber accounts
- ✅ 5 Services (Haircut, Beard Trim, etc.)
- ✅ 5 Add-ons (Hair Wash, Scalp Massage, etc.)
- ✅ Time slots from 9 AM to 7 PM

---

## 🎬 Next Steps

1. **Test the API** using the curl commands above
2. **Connect frontend** to the API endpoints
3. **Customize** services and pricing in database
4. **Deploy** to production using DEPLOYMENT.md

For full API documentation, see `API_DOCS.md`
