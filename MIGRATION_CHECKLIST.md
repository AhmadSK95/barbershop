# Migration Checklist - Squarespace to Custom Site

## Current Status
✅ **Application Built**: Full-stack barbershop booking system  
✅ **Deployed to AWS**: Running on EC2 at http://34.226.11.9  
✅ **Database**: PostgreSQL with all data  
✅ **Email**: AWS SES configured (sandbox mode)  
✅ **SMS**: Twilio configured  
⚠️ **Domain**: Still on Squarespace  
⚠️ **SSL**: Not configured  
⚠️ **Production Email**: SES still in sandbox  

---

## Phase 1: Domain & DNS Setup

### 1.1 Domain Transfer/Configuration
**Current Domain**: balkanbarbershop.com (on Squarespace)

**Options**:
- [ ] **Option A**: Transfer domain from Squarespace to AWS Route 53
  - Export domain from Squarespace
  - Transfer to Route 53 (takes 5-7 days)
  - Cost: $12/year for .com
  
- [ ] **Option B**: Keep domain on Squarespace, update DNS only
  - Update DNS A record to point to `34.226.11.9`
  - Faster (propagation in 24-48 hours)
  - Keep domain management on Squarespace

**Recommended**: Option B (faster, less disruption)

### 1.2 DNS Records Configuration

**Required DNS Records**:
```
Type    Name                    Value                           TTL
----    ----                    -----                           ---
A       @                       34.226.11.9                     3600
A       www                     34.226.11.9                     3600
CNAME   www                     balkanbarbershop.com            3600
```

**For AWS SES Email Verification** (if using custom domain):
```
Type    Name                            Value                           Purpose
----    ----                            -----                           -------
TXT     _amazonses                      [SES Verification Token]        Domain verification
CNAME   [ses-dkim-1]                    [ses-dkim-1].dkim.amazonses     DKIM signing
CNAME   [ses-dkim-2]                    [ses-dkim-2].dkim.amazonses     DKIM signing
CNAME   [ses-dkim-3]                    [ses-dkim-3].dkim.amazonses     DKIM signing
```

### 1.3 Subdomain for API (Optional but Recommended)
```
Type    Name                    Value                           Purpose
----    ----                    -----                           -------
A       api                     34.226.11.9                     Backend API
```

**Actions Required**:
- [ ] Access Squarespace DNS settings
- [ ] Add/update A records for @ and www
- [ ] Verify DNS propagation (`nslookup balkanbarbershop.com`)
- [ ] Wait 24-48 hours for full propagation

---

## Phase 2: SSL Certificate Setup

### 2.1 Install Certbot on AWS EC2
```bash
# SSH into EC2
ssh -i barbershop-key.pem ubuntu@34.226.11.9

# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### 2.2 Configure Nginx for SSL

**Current Setup**: Docker Nginx serving on port 80  
**Goal**: Add SSL termination with Certbot

**Step 1**: Install Nginx on host (outside Docker)
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
```

**Step 2**: Configure Nginx as reverse proxy
```bash
sudo nano /etc/nginx/sites-available/balkanbarbershop
```

**Nginx Configuration**:
```nginx
# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name balkanbarbershop.com www.balkanbarbershop.com;
    
    # Certbot validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name balkanbarbershop.com www.balkanbarbershop.com;
    
    # SSL certificates (Certbot will add these)
    ssl_certificate /etc/letsencrypt/live/balkanbarbershop.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/balkanbarbershop.com/privkey.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Frontend (React app)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Step 3**: Enable site and obtain SSL certificate
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/balkanbarbershop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Obtain SSL certificate
sudo certbot --nginx -d balkanbarbershop.com -d www.balkanbarbershop.com --email ahmad2609.as@gmail.com --agree-tos --non-interactive
```

**Step 4**: Auto-renewal setup
```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Certbot will automatically set up cron job for renewal
```

**Actions Required**:
- [ ] Wait for DNS propagation (Phase 1)
- [ ] Install Nginx on EC2 host
- [ ] Create Nginx reverse proxy config
- [ ] Obtain Let's Encrypt SSL certificate
- [ ] Test HTTPS access
- [ ] Verify auto-renewal

---

## Phase 3: AWS SES Production Access

### 3.1 Current SES Status
**Mode**: Sandbox  
**Limitation**: Can only send to verified email addresses  
**Sender**: ahmad2609.as@gmail.com

### 3.2 Request Production Access

**AWS SES Dashboard**:
1. Navigate to: https://console.aws.amazon.com/ses/
2. Click "Request production access" button
3. Fill out form:

