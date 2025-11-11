# 🔧 Troubleshooting Guide

## Issues Found

### ❌ Issue 1: Port 5000 is Already in Use (macOS)

**Problem:** macOS uses port 5000 for AirPlay Receiver (Control Center)

**Solution - Option A: Change Backend Port**

Edit `backend/.env`:
```env
PORT=5001  # Change from 5000 to 5001
```

Then update your API calls to use `http://localhost:5001`

**Solution - Option B: Disable AirPlay Receiver**

1. Open **System Preferences** → **Sharing**
2. Uncheck **AirPlay Receiver**
3. Port 5000 will be freed

---

### ❌ Issue 2: PostgreSQL Not Installed

**Problem:** PostgreSQL is not installed on your system

**Solution - Option A: Use Docker (EASIEST - RECOMMENDED)**

No PostgreSQL installation needed! Docker handles everything:

```bash
# From project root
cd /Users/moenuddeenahmadshaik/Desktop/barbershop

# Copy and edit environment file
cp .env.production .env

# Generate secrets
openssl rand -hex 32  # Copy for JWT_SECRET
openssl rand -hex 32  # Copy for JWT_REFRESH_SECRET

# Edit .env (minimal required):
nano .env
```

**Minimal .env for Docker:**
```env
DB_PASSWORD=secure_password_123
JWT_SECRET=<paste_first_secret>
JWT_REFRESH_SECRET=<paste_second_secret>

# Email optional for demo
EMAIL_USER=demo@example.com
EMAIL_PASSWORD=demo
```

**Start with Docker:**
```bash
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Access application
# Frontend: http://localhost
# Backend: http://localhost:5000/health (or 5001 if you changed port)
```

**Solution - Option B: Install PostgreSQL Locally**

```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Verify it's running
brew services list | grep postgresql

# Create database
psql postgres -c "CREATE DATABASE barbershop_db;"
psql postgres -c "CREATE USER barbershop_user WITH PASSWORD 'barbershop123';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE barbershop_db TO barbershop_user;"
psql postgres -c "ALTER DATABASE barbershop_db OWNER TO barbershop_user;"

# Test connection
psql -U barbershop_user -d barbershop_db -c "SELECT version();"
```

---

## ✅ Recommended Setup (Docker)

This is the **easiest and most reliable** way to run the application:

### Step 1: Install Docker

Download and install Docker Desktop:
- macOS: https://docs.docker.com/desktop/install/mac-install/

### Step 2: Configure Environment

```bash
cd /Users/moenuddeenahmadshaik/Desktop/barbershop

# Copy template
cp .env.production .env

# Generate secure secrets
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"

# Edit .env with above values
nano .env
```

### Step 3: Start Application

```bash
docker-compose up -d --build
```

Wait 30 seconds for database initialization.

### Step 4: Verify

```bash
# Check services are running
docker-compose ps

# Should show 3 services: postgres, backend, frontend

# Test backend
curl http://localhost:5000/health

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@barbershop.com","password":"Admin@123456"}'
```

### Step 5: Access Application

- **Frontend:** http://localhost
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/health

---

## 🐛 Common Errors

### Error: "Cannot connect to database"

**If using local PostgreSQL:**
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start it if not running
brew services start postgresql@15

# Verify credentials in backend/.env match database
```

**If using Docker:**
```bash
# Check if postgres container is running
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres

# Restart if needed
docker-compose restart postgres
```

---

### Error: "Port already in use"

**For port 5000:**
```bash
# Option 1: Kill the process
lsof -ti:5000 | xargs kill -9

# Option 2: Change backend port in backend/.env
PORT=5001
```

**For port 3000 (frontend):**
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

---

### Error: "Module not found"

**Backend:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

**Frontend:**
```bash
cd /Users/moenuddeenahmadshaik/Desktop/barbershop
rm -rf node_modules package-lock.json
npm install
```

---

### Error: "Failed to send email"

Email is **optional** for demo. To test without email:

1. Register a user
2. Manually verify in database:
   ```bash
   # If using Docker
   docker exec -it barbershop_postgres psql -U barbershop_user -d barbershop_db

   # Verify user
   UPDATE users SET is_verified = true WHERE email = 'user@example.com';

   # Exit
   \q
   ```

3. Or use admin account (pre-verified):
   - Email: admin@barbershop.com
   - Password: Admin@123456

---

## 🎯 Quick Start Commands

### Docker Setup (Recommended)

```bash
# From project root
cd /Users/moenuddeenahmadshaik/Desktop/barbershop

# Setup environment
cp .env.production .env
nano .env  # Edit with your values

# Start everything
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop everything
docker-compose down
```

### Local Setup

```bash
# Terminal 1: Backend
cd /Users/moenuddeenahmadshaik/Desktop/barbershop/backend
npm install
npm run migrate  # Only first time
npm run dev

# Terminal 2: Frontend
cd /Users/moenuddeenahmadshaik/Desktop/barbershop
npm install
npm start
```

---

## 📊 Verify Setup

### Check Backend

```bash
# Health check
curl http://localhost:5000/health

# Expected response:
# {"status":"ok","timestamp":"2024-10-31T..."}
```

### Check Database

**Local PostgreSQL:**
```bash
psql -U barbershop_user -d barbershop_db

# List tables
\dt

# Check users
SELECT email, role, is_verified FROM users;

# Exit
\q
```

**Docker:**
```bash
docker exec -it barbershop_postgres psql -U barbershop_user -d barbershop_db

# Same commands as above
```

### Test API

```bash
# Login as admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@barbershop.com","password":"Admin@123456"}'

# Should return access token
```

---

## 🆘 Still Having Issues?

### Check Logs

**Docker:**
```bash
docker-compose logs backend
docker-compose logs postgres
docker-compose logs frontend
```

**Local:**
```bash
# Backend logs are in terminal where you ran npm run dev
# Check for error messages
```

### Reset Everything

**Docker:**
```bash
# Stop and remove everything
docker-compose down -v

# Remove all containers and volumes
docker system prune -a --volumes

# Start fresh
docker-compose up -d --build
```

**Local:**
```bash
# Drop and recreate database
psql postgres -c "DROP DATABASE IF EXISTS barbershop_db;"
psql postgres -c "CREATE DATABASE barbershop_db;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE barbershop_db TO barbershop_user;"

# Re-run migrations
cd backend
npm run migrate
```

---

## 💡 Pro Tips

1. **Use Docker** for simplest setup - no database installation needed
2. **Change port 5000** on macOS to avoid AirPlay conflict
3. **Email is optional** for testing - use admin account
4. **Check logs first** when something doesn't work
5. **Reset database** if migrations fail

---

## 📖 Additional Resources

- **Setup Guide:** See `SETUP.md`
- **Demo Flow:** See `DEMO_FLOW.md`
- **API Docs:** See `API_DOCS.md`
- **Deployment:** See `DEPLOYMENT.md`
