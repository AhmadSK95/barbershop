# Deploy to AWS Instance

## Prerequisites
- AWS EC2 instance running
- SSH access to the instance
- Docker and Docker Compose installed on the instance
- Git installed on the instance

## Deployment Steps

### 1. SSH into your AWS instance

```bash
# Replace with your actual values
ssh -i /path/to/your-key.pem ubuntu@YOUR_AWS_IP_ADDRESS
```

### 2. Navigate to the application directory (or clone if first time)

```bash
# If already cloned, go to the directory
cd /path/to/barbershop

# OR if first time deployment, clone the repo
git clone https://github.com/AhmadSK95/barbershop.git
cd barbershop
```

### 3. Pull the latest changes

```bash
git pull origin main
```

### 4. Update environment variables

```bash
# Make sure .env file exists in the root directory with production values
# Copy from example if needed:
cp .env.production .env

# Edit the .env file with your production values:
nano .env
```

Required environment variables:
- Database credentials
- JWT secrets
- AWS credentials (for SMS)
- Email configuration (SMTP)
- Domain URLs

### 5. Stop existing containers

```bash
docker-compose down
```

### 6. Rebuild and start the containers

```bash
# Rebuild images with latest code
docker-compose build --no-cache

# Start all services
docker-compose up -d

# Check if services are running
docker-compose ps
```

### 7. Run database migration (if needed)

```bash
# Check if database needs migration
docker-compose exec backend npm run migrate
```

### 8. Verify deployment

```bash
# Check logs
docker-compose logs -f

# Test the application
curl http://localhost:5001/health
```

### 9. Access the application

Your application should now be accessible at:
- Frontend: http://YOUR_DOMAIN or http://YOUR_AWS_IP
- Backend API: http://YOUR_DOMAIN:5001 or http://YOUR_AWS_IP:5001

## Key Changes in This Deployment

1. ✅ Fixed duplicate "Any Available" barber issue
2. ✅ Added barber-specific service filtering:
   - Master Barbers: 7 services (Master haircut + 6 common services)
   - Senior Barbers: 7 services (Senior haircut + 6 common services)
   - Any Available: All 8 services
3. ✅ Added new API endpoints:
   - `GET /api/bookings/barbers` - Get all barbers
   - `GET /api/bookings/barber-services/:barberId` - Get services by barber
4. ✅ Updated frontend to fetch barbers and services from API
5. ✅ Fixed database constraints to prevent duplicates

## Rollback (if needed)

```bash
# Stop containers
docker-compose down

# Checkout previous commit
git log --oneline -10  # Find the commit hash
git checkout <previous-commit-hash>

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### Containers won't start
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Check if ports are in use
sudo lsof -i :80
sudo lsof -i :5001
sudo lsof -i :5432
```

### Database connection errors
```bash
# Verify database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Verify environment variables
docker-compose exec backend env | grep DB_
```

### Frontend not loading
```bash
# Check if frontend container is running
docker-compose ps frontend

# Check nginx logs
docker-compose logs frontend

# Verify API URL is correct
docker-compose exec frontend env | grep REACT_APP_API_URL
```

## Quick Deployment Script

Save this as `deploy.sh` on your AWS instance:

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest changes
echo "📥 Pulling latest code..."
git pull origin main

# Stop containers
echo "🛑 Stopping containers..."
docker-compose down

# Rebuild images
echo "🔨 Building images..."
docker-compose build --no-cache

# Start containers
echo "▶️  Starting containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services..."
sleep 10

# Check status
echo "✅ Checking status..."
docker-compose ps

echo "🎉 Deployment complete!"
echo "📊 View logs: docker-compose logs -f"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Then run:
```bash
./deploy.sh
```
