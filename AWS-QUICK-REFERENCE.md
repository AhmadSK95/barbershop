# AWS Deployment - Quick Reference Card

## 🌐 Application Access

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | http://44.200.206.94 | ✅ Live |
| **Backend API** | http://44.200.206.94:5001 | ✅ Live |
| **Health Check** | http://44.200.206.94:5001/health | ✅ OK |

## 🔐 Default Credentials

```
Admin Login:
  Email: admin@barbershop.com
  Password: Admin@123456
```

## 🔧 Essential Commands

### Deploy/Redeploy
```bash
./deploy-to-aws.sh
```

### SSH Access
```bash
ssh -i barbershop-key.pem ubuntu@44.200.206.94
```

### View Logs
```bash
# All services
ssh -i barbershop-key.pem ubuntu@44.200.206.94 'cd /home/ubuntu/barbershop && docker compose logs -f'

# Backend only
ssh -i barbershop-key.pem ubuntu@44.200.206.94 'cd /home/ubuntu/barbershop && docker compose logs -f backend'
```

### Check Status
```bash
ssh -i barbershop-key.pem ubuntu@44.200.206.94 'cd /home/ubuntu/barbershop && docker compose ps'
```

### Restart Services
```bash
# All services
ssh -i barbershop-key.pem ubuntu@44.200.206.94 'cd /home/ubuntu/barbershop && docker compose restart'

# Specific service
ssh -i barbershop-key.pem ubuntu@44.200.206.94 'cd /home/ubuntu/barbershop && docker compose restart backend'
```

## 🏗️ Infrastructure

| Resource | Details |
|----------|---------|
| **EC2** | i-0514900f3aaa5af56 (t3.small) |
| **IP** | 44.200.206.94 |
| **RDS** | barbershop-db.c4n6i6wc2dkb.us-east-1.rds.amazonaws.com |
| **Region** | us-east-1 |

## 📁 Important Files

- `aws-config.env` - AWS infrastructure configuration
- `barbershop-key.pem` - SSH private key
- `deploy-to-aws.sh` - Deployment script
- `AWS-DEPLOYMENT-SUCCESS.md` - Full deployment guide

## ⚡ Quick Troubleshooting

**Backend not responding?**
```bash
ssh -i barbershop-key.pem ubuntu@44.200.206.94 'cd /home/ubuntu/barbershop && docker compose restart backend'
```

**Check backend logs for errors:**
```bash
ssh -i barbershop-key.pem ubuntu@44.200.206.94 'cd /home/ubuntu/barbershop && docker compose logs backend --tail=50'
```

**Database connection issues?**
```bash
ssh -i barbershop-key.pem ubuntu@44.200.206.94 'cd /home/ubuntu/barbershop && docker compose ps postgres'
```

## 💰 Monthly Cost
Approximately **$40-48/month** for current setup (EC2 t3.small + RDS db.t3.micro)

## 📝 TODO After Deployment
- [ ] Change admin password
- [ ] Configure email SMTP settings
- [ ] Set up SSL/HTTPS certificate
- [ ] Configure custom domain (optional)
- [ ] Set up AWS CloudWatch monitoring

---

**For full details, see:** `AWS-DEPLOYMENT-SUCCESS.md`
