# Subdomain Setup Guide for Balkan Barbers

This guide walks you through setting up a subdomain (e.g., `new.balkanbarbers.com`) to test your new booking system before switching the main domain.

## Prerequisites

- Access to your domain registrar (where you bought balkanbarbers.com)
- AWS EC2 instance running at `34.226.11.9`
- SSH access to the server

---

## Phase 1: DNS Configuration (15 minutes)

### Step 1: Add DNS Records

Log into your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add:

**Option A: Testing Subdomain**
```
Type: A Record
Host: new
Value: 34.226.11.9
TTL: 600 (10 minutes)
```

This creates: `new.balkanbarbers.com` → `34.226.11.9`

**Optional: API Subdomain**
```
Type: A Record
Host: api
Value: 34.226.11.9
TTL: 600
```

This creates: `api.balkanbarbers.com` → `34.226.11.9`

### Step 2: Verify DNS Propagation (5-30 minutes)

Wait for DNS to propagate, then test:

```bash
# Check if subdomain resolves
nslookup new.balkanbarbers.com

# Or use dig
dig new.balkanbarbers.com

# Expected output: Should show 34.226.11.9
```

Online tools:
- https://www.whatsmydns.net/
- Search for `new.balkanbarbers.com` - should show `34.226.11.9`

---

## Phase 2: SSL Certificate Setup (20 minutes)

### Step 1: SSH into Server

```bash
ssh -i ~/Desktop/barbershop/barbershop-key.pem ubuntu@34.226.11.9
```

### Step 2: Install Certbot (Let's Encrypt)

```bash
# Update packages
sudo apt update

# Install Certbot and Nginx plugin
sudo apt install certbot python3-certbot-nginx -y

# Install Nginx if not already installed
sudo apt install nginx -y
```

