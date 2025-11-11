# API Documentation

Base URL: `http://localhost:5000/api` (development) or `http://your-domain.com/api` (production)

## Response Format

All API responses follow this format:

```json
{
  "success": true|false,
  "message": "Description of result",
  "data": {
    // Response payload (optional)
  }
}
```

## Authentication

Most endpoints require JWT authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

---

## Authentication Endpoints

### Register User

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "1234567890"
}
```

**Response:** 201 Created
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isVerified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Login

Authenticate user and receive tokens.

**Endpoint:** `POST /api/auth/login`

**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isVerified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Verify Email

Verify user's email address with token from email.

**Endpoint:** `GET /api/auth/verify-email/:token`

**Access:** Public

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

### Forgot Password

Request password reset email.

**Endpoint:** `POST /api/auth/forgot-password`

**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent"
}
```

---

### Reset Password

Reset password with token from email.

**Endpoint:** `POST /api/auth/reset-password/:token`

**Access:** Public

**Request Body:**
```json
{
  "password": "NewSecurePass123!"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

### Refresh Token

Get new access token using refresh token.

**Endpoint:** `POST /api/auth/refresh-token`

**Access:** Public

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Logout

Invalidate refresh token.

**Endpoint:** `POST /api/auth/logout`

**Access:** Private (requires auth)

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Get Current User

Get authenticated user's profile.

**Endpoint:** `GET /api/auth/me`

**Access:** Private (requires auth)

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "user",
      "is_verified": true
    }
  }
}
```

---

## Booking Endpoints

### Get Available Slots

Get available time slots for a specific date and barber.

**Endpoint:** `GET /api/bookings/available-slots?date=2024-10-31&barberId=1`

**Access:** Public

**Query Parameters:**
- `date` (required) - Date in YYYY-MM-DD format
- `barberId` (required) - Barber ID

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "availableSlots": [
      "09:00:00",
      "09:30:00",
      "10:00:00",
      "14:30:00",
      "15:00:00"
    ]
  }
}
```

---

### Create Booking

Create a new booking.

**Endpoint:** `POST /api/bookings`

**Access:** Private (requires auth + verified email)

**Request Body:**
```json
{
  "serviceId": 1,
  "barberId": 2,
  "bookingDate": "2024-10-31",
  "bookingTime": "10:00:00",
  "addons": [1, 3],
  "notes": "Please use clippers for fade"
}
```

**Response:** 201 Created
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "bookingId": 42
  }
}
```

---

### Get My Bookings

Get all bookings for authenticated user.

**Endpoint:** `GET /api/bookings`

**Access:** Private (requires auth)

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": 42,
        "booking_date": "2024-10-31",
        "booking_time": "10:00:00",
        "total_price": "45.00",
        "status": "confirmed",
        "notes": "Please use clippers for fade",
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

### Get All Bookings (Admin)

Get all bookings in the system.

**Endpoint:** `GET /api/bookings/all`

**Access:** Admin only

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": 42,
        "booking_date": "2024-10-31",
        "booking_time": "10:00:00",
        "total_price": "45.00",
        "status": "confirmed",
        "service_name": "Haircut",
        "customer_first_name": "John",
        "customer_last_name": "Doe",
        "customer_email": "user@example.com",
        "barber_first_name": "Mike",
        "barber_last_name": "Johnson",
        "created_at": "2024-10-30T14:32:00.000Z"
      }
    ]
  }
}
```

---

### Update Booking Status (Admin)

Update the status of a booking.

**Endpoint:** `PUT /api/bookings/:id/status`

**Access:** Admin only

**Request Body:**
```json
{
  "status": "confirmed"
}
```

Valid statuses: `pending`, `confirmed`, `completed`, `cancelled`

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Booking status updated successfully"
}
```

---

### Cancel Booking

Cancel a booking (user can cancel their own, admin can cancel any).

**Endpoint:** `PUT /api/bookings/:id/cancel`

**Access:** Private (requires auth)

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Booking cancelled successfully"
}
```

---

## User Endpoints

### Get Services

Get all active services.

**Endpoint:** `GET /api/users/services`

**Access:** Public

**Response:** 200 OK
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

### Get Add-ons

Get all active add-ons.

**Endpoint:** `GET /api/users/addons`

**Access:** Public

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "addons": [
      {
        "id": 1,
        "name": "Hair Wash",
        "price": "5.00",
        "duration": 10
      },
      {
        "id": 2,
        "name": "Scalp Massage",
        "price": "10.00",
        "duration": 10
      }
    ]
  }
}
```

---

### Get Barbers

Get all available barbers.

**Endpoint:** `GET /api/users/barbers`

**Access:** Public

**Response:** 200 OK
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

### Update Profile

Update authenticated user's profile.

**Endpoint:** `PUT /api/users/profile`

**Access:** Private (requires auth)

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "9876543210"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Smith",
      "phone": "9876543210",
      "role": "user",
      "is_verified": true
    }
  }
}
```

---

### Change Password

Change authenticated user's password.

**Endpoint:** `PUT /api/users/change-password`

**Access:** Private (requires auth)

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## Admin Endpoints

### Get All Users

Get list of all users.

**Endpoint:** `GET /api/users`

**Access:** Admin only

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "phone": "1234567890",
        "role": "user",
        "is_verified": true,
        "created_at": "2024-10-01T10:00:00.000Z"
      }
    ]
  }
}
```

---

### Get User By ID

Get specific user by ID.

**Endpoint:** `GET /api/users/:id`

**Access:** Admin only

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "1234567890",
      "role": "user",
      "is_verified": true,
      "created_at": "2024-10-01T10:00:00.000Z"
    }
  }
}
```

---

### Update User Role

Change user's role.

**Endpoint:** `PUT /api/users/:id/role`

**Access:** Admin only

**Request Body:**
```json
{
  "role": "barber"
}
```

Valid roles: `user`, `barber`, `admin`

**Response:** 200 OK
```json
{
  "success": true,
  "message": "User role updated successfully"
}
```

---

### Delete User

Delete a user account.

**Endpoint:** `DELETE /api/users/:id`

**Access:** Admin only

**Response:** 200 OK
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Please provide all required fields"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Admin only."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Server error"
}
```

---

## Rate Limits

- **General API**: 100 requests per 15 minutes
- **Auth Endpoints**: 5 requests per 15 minutes
- **Password Reset**: 3 requests per hour

---

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@barbershop.com","password":"Admin@123456"}'
```

### Get Services (with auth)
```bash
curl http://localhost:5000/api/users/services \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Booking
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"serviceId":1,"barberId":1,"bookingDate":"2024-11-01","bookingTime":"10:00:00"}'
```

---

## Health Check

Check if API is running:

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-10-31T15:30:00.000Z"
}
```