**Required Information**:
```
Use Case: Transactional
Website URL: https://balkanbarbershop.com
Mail Type: Transactional (booking confirmations)
Sending Rate: ~50 emails/day
Bounce Rate: Expected < 2%
Complaint Rate: Expected < 0.1%

Description:
"We operate a barbershop booking system that sends transactional emails:
- Booking confirmations to customers
- Appointment reminders
- Barber notifications
- Password reset emails

All emails are opt-in and transactional in nature. We have implemented:
- Email validation
- Bounce handling
- Proper unsubscribe mechanisms
- DKIM signing"

Compliance Statement:
"We comply with CAN-SPAM Act. All emails are transactional, recipients
have opted in through our booking system, and we maintain proper records."
```

4. Submit request
5. **Wait 24-48 hours** for approval

**Actions Required**:
- [ ] Submit SES production access request
- [ ] Wait for approval
- [ ] Test sending to unverified emails
- [ ] Monitor bounce/complaint rates

### 3.3 Domain Verification (After Production Access)

**Option A: Use Custom Domain** (balkanbarbershop.com)
```bash
# In AWS SES Console
1. Add domain: balkanbarbershop.com
2. Get verification tokens
3. Add DNS TXT record (see Phase 1.2)
4. Add DKIM CNAME records
5. Wait for verification (~10 minutes)
```

**Option B: Continue with Gmail** (ahmad2609.as@gmail.com)
- Already verified
- No DNS changes needed
- Less professional but works

**Recommended**: Option A for production

**Actions Required**:
- [ ] Choose email domain (custom vs Gmail)
- [ ] Add DNS records if using custom domain
- [ ] Verify domain in SES
- [ ] Update backend EMAIL_FROM environment variable

---

## Phase 4: AWS SNS Configuration (Optional)

**Current Setup**: Not using SNS  
**Use Cases**: Could use SNS for:
- Email/SMS multi-channel notifications
- Topic-based subscriptions
- Dead letter queues for failed deliveries

**Decision**: ⚠️ **Not required for launch** - currently using SES (email) + Twilio (SMS) directly

**If Implementing SNS**:
- [ ] Create SNS topics (booking-notifications, reminders)
- [ ] Subscribe SES email endpoint
- [ ] Subscribe Twilio webhook endpoint
- [ ] Update backend to publish to SNS instead of direct calls
- [ ] Add retry logic and DLQ

**Recommendation**: **Skip for now**, implement later if needed for scale

---

## Phase 5: Environment & Configuration Updates

### 5.1 Update Backend Environment Variables

**File**: `.env` on EC2 (`/home/ubuntu/barbershop/.env`)

**Required Changes**:
```bash
# Frontend URL (update after domain setup)
FRONTEND_URL=https://balkanbarbershop.com

# Backend URL (update after SSL)
BACKEND_URL=https://balkanbarbershop.com/api

# Email settings (after SES production)
EMAIL_FROM=noreply@balkanbarbershop.com
EMAIL_SERVICE=ses

# AWS SES (after domain verification)
AWS_SES_REGION=us-east-1

# Twilio (already configured)
TWILIO_ACCOUNT_SID=AC6f5e...
TWILIO_AUTH_TOKEN=***
TWILIO_PHONE_NUMBER=+16073182298
```

### 5.2 Update Frontend Environment Variables

**File**: `.env` in project root (rebuild needed)

```bash
REACT_APP_API_URL=https://balkanbarbershop.com/api
```

**Actions Required**:
- [ ] Update backend .env on EC2
- [ ] Update frontend .env locally
- [ ] Rebuild frontend: `npm run build`
- [ ] Deploy updated build
- [ ] Restart containers

### 5.3 CORS Configuration

**Update Backend CORS** (`backend/src/server.js`):
```javascript
app.use(cors({
  origin: [
    'https://balkanbarbershop.com',
    'https://www.balkanbarbershop.com',
    'http://localhost:3000' // Keep for development
  ],
  credentials: true
}));
```

**Actions Required**:
- [ ] Update CORS origins
- [ ] Test API calls from production domain
- [ ] Remove development origins before launch

---

## Phase 6: Database Backup & Security

### 6.1 Database Backup Strategy

**Current**: No automated backups

**Implement**:
```bash
# Create backup script
cat > /home/ubuntu/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

docker exec barbershop_postgres pg_dump -U barbershop_user -d barbershop_db > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/backup_$DATE.sql s3://barbershop-backups/
EOF

chmod +x /home/ubuntu/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line: 0 2 * * * /home/ubuntu/backup-db.sh
```

**Actions Required**:
- [ ] Create backup script
- [ ] Test backup/restore
- [ ] Set up cron job
- [ ] Consider S3 for offsite backups

### 6.2 Security Hardening

**Firewall (UFW)**:
```bash
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable
```

