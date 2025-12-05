#!/bin/bash

# Remote deployment script for AWS server
# This pulls latest code and updates email configuration

SERVER_IP="34.226.11.9"
KEY_FILE="barbershop-key.pem"
SERVER_USER="ubuntu"
PROJECT_DIR="/home/ubuntu/barbershop"

echo "╔════════════════════════════════════════════════════════╗"
echo "║  Deploying Email Configuration to AWS Server          ║"
echo "║  Server: $SERVER_IP                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Error: $KEY_FILE not found!"
    echo "   Make sure you're in the barbershop directory"
    exit 1
fi

# Set correct permissions
chmod 400 "$KEY_FILE"

echo "📡 Testing connection to AWS server..."
if ! ssh -i "$KEY_FILE" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "echo connected" &>/dev/null; then
    echo "❌ Cannot connect to server at $SERVER_IP"
    echo ""
    echo "Possible issues:"
    echo "1. EC2 instance is stopped - Start it in AWS Console"
    echo "2. Security Group doesn't allow SSH from your IP"
    echo "3. Elastic IP changed"
    echo ""
    echo "To check/fix:"
    echo "• AWS Console → EC2 → Instances"
    echo "• Check instance state (should be 'running')"
    echo "• Check Security Group allows port 22 from your IP"
    echo "• Verify Public IP is still $SERVER_IP"
    exit 1
fi

echo "✅ Connected to server!"
echo ""

# Pull latest code
echo "📥 Pulling latest code from GitHub..."
ssh -i "$KEY_FILE" "$SERVER_USER@$SERVER_IP" "cd $PROJECT_DIR && git pull origin main"

echo ""
echo "📝 Updating .env file on server..."

# Update EMAIL_FROM in server's .env
ssh -i "$KEY_FILE" "$SERVER_USER@$SERVER_IP" bash << 'REMOTE_SCRIPT'
cd /home/ubuntu/barbershop

# Backup current .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backed up .env"

# Update EMAIL_FROM
if grep -q "^EMAIL_FROM=" .env; then
    sed -i 's|^EMAIL_FROM=.*|EMAIL_FROM=info@balkan.thisisrikisart.com|' .env
    echo "✅ Updated EMAIL_FROM=info@balkan.thisisrikisart.com"
else
    echo "EMAIL_FROM=info@balkan.thisisrikisart.com" >> .env
    echo "✅ Added EMAIL_FROM=info@balkan.thisisrikisart.com"
fi

# Ensure EMAIL_SERVICE is set to ses
if ! grep -q "^EMAIL_SERVICE=" .env; then
    echo "EMAIL_SERVICE=ses" >> .env
    echo "✅ Added EMAIL_SERVICE=ses"
fi

echo ""
echo "Current email configuration:"
grep -E "^(EMAIL_FROM|EMAIL_SERVICE|AWS_REGION)" .env | head -5

REMOTE_SCRIPT

echo ""
echo "🔄 Restarting backend service..."
ssh -i "$KEY_FILE" "$SERVER_USER@$SERVER_IP" "cd $PROJECT_DIR && docker compose restart backend"

echo ""
echo "⏳ Waiting for backend to start..."
sleep 5

echo ""
echo "📋 Checking backend logs for email provider..."
ssh -i "$KEY_FILE" "$SERVER_USER@$SERVER_IP" "cd $PROJECT_DIR && docker compose logs --tail=30 backend | grep -i 'email'"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  ✅ Deployment Complete!                               ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. Test by creating a booking at http://$SERVER_IP"
echo "2. Check that emails come from: info@balkan.thisisrikisart.com"
echo "3. Monitor logs: ssh -i $KEY_FILE ubuntu@$SERVER_IP 'cd $PROJECT_DIR && docker compose logs -f backend'"
echo ""
echo "To view full backend logs:"
echo "  ssh -i $KEY_FILE ubuntu@$SERVER_IP"
echo "  cd $PROJECT_DIR"
echo "  docker compose logs -f backend"
