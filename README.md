# 💈 Barbershop Booking System

A full-stack booking system with authentication, role-based access control, and email notifications. Built with React, Node.js, Express, and PostgreSQL.

## ✨ Features

### User Features
- 🔐 **Email/Password Authentication** - Secure login and registration
- ✉️ **Email Verification** - Verify email addresses with token-based system
- 🔑 **Password Reset** - Forgot password with email reset link
- 📅 **Booking System** - Book appointments with preferred barbers
- 👤 **User Profile** - Manage personal information
- 📊 **Booking History** - View past and upcoming appointments
- ⏰ **Real-time Availability** - See available time slots

### Admin Features
- 👥 **User Management** - View, edit, and delete users
- 🎯 **Role Management** - Assign roles (user, barber, admin)
- 📋 **Booking Management** - View and manage all bookings
- 📈 **Dashboard** - Overview of system statistics

### Technical Features
- 🔒 **JWT Authentication** with refresh tokens
- 🛡️ **Role-based Access Control** (RBAC)
- 📧 **Email Notifications** for bookings and password resets
- 🚀 **Docker Support** for easy deployment
- 🔐 **Security Best Practices** - Rate limiting, helmet, input validation
- 📱 **Responsive Design** - Works on all devices

## 🚀 Quick Start

### Development Setup

#### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run migrate
npm run dev
```

#### Frontend
```bash
npm install
npm start
```

### Docker Setup (Production)

```bash
cp .env.production .env
# Edit .env with your configuration
docker-compose up -d --build
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 👤 Default Accounts

**Admin:** `admin@barbershop.com` / `Admin@123456`

**Barbers:**
- `mike.johnson@barbershop.com` / `Barber@123`
- `alex.rodriguez@barbershop.com` / `Barber@123`
- `chris.lee@barbershop.com` / `Barber@123`

⚠️ **Change these passwords in production!**

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT.md) - VPS deployment with Docker
- [API Documentation](#api-documentation) - REST API endpoints

## 🛠️ Tech Stack

**Frontend:** React 18, React Router, Date-fns  
**Backend:** Node.js, Express, PostgreSQL  
**Security:** JWT, Bcrypt, Helmet, Rate Limiting  
**DevOps:** Docker, Docker Compose, Nginx

## 📄 License

MIT License - see LICENSE file for details
