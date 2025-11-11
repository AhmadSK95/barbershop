# Quick Setup Guide

## \ud83d\ude80 Get Started in 5 Minutes

### Option 1: Docker (Easiest - Recommended)

#### 1. Prerequisites
- Install Docker: https://docs.docker.com/get-docker/
- Install Docker Compose: Comes with Docker Desktop

#### 2. Configure
```bash
# Copy environment file
cp .env.production .env

# Generate secure secrets
openssl rand -hex 32  # Copy for JWT_SECRET
openssl rand -hex 32  # Copy for JWT_REFRESH_SECRET

# Edit .env file
nano .env
```

**Minimum required in .env:**
```env
DB_PASSWORD=your_secure_password
JWT_SECRET=<paste_first_secret_here>
JWT_REFRESH_SECRET=<paste_second_secret_here>

# For email (use Gmail for testing)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
```

#### 3. Start Application
```bash
docker-compose up -d --build
```

#### 4. Access
- Frontend: http://localhost
- Backend API: http://localhost:5000
- Admin login: admin@barbershop.com / Admin@123456

**Done! \ud83c\udf89**

---

### Option 2: Local Development

#### 1. Prerequisites
- Node.js 18+ (https://nodejs.org/)
- PostgreSQL 15+ (https://www.postgresql.org/download/)

#### 2. Database Setup
```bash
# Create database
psql -U postgres
CREATE DATABASE barbershop_db;
CREATE USER barbershop_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE barbershop_db TO barbershop_user;
\q
```

#### 3. Backend Setup
```bash
cd backend
npm install

# Copy and configure
cp .env.example .env
nano .env

# Set these in .env:
# DB_PASSWORD=your_password
# JWT_SECRET=<generate with: openssl rand -hex 32>
# JWT_REFRESH_SECRET=<generate with: openssl rand -hex 32>
# EMAIL_USER=your_email@gmail.com
# EMAIL_PASSWORD=your_gmail_app_password

# Initialize database
npm run migrate

# Start backend
npm run dev
```

Backend runs on http://localhost:5000

#### 4. Frontend Setup
```bash
# From project root
npm install
npm start
```

Frontend runs on http://localhost:3000

**Done! \ud83c\udf89**

---

## \ud83d\udce7 Gmail Setup (For Email Features)

1. Go to your Google Account
2. Enable 2-Factor Authentication
3. Visit: https://myaccount.google.com/apppasswords
4. Generate App Password for "Mail"
5. Copy the 16-character password
6. Use it as `EMAIL_PASSWORD` in .env

---

## \u2705 Verify Installation

### Check Backend
```bash
curl http://localhost:5000/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Check Frontend
Open browser: http://localhost:3000 or http://localhost

### Login
- Admin: admin@barbershop.com / Admin@123456
- Barber: mike.johnson@barbershop.com / Barber@123

---

## \ud83c\udfdb\ufe0f Database Access

### Docker
```bash
docker exec -it barbershop_postgres psql -U barbershop_user -d barbershop_db
```

### Local
```bash
psql -U barbershop_user -d barbershop_db
```

Useful commands:
```sql
\dt              -- List tables
SELECT * FROM users;
SELECT * FROM bookings;
\q               -- Quit
```

---

## \ud83d\udee0\ufe0f Common Issues

### Port Already in Use
**Error:** `Port 5000 is already in use`
```bash
# Find and kill the process
lsof -ti:5000 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :5000   # Windows
```

### Database Connection Failed
- Check PostgreSQL is running
- Verify credentials in .env match database
- For Docker: `docker-compose logs postgres`

### Email Not Sending
- Verify Gmail App Password (not regular password)
- Check EMAIL_* variables in .env
- Test with: curl http://localhost:5000/api/auth/forgot-password

### Frontend Can't Connect to Backend
- Check backend is running: `curl http://localhost:5000/health`
- Verify proxy in package.json: `"proxy": "http://localhost:5000"`
- Clear browser cache

---

## \ud83d\udcdd Next Steps

1. **Change default passwords** for security
2. **Configure your domain** if deploying to VPS (see DEPLOYMENT.md)
3. **Customize services** in database or admin panel
4. **Set up SSL** for production (see DEPLOYMENT.md)
5. **Configure backups** for database

---

## \ud83d\udcda Full Documentation

- [README.md](./README.md) - Complete project documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide
- Backend API docs coming soon!

---

## \ud83d\udc4d Quick Commands Reference

```bash
# Start everything (Docker)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose stop

# Restart backend
docker-compose restart backend

# Database backup
docker exec barbershop_postgres pg_dump -U barbershop_user barbershop_db > backup.sql

# Clean up
docker-compose down
docker system prune -a
```

---

Need help? Check logs first:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```
