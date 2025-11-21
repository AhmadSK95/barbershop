#!/bin/bash

# Barbershop Deployment Script
# Syncs local changes to AWS and redeploys

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Barbershop Deployment Script ===${NC}\n"

# Configuration - UPDATE THESE VALUES
AWS_HOST="${AWS_HOST:-your-server-ip}"
AWS_USER="${AWS_USER:-ubuntu}"
AWS_KEY="${AWS_KEY:-~/.ssh/your-key.pem}"
REMOTE_DIR="${REMOTE_DIR:-/home/ubuntu/barbershop}"
BRANCH="${BRANCH:-main}"

# Validate configuration
if [ "$AWS_HOST" = "your-server-ip" ]; then
    echo -e "${RED}ERROR: Please configure AWS_HOST in the script or set environment variable${NC}"
    echo "Example: export AWS_HOST=54.123.45.67"
    exit 1
fi

# Step 1: Check for uncommitted changes
echo -e "${YELLOW}[1/6] Checking for uncommitted changes...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo "Uncommitted changes found:"
    git status --short
    
    read -p "Do you want to commit these changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter commit message: " COMMIT_MSG
        git add .
        git commit -m "$COMMIT_MSG"
        echo -e "${GREEN}✓ Changes committed${NC}"
    else
        echo -e "${YELLOW}! Skipping uncommitted changes${NC}"
    fi
else
    echo -e "${GREEN}✓ No uncommitted changes${NC}"
fi

# Step 2: Push to GitHub
echo -e "\n${YELLOW}[2/6] Pushing to GitHub...${NC}"
git push origin $BRANCH
echo -e "${GREEN}✓ Pushed to GitHub${NC}"

# Step 3: SSH to AWS and pull latest
echo -e "\n${YELLOW}[3/6] Connecting to AWS server...${NC}"
ssh -i "$AWS_KEY" "$AWS_USER@$AWS_HOST" bash << ENDSSH
set -e

if [ ! -d "$REMOTE_DIR" ]; then
    echo "Directory $REMOTE_DIR doesn't exist. Cloning repository..."
    git clone https://github.com/AhmadSK95/barbershop.git $REMOTE_DIR
    cd $REMOTE_DIR
    echo "✓ Repository cloned"
else
    echo "Pulling latest changes..."
    cd $REMOTE_DIR
    git pull origin $BRANCH
    echo "✓ Code updated on server"
fi
ENDSSH

echo -e "${GREEN}✓ Latest code pulled on AWS${NC}"

# Step 4: Rebuild and restart Docker containers
echo -e "\n${YELLOW}[4/6] Rebuilding Docker containers...${NC}"
ssh -i "$AWS_KEY" "$AWS_USER@$AWS_HOST" bash << ENDSSH
set -e
cd $REMOTE_DIR

echo "Stopping containers..."
docker compose down

echo "Rebuilding containers..."
docker compose build

echo "Starting containers..."
docker compose up -d

echo "✓ Containers restarted"
ENDSSH

echo -e "${GREEN}✓ Docker containers rebuilt and started${NC}"

# Step 5: Check container health
echo -e "\n${YELLOW}[5/6] Checking container health...${NC}"
sleep 5  # Wait for containers to start
ssh -i "$AWS_KEY" "$AWS_USER@$AWS_HOST" bash << ENDSSH
cd $REMOTE_DIR
docker compose ps
ENDSSH

# Step 6: Test backend health endpoint
echo -e "\n${YELLOW}[6/6] Testing backend health...${NC}"
HEALTH_CHECK=$(ssh -i "$AWS_KEY" "$AWS_USER@$AWS_HOST" "curl -s http://localhost:5001/health || echo 'FAILED'")
if [[ $HEALTH_CHECK == *'"status":"ok"'* ]]; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
    echo "$HEALTH_CHECK"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo "$HEALTH_CHECK"
fi

echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "Frontend: http://$AWS_HOST (or your domain)"
echo -e "Backend:  http://$AWS_HOST:5001"
