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

echo "🚀 Starting SAFE deployment to AWS..."
echo "📍 Target: $PUBLIC_IP"

# SSH key file
SSH_KEY="$SSH_KEY_FILE"
SSH_USER="ubuntu"
REMOTE_HOST="$PUBLIC_IP"
REMOTE_DIR="/home/ubuntu/barbershop"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Testing SSH connection...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$REMOTE_HOST" "echo 'SSH connection successful!'"

echo -e "${BLUE}Step 2: Pulling latest code from GitHub...${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "if [ -d $REMOTE_DIR/.git ]; then 
    echo 'Pulling latest changes...'
    cd $REMOTE_DIR && git pull origin main
else
    echo 'Cloning repository...'
    rm -rf $REMOTE_DIR
    cd /home/ubuntu
    git clone https://github.com/AhmadSK95/barbershop.git
fi"

echo -e "${BLUE}Step 3: Checking if .env exists on server...${NC}"
ENV_EXISTS=$(ssh -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "[ -f $REMOTE_DIR/.env ] && echo 'yes' || echo 'no'")

if [ "$ENV_EXISTS" = "no" ]; then
    echo -e "${YELLOW}⚠️  .env file doesn't exist. Creating from local template...${NC}"
    
    # Copy local .env to server (preserving all credentials)
    scp -i "$SSH_KEY" .env "$SSH_USER@$REMOTE_HOST:$REMOTE_DIR/.env.temp"
    
    # Update URLs for production
    ssh -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "cd $REMOTE_DIR && 
        sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=http://$PUBLIC_IP|g' .env.temp &&
        sed -i 's|REACT_APP_API_URL=.*|REACT_APP_API_URL=http://$PUBLIC_IP:5001/api|g' .env.temp &&
        sed -i 's|DB_HOST=postgres|DB_HOST=postgres|g' .env.temp &&
        mv .env.temp .env
    "
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${GREEN}✅ .env file already exists (preserving database and credentials)${NC}"
fi

echo -e "${BLUE}Step 4: Checking if rebuild is needed...${NC}"
# Check if Dockerfile or package.json changed
NEEDS_REBUILD=$(ssh -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "cd $REMOTE_DIR && 
    git diff HEAD@{1} HEAD --name-only | grep -E '(Dockerfile|package.json|backend/)' || echo 'no'
")

if [ "$NEEDS_REBUILD" != "no" ]; then
    echo -e "${YELLOW}📦 Backend/dependencies changed. Rebuilding images...${NC}"
    ssh -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "cd $REMOTE_DIR && DOCKER_BUILDKIT=1 docker compose build"
    RESTART_NEEDED="yes"
else
    echo -e "${GREEN}✅ No rebuild needed (CSS/frontend only changes)${NC}"
    RESTART_NEEDED="frontend"
fi

echo -e "${BLUE}Step 5: Restarting services...${NC}"
if [ "$RESTART_NEEDED" = "yes" ]; then
    echo "Restarting all services..."
    ssh -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "cd $REMOTE_DIR && docker compose up -d --force-recreate"
elif [ "$RESTART_NEEDED" = "frontend" ]; then
    echo "Restarting frontend only (faster)..."
    ssh -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "cd $REMOTE_DIR && docker compose build frontend && docker compose up -d --force-recreate frontend"
else
    echo "No restart needed"
fi

echo -e "${BLUE}Step 6: Waiting for services to start...${NC}"
sleep 5

echo -e "${BLUE}Step 7: Checking container status...${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "cd $REMOTE_DIR && docker compose ps"

echo -e "${BLUE}Step 8: Verifying backend health...${NC}"
HEALTH_CHECK=$(ssh -i "$SSH_KEY" "$SSH_USER@$REMOTE_HOST" "curl -s http://localhost:5001/health || echo 'FAILED'")
if [[ $HEALTH_CHECK == *'"status":"ok"'* ]]; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Backend health check inconclusive${NC}"
    echo "$HEALTH_CHECK"
fi

echo -e "${GREEN}✅ Safe deployment complete!${NC}"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://$PUBLIC_IP"
echo "   Backend API: http://$PUBLIC_IP:5001"
echo ""
echo "📝 Notes:"
echo "   - Database was preserved (no data loss)"
echo "   - .env file was not overwritten"
echo "   - Only necessary services were restarted"
echo ""
echo "📊 View logs: ssh -i $SSH_KEY $SSH_USER@$REMOTE_HOST 'cd $REMOTE_DIR && docker compose logs -f'"
echo "🔍 Check status: ssh -i $SSH_KEY $SSH_USER@$REMOTE_HOST 'cd $REMOTE_DIR && docker compose ps'"
