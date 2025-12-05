#!/bin/bash

# Email Configuration Update Deployment Script
# This script updates the email configuration on your AWS server

echo "╔════════════════════════════════════════════════════════╗"
echo "║  Email Configuration Update Deployment                 ║"
echo "║  Updating sender to: info@balkan.thisisrikisart.com    ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if we're on AWS server or local
if [ -f "/.dockerenv" ] || [ -f "/var/run/docker.sock" ]; then
    echo "✅ Detected AWS/Docker environment"
    ON_SERVER=true
else
    echo "ℹ️  Running on local machine"
    ON_SERVER=false
fi

# Update .env file
echo ""
echo "📝 Updating .env file..."

if [ -f ".env" ]; then
    # Backup current .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "   ✅ Backed up current .env"
    
    # Update EMAIL_FROM
    if grep -q "^EMAIL_FROM=" .env; then
        sed -i.bak 's|^EMAIL_FROM=.*|EMAIL_FROM=info@balkan.thisisrikisart.com|' .env
        echo "   ✅ Updated EMAIL_FROM in .env"
    else
        echo "EMAIL_FROM=info@balkan.thisisrikisart.com" >> .env
        echo "   ✅ Added EMAIL_FROM to .env"
    fi
    
    # Ensure EMAIL_SERVICE is set to ses
    if grep -q "^EMAIL_SERVICE=" .env; then
        sed -i.bak 's|^EMAIL_SERVICE=.*|EMAIL_SERVICE=ses|' .env
        echo "   ✅ Verified EMAIL_SERVICE=ses"
    else
        echo "EMAIL_SERVICE=ses" >> .env
        echo "   ✅ Added EMAIL_SERVICE=ses to .env"
    fi
    
    rm -f .env.bak
else
    echo "   ❌ .env file not found!"
    exit 1
fi

# Update backend/.env if it exists
if [ -f "backend/.env" ]; then
    cp backend/.env backend/.env.backup.$(date +%Y%m%d_%H%M%S)
    
    if grep -q "^EMAIL_FROM=" backend/.env; then
        sed -i.bak 's|^EMAIL_FROM=.*|EMAIL_FROM=info@balkan.thisisrikisart.com|' backend/.env
        echo "   ✅ Updated backend/.env"
    fi
    
    rm -f backend/.env.bak
fi

echo ""
echo "🔄 Restarting services..."

# Restart services based on environment
if command -v docker-compose &> /dev/null; then
    echo "   Using docker-compose..."
    docker-compose restart backend
    echo "   ✅ Backend service restarted"
elif command -v pm2 &> /dev/null; then
    echo "   Using PM2..."
    pm2 restart backend
    echo "   ✅ Backend restarted via PM2"
else
    echo "   ⚠️  No service manager detected. Please restart manually."
fi

echo ""
echo "🧪 Testing email configuration..."
sleep 3

# Check if backend is running
if command -v docker-compose &> /dev/null; then
    echo "   Checking backend logs..."
    docker-compose logs --tail=50 backend | grep -i "email"
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  ✅ Deployment Complete!                               ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. Check backend logs: docker-compose logs -f backend"
echo "2. Look for: '📧 Email Provider: AWS SES'"
echo "3. Test by creating a booking on the website"
echo "4. Verify emails come from: info@balkan.thisisrikisart.com"
echo ""
echo "📄 For more details, see EMAIL-UPDATE-SUMMARY.md"