**Database Security**:
```bash
# Ensure PostgreSQL only listens on localhost
# Already configured in docker-compose.yml
```

**SSH Security**:
```bash
# Disable password authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

**Actions Required**:
- [ ] Configure firewall
- [ ] Disable SSH password auth
- [ ] Set up fail2ban
- [ ] Regular security updates

---

## Phase 7: Monitoring & Analytics

### 7.1 Application Monitoring

**Install PM2 or similar** (if not using Docker health checks):
```bash
# Already have Docker health checks
# Optionally add external monitoring
```

**Log Aggregation**:
```bash
# View logs
docker compose logs -f --tail=100

# Set up log rotation
sudo nano /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### 7.2 Analytics Setup

**Options**:
- [ ] Google Analytics 4
- [ ] Plausible (privacy-focused)
- [ ] Custom analytics

**Add to Frontend** (`public/index.html`):
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**Actions Required**:
- [ ] Set up Google Analytics
- [ ] Add tracking code
- [ ] Set up conversion tracking
- [ ] Configure goals (bookings, registrations)

### 7.3 Uptime Monitoring

**Options**:
- [ ] UptimeRobot (free, 5-minute intervals)
- [ ] Pingdom
- [ ] AWS CloudWatch

**Setup UptimeRobot**:
1. Create account at uptimerobot.com
2. Add monitor: https://balkanbarbershop.com
3. Add alert contact: ahmad2609.as@gmail.com
4. Set check interval: 5 minutes

**Actions Required**:
- [ ] Set up uptime monitoring
- [ ] Configure alerts
- [ ] Test alert notifications

---

## Phase 8: Content Migration from Squarespace

### 8.1 Audit Current Squarespace Site

**Check**:
- [ ] All page content
- [ ] Images and media
- [ ] SEO settings (meta tags, descriptions)
- [ ] Custom CSS/styling
- [ ] Forms and integrations
- [ ] Blog posts (if any)

### 8.2 Content Checklist

**Pages to Verify**:
- [x] Home page
- [x] About page
- [x] Services page
- [x] Contact page
- [ ] Booking page (custom built)
- [ ] Terms of Service
- [ ] Privacy Policy

**Missing Pages** (if needed):
- [ ] Create Terms of Service page
- [ ] Create Privacy Policy page
- [ ] Add FAQ page

### 8.3 SEO Migration

**Verify on New Site**:
- [ ] Meta titles and descriptions
- [ ] Open Graph tags
- [ ] Structured data (already implemented)
- [ ] XML sitemap
- [ ] robots.txt
- [ ] Google Search Console setup
- [ ] Bing Webmaster Tools setup

**Actions Required**:
- [ ] Generate XML sitemap
- [ ] Submit to Google Search Console
- [ ] Monitor indexing status
- [ ] Set up 301 redirects if URLs changed

---

## Phase 9: Testing & QA

### 9.1 Functionality Testing

**Test All Features**:
- [ ] User registration
- [ ] Email verification
- [ ] Login/logout
- [ ] Password reset
- [ ] Booking flow (all 4 steps)
- [ ] Barber selection
- [ ] Service selection
- [ ] Date/time selection
- [ ] Booking confirmation
- [ ] Email notifications
- [ ] SMS notifications (if phone provided)
- [ ] Profile management
- [ ] Booking history
- [ ] Booking cancellation
- [ ] Booking rescheduling
- [ ] Admin dashboard
- [ ] Barber dashboard
- [ ] User management
- [ ] Barber management
- [ ] Service management
- [ ] Config management

### 9.2 Browser Compatibility

**Test on**:
- [ ] Chrome (desktop & mobile)
- [ ] Firefox (desktop & mobile)
- [ ] Safari (desktop & mobile)
- [ ] Edge
- [ ] Mobile responsive design

### 9.3 Performance Testing

**Tools**:
- [ ] Google PageSpeed Insights
- [ ] GTmetrix
- [ ] WebPageTest

**Target Metrics**:
- Page load time: < 3 seconds
- First Contentful Paint: < 1.5 seconds
- Time to Interactive: < 3.5 seconds

### 9.4 Security Testing

**Checklist**:
- [ ] SQL injection testing
- [ ] XSS testing
- [ ] CSRF protection
- [ ] Authentication bypass testing
- [ ] Authorization testing (role-based access)
- [ ] Password strength enforcement
- [ ] Rate limiting
- [ ] SSL/TLS configuration
- [ ] Security headers

---

## Phase 10: Launch Preparation

### 10.1 Pre-Launch Checklist

