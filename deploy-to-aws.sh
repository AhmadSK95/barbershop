#!/bin/bash
set -e

# Load AWS config (only export variables, not commands)
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ || -z $key ]] && continue
    # Skip SSH_COMMAND line
    [[ $key =~ ^SSH_COMMAND ]] && continue
    # Export the variable
    export "$key=$value"
done < aws-config.env

echo "🚀 Starting deployment to AWS..."
echo "📍 Target: $PUBLIC_IP"

# SSH key file
SSH_KEY="$SSH_KEY_FILE"
SSH_USER="ubuntu"
REMOTE_HOST="$PUBLIC_IP"
REMOTE_DIR="/home/ubuntu/barbershop"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Testing SSH connection...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$REMOTE_HOST" "echo 'SSH connection successful!'"

echo -e "${BLUE}Step 2: Checking if barbershop directory is a git repository...${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "if [ -d $REMOTE_DIR/.git ]; then 
    echo 'Git repository exists'
    cd $REMOTE_DIR && git pull origin main
else
    echo 'Not a git repository, removing and cloning fresh...'
    rm -rf $REMOTE_DIR
    cd /home/ubuntu
    git clone https://github.com/AhmadSK95/barbershop.git
fi"

echo -e "${BLUE}Step 4: Updating .env file with production values...${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "cd $REMOTE_DIR && cat > .env << 'EOF'
# Database
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_HOST=$DB_ENDPOINT
DB_PORT=$DB_PORT

# JWT Secrets
JWT_SECRET=\$(openssl rand -hex 32)
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=\$(openssl rand -hex 32)
JWT_REFRESH_EXPIRE=30d

# Email Configuration (update with your SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@barbershop.com

# Application URLs
FRONTEND_URL=http://$PUBLIC_IP
REACT_APP_API_URL=http://$PUBLIC_IP:5001/api

# Admin Setup
ADMIN_EMAIL=admin@barbershop.com
ADMIN_PASSWORD=Admin@123456
EOF
"

echo -e "${BLUE}Step 5: Stopping existing containers...${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "cd $REMOTE_DIR && docker compose down || true"

echo -e "${BLUE}Step 6: Rebuilding Docker images...${NC}"
echo "Note: This may take 5-10 minutes on small instances. Please be patient..."
ssh -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "cd $REMOTE_DIR && DOCKER_BUILDKIT=1 docker compose build"

echo -e "${BLUE}Step 7: Starting containers...${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "cd $REMOTE_DIR && docker compose up -d"

echo -e "${BLUE}Step 8: Waiting for services to start...${NC}"
sleep 10

echo -e "${BLUE}Step 9: Checking container status...${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "cd $REMOTE_DIR && docker compose ps"

echo -e "${BLUE}Step 10: Running database migration...${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "cd $REMOTE_DIR && docker compose exec -T backend npm run migrate || echo 'Migration skipped or already done'"

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://$PUBLIC_IP"
echo "   Backend API: http://$PUBLIC_IP:5001"
echo ""
echo "📊 View logs: ssh -i $SSH_KEY $SSH_USER@$REMOTE_HOST 'cd $REMOTE_DIR && docker compose logs -f'"
echo ""
echo "🔍 Check status: ssh -i $SSH_KEY $SSH_USER@$REMOTE_HOST 'cd $REMOTE_DIR && docker compose ps'"
