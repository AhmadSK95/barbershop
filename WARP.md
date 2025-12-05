# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

A full-stack barbershop booking system with JWT authentication, role-based access control (user/barber/admin). Built with React frontend, Node.js/Express backend, and PostgreSQL database.

## Development Commands

### Frontend (React)
```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Backend (Node.js/Express)
```bash
cd backend

# Install dependencies
npm install

# Initialize/reset database with seed data
npm run migrate

# Start development server with hot reload (runs on http://localhost:5001)
npm run dev

# Start production server
npm start
```

### Docker (Recommended for Production)
```bash
# Start all services (frontend, backend, postgres)
docker-compose up -d --build

# View logs
docker-compose logs -f
docker-compose logs -f backend  # specific service

# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: deletes database)
docker-compose down -v

# Check service status
docker-compose ps
```

### Database Operations
```bash
# Access PostgreSQL (Docker)
docker exec -it barbershop_postgres psql -U barbershop_user -d barbershop_db

# Access PostgreSQL (Local)
psql -U barbershop_user -d barbershop_db

# Useful SQL commands
\dt                              # List tables
\d users                         # Describe users table
SELECT * FROM users;             # View users
SELECT * FROM bookings;          # View bookings
\q                               # Quit
```

## Architecture

### Monorepo Structure
```
├── src/                    # React frontend
│   ├── components/        # Reusable UI components
│   ├── pages/            # Route-level page components
│   ├── context/          # React Context (AuthContext)
│   └── services/         # API client (axios)
└── backend/             # Node.js API server
    ├── services/        # Email, SMS services
    └── src/
        ├── config/      # Database config & migrations
        ├── controllers/ # Request handlers
        ├── routes/      # Express route definitions
        ├── middleware/  # Auth, rate limiting
        └── utils/       # Auth helpers, email service