**Technical**:
- [ ] DNS updated and propagated
- [ ] SSL certificate installed and working
- [ ] All environment variables updated
- [ ] Database backed up
- [ ] Email sending tested (production)
- [ ] SMS sending tested
- [ ] CORS configured for production domain
- [ ] Analytics installed
- [ ] Uptime monitoring active

**Content**:
- [ ] All pages reviewed
- [ ] Images optimized
- [ ] SEO tags complete
- [ ] Legal pages (T&S, Privacy) ready
- [ ] Contact information accurate

**Communication**:
- [ ] Announcement email drafted
- [ ] Social media posts prepared
- [ ] Staff trained on new system
- [ ] Customer support plan ready

### 10.2 Launch Day Steps

**Order of Operations**:
1. [ ] Final database backup
2. [ ] Update DNS A records (morning)
3. [ ] Wait 2-4 hours for propagation
4. [ ] Verify site loads on new domain
5. [ ] Test booking flow end-to-end
6. [ ] Test email/SMS notifications
7. [ ] Update Squarespace site with redirect message
8. [ ] Monitor error logs
9. [ ] Monitor email delivery
10. [ ] Send announcement email

### 10.3 Post-Launch Monitoring (First 48 Hours)

**Monitor**:
- [ ] Website uptime
- [ ] Error rates (check logs every 2 hours)
- [ ] Booking success rate
- [ ] Email delivery rate
- [ ] SMS delivery rate
- [ ] User feedback
- [ ] Performance metrics

---

## Phase 11: Squarespace Decommissioning

### 11.1 Gradual Transition

**Week 1-2**: Soft launch
- Keep Squarespace active
- Add banner: "New booking system available at..."
- Monitor both systems

**Week 3-4**: Full migration
- Redirect Squarespace to new site
- Cancel Squarespace subscription
- Export any remaining data

### 11.2 Squarespace Cancellation

**Before Canceling**:
- [ ] Export all content
- [ ] Export customer data (if any)
- [ ] Export analytics data
- [ ] Download all images/media
- [ ] Document custom code/styling
- [ ] Note any integrations

**After Migration**:
- [ ] Set Squarespace to "Coming Soon" mode
- [ ] Add 301 redirect to new site
- [ ] Wait 1 month for stability
- [ ] Cancel subscription

---

## Estimated Timeline

### Quick Launch (2-3 weeks):
- **Week 1**: DNS + SSL setup
- **Week 2**: SES production access + testing
- **Week 3**: Launch + monitoring

### Complete Migration (4-6 weeks):
- **Week 1-2**: DNS, SSL, SES production
- **Week 3**: Content review, testing, security
- **Week 4**: Soft launch, monitoring
- **Week 5-6**: Full migration, Squarespace decommission

---

## Priority Order

### Critical (Must do before launch):
1. ✅ DNS configuration
2. ✅ SSL certificate
3. ✅ SES production access
4. Environment variable updates
5. Testing & QA

### Important (Should do soon after launch):
6. Database backups
7. Monitoring setup
8. Analytics
9. Legal pages

### Nice to Have (Can do later):
10. SNS integration
11. Advanced monitoring
12. Performance optimization
13. Additional features

---

## Current Blockers

### Immediate Blockers:
1. **DNS Access**: Need Squarespace login to update DNS records
2. **Domain Decision**: Transfer vs DNS update only
3. **SES Production**: Need to submit request and wait for approval

### Dependencies:
- SSL requires DNS propagation (24-48 hours)
- Full testing requires SSL + domain
- Launch requires SES production approval

---

## Next Steps (Prioritized)

### This Week:
1. [ ] Access Squarespace DNS settings
2. [ ] Update A records to point to 34.226.11.9
3. [ ] Submit AWS SES production access request
4. [ ] Prepare Nginx SSL configuration

### Next Week (after DNS propagation):
5. [ ] Install SSL certificate with Let's Encrypt
6. [ ] Update environment variables
7. [ ] Rebuild and deploy with new domain
8. [ ] Test all functionality on HTTPS

### Week 3 (after SES approval):
9. [ ] Complete end-to-end testing
10. [ ] Launch announcement
11. [ ] Monitor and optimize

---

## Support & Resources

**Documentation Files**:
- `DEPLOYMENT.md` - Deployment guide
- `SECURITY-AUDIT.md` - Security review
- `WARP.md` - Development guide
- `REGISTRATION_FIELDS_GUIDE.md` - Email/username fields
- `CUSTOMER_BOOKING_FEATURE.md` - Admin booking feature

**External Resources**:
- Let's Encrypt: https://letsencrypt.org/
- AWS SES: https://aws.amazon.com/ses/
- Certbot: https://certbot.eff.org/

**Emergency Contacts**:
- AWS Support: Console → Support Center
- Domain Registrar: Squarespace support
- Email: SES Console → Support cases
