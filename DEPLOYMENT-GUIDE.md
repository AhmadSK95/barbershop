# Safe Deployment Guide

## 🎯 Overview

This guide explains how to deploy changes to AWS **without losing your database** or requiring full rebuilds every time.

---

## 🚀 Quick Deploy (Recommended)

For **CSS/Frontend changes** (most common):

```bash
./deploy-safe.sh
```

This script will:
- ✅ Pull latest code from GitHub
- ✅ Preserve your database (no data loss)
- ✅ Keep `.env` file intact (all credentials preserved)
- ✅ Only rebuild frontend if CSS changes detected
- ✅ Skip unnecessary backend rebuilds (much faster)

---

## 📋 Deployment Scenarios

### Scenario 1: CSS/Styling Changes Only (FAST ⚡)
**What changed:** `src/**/*.css`, `src/pages/*.js` (UI only)

```bash
./deploy-safe.sh
```

**Time:** ~30 seconds  
**What happens:** Only frontend container rebuilds and restarts  
**Database:** Preserved ✅  
**Credentials:** Preserved ✅

---

### Scenario 2: Backend Logic Changes (MODERATE 🕐)
**What changed:** `backend/src/**/*.js`, `package.json`

```bash
./deploy-safe.sh
```

**Time:** ~5 minutes  
**What happens:** Both frontend and backend rebuild  
**Database:** Preserved ✅  
**Credentials:** Preserved ✅

---

### Scenario 3: Database Schema Changes (CAREFUL ⚠️)
**What changed:** `backend/src/config/migrate.js`

```bash
# 1. Deploy code first
./deploy-safe.sh

# 2. Run migration manually (if needed)
ssh -i barbershop-key.pem ubuntu@34.226.11.9 'cd /home/ubuntu/barbershop && docker compose exec -T backend npm run migrate'
```

**Time:** ~5 minutes  
**What happens:** Code updates + manual migration  
**Database:** Schema updated, data preserved ✅

---

### Scenario 4: Fresh Start (NUCLEAR OPTION 💣)
**Only use if:** Database is corrupted or you need to reset everything

```bash
ssh -i barbershop-key.pem ubuntu@34.226.11.9 'cd /home/ubuntu/barbershop && docker compose down -v && docker compose up -d && docker compose exec -T backend npm run migrate'
```

**Time:** ~10 minutes  
**What happens:** Complete reset  
**Database:** ⚠️ ALL DATA LOST - Fresh database created

---

## 🔄 Deployment Workflow

### Before Every Deployment

1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Your change description"
   git push origin main
   ```

2. **Run safe deploy:**
   ```bash
   ./deploy-safe.sh
   ```

3. **Verify deployment:**
   - Visit: http://34.226.11.9
   - Test the changes
   - Check backend health: http://34.226.11.9:5001/health

---

## 🛡️ What Makes `deploy-safe.sh` Safe?

### 1. **Preserves Database**
- Uses `docker compose up -d` (NOT `down -v`)
- Never removes volumes
- Database persists across deployments

### 2. **Preserves Credentials**
- Checks if `.env` exists before overwriting
- Only creates `.env` on first deployment
- Keeps all AWS, Twilio, and database credentials intact

### 3. **Smart Rebuilds**
- Detects what changed (CSS vs. backend)
- Only rebuilds affected services
- Skips full rebuilds for frontend-only changes

### 4. **Minimal Downtime**
- Only restarts containers that changed
- Uses `--force-recreate` for specific services
- Typically < 5 seconds downtime for CSS changes

---

## 🆚 Comparison: Old vs. New Script

| Feature | `deploy-to-aws.sh` (OLD) | `deploy-safe.sh` (NEW) |
|---------|--------------------------|------------------------|
| Database Safety | ⚠️ Can lose data | ✅ Always preserved |
| `.env` Handling | ❌ Overwrites with placeholders | ✅ Preserves existing |
| Rebuild Speed | 🐌 Always full rebuild (~10 min) | ⚡ Smart rebuild (~30 sec for CSS) |
| Credentials | ❌ Resets to defaults | ✅ Keeps all credentials |
| Downtime | 🔴 ~2-3 minutes | 🟢 ~5-10 seconds (CSS) |

---

## 📝 Manual Operations

### View Logs
```bash
ssh -i barbershop-key.pem ubuntu@34.226.11.9 'cd /home/ubuntu/barbershop && docker compose logs -f'
```

### Restart Specific Service
```bash
# Restart backend only
ssh -i barbershop-key.pem ubuntu@34.226.11.9 'cd /home/ubuntu/barbershop && docker compose restart backend'

# Restart frontend only
ssh -i barbershop-key.pem ubuntu@34.226.11.9 'cd /home/ubuntu/barbershop && docker compose restart frontend'
```

### Check Container Status
```bash
ssh -i barbershop-key.pem ubuntu@34.226.11.9 'cd /home/ubuntu/barbershop && docker compose ps'
```

### Update Environment Variables
```bash
# 1. SSH to server
ssh -i barbershop-key.pem ubuntu@34.226.11.9

# 2. Edit .env file
cd /home/ubuntu/barbershop
nano .env

# 3. Restart services to pick up changes
docker compose down
docker compose up -d
```

---

## 🐛 Troubleshooting

### Problem: "Database connection failed"
**Cause:** Postgres container not healthy yet  
**Solution:**
```bash
# Wait for postgres to be healthy
ssh -i barbershop-key.pem ubuntu@34.226.11.9 'cd /home/ubuntu/barbershop && docker compose ps'

# If postgres is not healthy, restart it
ssh -i barbershop-key.pem ubuntu@34.226.11.9 'cd /home/ubuntu/barbershop && docker compose restart postgres'
```

### Problem: "Email/SMS not working after deploy"
**Cause:** `.env` file missing credentials  
**Solution:**
```bash
# Check if credentials are present
ssh -i barbershop-key.pem ubuntu@34.226.11.9 'docker exec barbershop_backend sh -c "echo EMAIL_SERVICE=\$EMAIL_SERVICE"'

# If empty, update .env and restart
ssh -i barbershop-key.pem ubuntu@34.226.11.9 'cd /home/ubuntu/barbershop && nano .env'
# Add credentials, save, then:
ssh -i barbershop-key.pem ubuntu@34.226.11.9 'cd /home/ubuntu/barbershop && docker compose restart backend'
```

### Problem: "Frontend not showing latest CSS"
**Cause:** Browser cache or build cache  
**Solution:**
```bash
# Force rebuild frontend
ssh -i barbershop-key.pem ubuntu@34.226.11.9 'cd /home/ubuntu/barbershop && docker compose build --no-cache frontend && docker compose up -d --force-recreate frontend'
```

---

## ✅ Best Practices

1. **Always use `deploy-safe.sh` for regular deployments**
2. **Test locally before deploying** (`npm start`)
3. **Commit and push before deploying**
4. **Never manually edit production database** (use migrations)
5. **Keep `.env` file backed up** (but not in git!)
6. **Monitor logs after deployment** for any errors

---

## 🎉 Summary

- **Use `deploy-safe.sh`** for all deployments
- **Database is safe** - never gets deleted
- **Fast deploys** - only rebuilds what changed
- **Preserves credentials** - no reconfiguration needed
- **Minimal downtime** - services restart quickly

**Your data and configuration are now protected!** 🛡️
