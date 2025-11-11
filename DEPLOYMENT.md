# Barbershop Booking System - Deployment Guide

## Prerequisites

- VPS with Ubuntu 20.04+ or Debian 11+
- Root or sudo access
- Domain name (optional but recommended)
- SMTP email service (Gmail, SendGrid, Mailgun, etc.)

## 1. Server Setup

### Update system packages
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (replace $USER with your username)
sudo usermod -aG docker $USER

# Logout and login again for group changes to take effect
```

### Install Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

## 2. Clone or Upload Application

### Option A: Using Git
```bash
cd /home/$USER
git clone <your-repo-url> barbershop
cd barbershop
```

### Option B: Upload files
```bash
# Use SCP or SFTP to upload the barbershop directory
scp -r /path/to/barbershop user@your-server-ip:/home/user/
```

## 3. Configure Environment Variables

### Copy and edit environment file
```bash
cd /home/$USER/barbershop
cp .env.production .env
nano .env
```

### Update the following values in `.env`:

```bash
# Database - Use strong passwords!
DB_NAME=barbershop_db
DB_USER=barbershop_user
DB_PASSWORD=your_very_secure_database_password_here

# JWT Secrets - Generate random 64-character strings
JWT_SECRET=generate_a_random_64_character_string_here
JWT_REFRESH_SECRET=generate_another_random_64_character_string_here

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
EMAIL_FROM=noreply@yourdomain.com

# Application URLs (replace with your domain)
FRONTEND_URL=http://your-domain.com
REACT_APP_API_URL=http://your-domain.com/api

# Admin Credentials
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourSecureAdminPassword123!
```

### Generate secure secrets
```bash
# Generate JWT secrets
openssl rand -hex 32  # Use for JWT_SECRET
openssl rand -hex 32  # Use for JWT_REFRESH_SECRET
```

## 4. Email Configuration

### For Gmail:
1. Enable 2-Factor Authentication on your Google account
2. Go to: https://myaccount.google.com/apppasswords
3. Generate an "App Password" for Mail
4. Use this app password in `EMAIL_PASSWORD`

### For SendGrid (Free tier: 100 emails/day):
```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key
```

### For Mailgun:
```bash
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-domain.com
EMAIL_PASSWORD=your_mailgun_smtp_password
```

## 5. Deploy with Docker Compose

### Build and start all services
```bash
cd /home/$USER/barbershop
docker-compose up -d --build
```

### Check if services are running
```bash
docker-compose ps
```

You should see:
- `barbershop_postgres` - PostgreSQL database
- `barbershop_backend` - Node.js API
- `barbershop_frontend` - Nginx with React app

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## 6. Database Initialization

The database will be automatically initialized when the backend starts. The migration script will:
- Create all necessary tables
- Seed services, addons, and barbers
- Create the default admin user

### Verify database
```bash
# Connect to PostgreSQL
docker exec -it barbershop_postgres psql -U barbershop_user -d barbershop_db

# List tables
\dt

# Check admin user
SELECT email, role FROM users WHERE role = 'admin';

# Exit
\q
```

## 7. Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

## 8. Set Up Domain and SSL (Optional but Recommended)

### Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Update nginx configuration for SSL
Create a new file: `/home/$USER/barbershop/nginx-ssl.conf`

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

### Get SSL certificate
```bash
# Stop the frontend container temporarily
docker-compose stop frontend

# Get certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Update docker-compose.yml to mount SSL certificates
# Add to frontend service:
#   volumes:
#     - /etc/letsencrypt:/etc/letsencrypt:ro

# Restart services
docker-compose up -d
```

## 9. Maintenance Commands

### View logs
```bash
docker-compose logs -f [service-name]
```

### Restart services
```bash
docker-compose restart
docker-compose restart backend  # Restart specific service
```

### Stop services
```bash
docker-compose stop
```

### Update application
```bash
cd /home/$USER/barbershop
git pull  # or upload new files
docker-compose down
docker-compose up -d --build
```

### Backup database
```bash
# Create backup
docker exec barbershop_postgres pg_dump -U barbershop_user barbershop_db > backup_$(date +%Y%m%d).sql

# Restore backup
docker exec -i barbershop_postgres psql -U barbershop_user barbershop_db < backup_20241031.sql
```

### Clean up Docker resources
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

## 10. Monitoring and Health Checks

### Check API health
```bash
curl http://localhost:5000/health
```

### Monitor resource usage
```bash
docker stats
```

### Set up log rotation
```bash
# Edit docker-compose.yml and add to each service:
#   logging:
#     driver: "json-file"
#     options:
#       max-size: "10m"
#       max-file: "3"
```

## 11. Default Credentials

After deployment, you can log in with:

**Admin Account:**
- Email: Value from `ADMIN_EMAIL` in .env
- Password: Value from `ADMIN_PASSWORD` in .env

**Sample Barber Accounts:**
- mike.johnson@barbershop.com / Barber@123
- alex.rodriguez@barbershop.com / Barber@123  
- chris.lee@barbershop.com / Barber@123

**⚠️ IMPORTANT:** Change all default passwords immediately after first login!

## 12. Troubleshooting

### Backend won't start
```bash
# Check backend logs
docker-compose logs backend

# Common issues:
# - Database connection failed: Check DB_* environment variables
# - Port already in use: Change PORT in docker-compose.yml
```

### Frontend can't connect to backend
```bash
# Verify REACT_APP_API_URL in .env matches your setup
# Restart frontend after changing env vars
docker-compose restart frontend
```

### Email not sending
```bash
# Check email credentials in .env
# Test SMTP connection manually
# For Gmail: Ensure "Less secure app access" or use App Password
```

### Database connection issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Verify credentials match in .env and docker-compose.yml
```

## 13. Security Best Practices

1. **Use strong passwords** for all accounts and database
2. **Enable SSL/HTTPS** for production
3. **Keep Docker and packages updated**
4. **Regular backups** of database
5. **Monitor logs** for suspicious activity
6. **Use firewall** (ufw) to restrict access
7. **Change default admin password** immediately
8. **Use environment-specific secrets**, never commit .env files

## 14. Performance Optimization

### For production, consider:

1. **Add Redis for sessions**
2. **Enable database connection pooling** (already configured)
3. **Set up CDN** for static assets
4. **Add load balancer** for multiple instances
5. **Enable nginx caching**
6. **Monitor with Prometheus/Grafana**

## Support

For issues or questions, check the logs first:
```bash
docker-compose logs -f
```

Common URLs:
- Frontend: `http://your-domain.com`
- Backend API: `http://your-domain.com/api`
- Health Check: `http://your-domain.com/api/health`