```

### Authentication Flow
- JWT-based with refresh tokens stored in PostgreSQL `refresh_tokens` table
- Access tokens stored in localStorage with automatic refresh on 401
- Frontend: `src/context/AuthContext.js` manages auth state
- Backend: `backend/src/middleware/auth.js` validates tokens
- Token refresh handled by axios interceptor in `src/services/api.js`

### Database Schema
- **users**: email, password (bcrypt), role (user/barber/admin), verification tokens
- **barbers**: user_id reference, specialty, rating, availability
- **services**: barbershop services (name, price, duration)
- **addons**: optional add-ons (beard trim, shave)
- **bookings**: user_id, barber_id, service_id, date/time, status (pending/confirmed/completed/cancelled)
- **booking_addons**: junction table for many-to-many booking-addon relationship
- **refresh_tokens**: JWT refresh token storage

Migration script at `backend/src/config/migrate.js` creates schema and seeds default data (admin user, barbers, services).

### API Architecture
Backend follows MVC pattern:
- **Routes** (`backend/src/routes/*Routes.js`): Define endpoints
- **Controllers** (`backend/src/controllers/*Controller.js`): Handle business logic
- **Middleware** (`backend/src/middleware/auth.js`): JWT verification, role checks
- **Rate Limiting** (`backend/src/middleware/rateLimiter.js`): Prevent abuse

API Endpoints:
- `/api/auth/*` - Registration, login, password reset, email verification
- `/api/bookings/*` - CRUD for bookings, available barbers
- `/api/users/*` - User management (admin only)
- `/api/config/*` - System configuration

### Environment Variables
Frontend (root `.env`):
- `REACT_APP_API_URL` - Backend API URL

Backend (`backend/.env` or root `.env`):
- `DB_*` - PostgreSQL connection
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - Token signing
- `EMAIL_*` - SMTP configuration (Gmail, SendGrid, Mailgun)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` - Initial admin credentials

Copy `backend/.env.example` or `.env.production` as starting point.

## Development Patterns

### Frontend Patterns
- React Router v7 for navigation
- Context API for global auth state (no Redux)
- Axios with interceptors for API calls (auto token refresh)
- Protected routes via `<ProtectedRoute>` component
- Role-based UI rendering (admin sees user management, barbers see schedules)

### Backend Patterns
- Express middleware chain: helmet → cors → rate limiting → auth
- `protect` middleware for authenticated routes
- `authorize(...roles)` middleware for role restrictions
- Database queries use raw SQL with `pg` pool (no ORM)
- Email sending abstracted in `backend/src/utils/email.js` (uses nodemailer)

### Error Handling
Backend returns consistent JSON:
```javascript
{ success: true/false, message: "...", data: {...} }
```
Frontend displays errors via alert/modal (no global error boundary).

## Common Workflows

### Adding a New API Endpoint
1. Create/update route in `backend/src/routes/*Routes.js`
2. Implement handler in `backend/src/controllers/*Controller.js`
3. Add client method to `src/services/api.js` (frontend)
4. Use in React component via `useEffect` or event handler

### Adding a New Role Permission
1. Update `protect` middleware or add role check in controller
2. Use `authorize('admin')` or `authorize('admin', 'barber')` middleware
3. Frontend: check `user.role` from AuthContext before rendering UI

### Database Schema Changes
1. Edit `backend/src/config/migrate.js` SQL migrations
2. Run `npm run migrate` in backend directory
3. For production: backup database before running migrations

### Deploying to VPS
1. Copy `.env.production` to `.env` and configure
2. Generate secure JWT secrets: `openssl rand -hex 32`
3. Set up SMTP email (Gmail app password or SendGrid)
4. Run `docker-compose up -d --build`
5. See `DEPLOYMENT.md` for full VPS setup (Nginx, SSL, firewall)

## Testing

Run frontend tests:
```bash
npm test
```

No backend test suite currently exists. To test backend:
- Use `curl` or Postman for API endpoints
- Health check: `curl http://localhost:5001/health`
- Test email: `node backend/test-email-booking.js`

## Debugging

### Backend Logs
```bash
# Docker
docker-compose logs -f backend

# Local
# Logs print to console via morgan middleware
```

### Common Issues
- **Port conflicts**: Backend uses 5001, frontend 3000
  - Find process: `lsof -ti:5001 | xargs kill -9` (Mac/Linux)
- **Database connection failed**: Check PostgreSQL is running, verify `.env` credentials
- **Email not sending**: Verify Gmail App Password (not regular password) or SMTP config

### Database Debugging
```bash
# Check barber availability
docker exec -it barbershop_postgres psql -U barbershop_user -d barbershop_db \
  -c "SELECT b.id, u.first_name, b.specialty, b.is_available FROM barbers b LEFT JOIN users u ON b.user_id = u.id;"

# View bookings by status
docker exec -it barbershop_postgres psql -U barbershop_user -d barbershop_db \
  -c "SELECT id, booking_date, booking_time, status FROM bookings WHERE status='pending';"
```

## Security

### Password Requirements
**Enforced since 2025-11-17:**
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*...)

Validation applied to:
- User registration (`/api/auth/register`)
- Password reset (`/api/auth/reset-password/:token`)
- Password change (`/api/users/change-password`)

### Input Validation
- Email format validation (RFC 5322 compliant)
- Phone number validation (10-15 digits)
- Name validation (2-50 chars, letters/spaces/hyphens only)
- All text inputs sanitized (trimmed, length-limited)

### Security Features
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (React auto-escaping)
- ✅ Password hashing (bcrypt, 10 salt rounds)
- ✅ JWT access + refresh tokens
- ✅ Rate limiting (API, auth, password reset)
- ✅ CORS restrictions (specific origins only)
- ✅ Request body size limits (10kb)
- ✅ Security headers (Helmet.js)
- ✅ Role-based access control

### Security Maintenance
See `SECURITY-AUDIT.md` and `SECURITY-MAINTENANCE.md` for:
- Full security audit results
- Refresh token cleanup procedures
- Production deployment checklist
- Security monitoring queries
- Emergency procedures

**Run token cleanup:**
```bash
cd backend
node src/utils/cleanupRefreshTokens.js
```

## Important Files

- `SETUP.md` - Quick start guide for local development
- `DEPLOYMENT.md` - Production deployment to VPS with Docker
- `README.md` - Feature overview and tech stack
- `SECURITY-AUDIT.md` - Security audit report (2025-11-17)
- `SECURITY-MAINTENANCE.md` - Security operations guide
- `docker-compose.yml` - Multi-container orchestration
- `backend/src/config/migrate.js` - Database schema and seed data
- `backend/src/utils/validation.js` - Input validation utilities
- `backend/src/utils/cleanupRefreshTokens.js` - Token cleanup script
- `src/context/AuthContext.js` - Authentication state management
- `backend/src/middleware/auth.js` - JWT verification logic

## Default Credentials (Development)

**Admin:** `admin@barbershop.com` / `Admin@123456`

**Barbers:** 
- `al@balkanbarbers.com` / `Barber123!`
- `cynthia@balkanbarbers.com` / `Barber123!`
- `eric@balkanbarbers.com` / `Barber123!`
- `john@balkanbarbers.com` / `Barber123!`
- `nick@balkanbarbers.com` / `Barber123!`
- `riza@balkanbarbers.com` / `Barber123!`

⚠️ **IMPORTANT**: Change these in production via `.env` variables or admin panel.

**To update barber passwords:**
```bash
cd backend
node src/config/update-barber-passwords.js
```