### Step 3: Configure Nginx

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/barbershop
```

Paste this configuration:

```nginx
# Frontend server
server {
    listen 80;
    server_name new.balkanbarbers.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Proxy to frontend container
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API server
server {
    listen 80;
    server_name api.balkanbarbers.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Proxy to backend container
    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' 'https://new.balkanbarbers.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```

Enable the configuration:

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/barbershop /etc/nginx/sites-enabled/

# Remove default config if it conflicts
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 4: Obtain SSL Certificates

```bash
# Get certificates for both subdomains
sudo certbot --nginx -d new.balkanbarbers.com -d api.balkanbarbers.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose "Redirect" option (forces HTTPS)
```

Certbot will automatically:
- Obtain certificates
- Update Nginx config to use HTTPS
- Set up auto-renewal

### Step 5: Verify Auto-Renewal

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

---

## Phase 3: Update Environment Variables (10 minutes)

### Step 1: Update Backend Environment

```bash
# SSH into server
cd /home/ubuntu/barbershop

# Edit .env file
nano .env
```

Update these values:

```env
# Application URLs
FRONTEND_URL=https://new.balkanbarbers.com
REACT_APP_API_URL=https://api.balkanbarbers.com

# AWS SES (if using custom domain email)
AWS_SES_FROM_EMAIL=noreply@balkanbarbers.com
ROOT_EMAIL=admin@balkanbarbers.com

# Email Configuration
EMAIL_FROM=noreply@balkanbarbers.com
```

### Step 2: Update Frontend Build

```bash
# On your local machine
cd ~/Desktop/barbershop

# Create .env file for production build
cat > .env << EOF
REACT_APP_API_URL=https://api.balkanbarbers.com
EOF

# Rebuild frontend
npm run build

# Commit changes
git add .env build/
git commit -m "Update production URLs for subdomain"
git push origin main
```

### Step 3: Restart Containers

```bash
# SSH into server
ssh -i ~/Desktop/barbershop/barbershop-key.pem ubuntu@34.226.11.9

cd /home/ubuntu/barbershop

# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose down
docker compose up -d --build

# Check logs
docker compose logs -f
```

---

## Phase 4: AWS SES Production Access (1-2 days)

### Step 1: Request Production Access

1. Go to AWS SES Console: https://console.aws.amazon.com/ses/
2. Click "Request production access"
3. Fill out form:
   - **Use case**: Transactional emails (booking confirmations)
   - **Website URL**: https://new.balkanbarbers.com
   - **Email volume**: Estimate daily emails (e.g., 50-100/day)
   - **Describe use case**: "Send booking confirmations, password resets, and job applications for barbershop booking system"
   - **Compliance**: Explain you only email customers who book appointments

### Step 2: Verify Domain for SES (Optional but Recommended)

```bash
# In AWS SES Console:
# 1. Go to "Verified identities"
# 2. Click "Create identity"
# 3. Choose "Domain"
# 4. Enter: balkanbarbers.com
# 5. Enable DKIM signing
```

You'll get DNS records to add (DKIM, SPF, DMARC):

```
Type: TXT
Host: _amazonses.balkanbarbers.com
Value: [provided by AWS]

Type: CNAME (3 records for DKIM)
Host: [provided by AWS]
Value: [provided by AWS]
```

Add these to your domain registrar.

### Step 3: Update Email Configuration

After domain verification:

```bash
# SSH into server
cd /home/ubuntu/barbershop
nano .env
```

Update:

```env
AWS_SES_FROM_EMAIL=noreply@balkanbarbers.com
ROOT_EMAIL=admin@balkanbarbers.com
```

Restart containers:

```bash
docker compose restart backend
```

---

## Phase 5: Testing Checklist (30 minutes)

### Frontend Tests

Visit `https://new.balkanbarbers.com`:

- [ ] ✅ HTTPS works (green padlock)
- [ ] ✅ Homepage loads correctly
- [ ] ✅ All images load
- [ ] ✅ Navigation works
- [ ] ✅ Contact page displays correctly
- [ ] ✅ Careers page works

### Authentication Tests

- [ ] ✅ Register new account
- [ ] ✅ Receive verification email
- [ ] ✅ Verify email (click link)
- [ ] ✅ Login works
- [ ] ✅ Password reset works
- [ ] ✅ Receive password reset email

### Booking Tests

- [ ] ✅ View available barbers
- [ ] ✅ Select service and addon
- [ ] ✅ Choose date/time
- [ ] ✅ Complete booking
- [ ] ✅ Receive booking confirmation email
- [ ] ✅ Receive SMS confirmation (if enabled)

### Admin Tests

- [ ] ✅ Admin login works
- [ ] ✅ View all bookings
- [ ] ✅ Manage users
- [ ] ✅ Update configuration

### Performance Tests

```bash
# Check response times
curl -o /dev/null -s -w "Total time: %{time_total}s\n" https://new.balkanbarbers.com

# Expected: < 2 seconds
```

---

## Phase 6: Monitoring Setup (15 minutes)

### Step 1: Enable Docker Stats

```bash
# SSH into server
cd /home/ubuntu/barbershop

# Create monitoring script
cat > monitor.sh << 'EOF'
#!/bin/bash
echo "=== Docker Container Stats ==="
docker compose ps

echo ""
echo "=== Resource Usage ==="
docker stats --no-stream

echo ""
echo "=== Disk Usage ==="
df -h

echo ""
echo "=== Recent Logs ==="
docker compose logs --tail=20 backend
EOF

chmod +x monitor.sh

# Run monitoring
./monitor.sh
```

### Step 2: Set Up Basic Alerting (Optional)

Install monitoring tools:

```bash
# Install monitoring tools
sudo apt install htop iotop -y

# Monitor in real-time
htop
```

---

## Phase 7: Soft Launch (1-2 weeks)

### Week 1: Internal Testing

1. **Share with team/friends**: Send `https://new.balkanbarbers.com` to trusted users
2. **Monitor daily**: Check logs for errors
3. **Test bookings**: Make real appointments
4. **Verify emails**: Confirm all notifications arrive

### Week 2: Limited Public Access

1. **Add to social media**: Post link to new booking system
2. **Keep Squarespace active**: Old site still works
3. **Dual booking management**: Check both systems
4. **Gather feedback**: Fix any reported issues

### Success Metrics

- [ ] Zero critical bugs for 7 consecutive days
- [ ] All emails delivered successfully
- [ ] Page load time < 3 seconds
- [ ] 100% uptime
- [ ] Positive user feedback

---

## Phase 8: Full Launch (When Ready)

### Step 1: Update Main Domain DNS

In your domain registrar, update the **main** A record:

```
Type: A Record
Host: @ (or blank)
Value: 34.226.11.9
TTL: 600
```

This points `balkanbarbers.com` → `34.226.11.9`

### Step 2: Update SSL Certificate

```bash
# SSH into server
sudo certbot --nginx -d balkanbarbers.com -d www.balkanbarbers.com

# Update Nginx config to include main domain
sudo nano /etc/nginx/sites-available/barbershop
```

Add to server_name:

```nginx
server_name balkanbarbers.com www.balkanbarbers.com new.balkanbarbers.com;
```

### Step 3: Update Environment Variables

```bash
# Update .env
FRONTEND_URL=https://balkanbarbers.com
REACT_APP_API_URL=https://api.balkanbarbers.com
```

### Step 4: Rebuild and Deploy

```bash
# Rebuild with new URLs
docker compose down
docker compose up -d --build
```

### Step 5: Monitor for 2-4 Weeks

Keep Squarespace active as backup. After stable operation, cancel Squarespace.

---

## Troubleshooting

### DNS Not Resolving

```bash
# Check DNS
nslookup new.balkanbarbers.com

# Clear local DNS cache (Mac)
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# Wait up to 24 hours for full propagation
```

### SSL Certificate Errors

```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal

# Check Nginx config
sudo nginx -t
```

### Email Not Sending

```bash
# Check SES sandbox status
aws ses get-account-sending-enabled

# View backend logs
docker compose logs backend | grep -i email

# Test email manually
node backend/test-email-booking.js
```

### Container Not Starting

```bash
# Check logs
docker compose logs backend
docker compose logs frontend

# Restart containers
docker compose restart

# Rebuild if needed
docker compose down
docker compose up -d --build
```

---

## Quick Reference Commands

```bash
# SSH into server
ssh -i ~/Desktop/barbershop/barbershop-key.pem ubuntu@34.226.11.9

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Check container status
docker compose ps

# Restart services
docker compose restart

# Full rebuild
docker compose down && docker compose up -d --build

# Check Nginx status
sudo systemctl status nginx

# Reload Nginx config
sudo nginx -t && sudo systemctl reload nginx

# View SSL certificates
sudo certbot certificates

# Monitor resources
htop
docker stats
```

---

## Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| DNS Configuration | 15 min + propagation | ⏳ Pending |
| SSL Setup | 20 min | ⏳ Pending |
| Environment Config | 10 min | ⏳ Pending |
| AWS SES Request | 1-2 days | ⏳ Pending |
| Testing | 30 min | ⏳ Pending |
| Monitoring Setup | 15 min | ⏳ Pending |
| Soft Launch | 1-2 weeks | ⏳ Pending |
| Full Launch | When ready | ⏳ Pending |

**Total Hands-On Time**: ~2 hours  
**Total Calendar Time**: 2-3 weeks (including AWS approval, testing)

---

## Next Steps

1. **Identify your domain registrar** (where you manage balkanbarbers.com)
2. **Add DNS A record** for `new.balkanbarbers.com` → `34.226.11.9`
3. **Follow Phase 2** (SSL setup) once DNS propagates
4. **Start soft launch testing**

Let me know when you've completed Phase 1 (DNS) and I'll help with the SSL setup!
