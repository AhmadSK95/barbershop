#!/bin/bash
set -e

echo "🚀 Deploying Assistant Feature to AWS..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="34.226.11.9"
SSH_KEY="barbershop-key.pem"
REMOTE_USER="ubuntu"
REMOTE_PATH="/home/ubuntu/barbershop"

# Step 1: Commit changes locally
echo -e "${BLUE}📦 Step 1: Committing changes locally...${NC}"
git add backend/src/utils/assistantSafety.js
git add backend/src/utils/assistantTools.js
git add backend/src/controllers/assistantController.js
git add backend/src/routes/assistantRoutes.js
git add backend/src/middleware/assistantRateLimiter.js
git add backend/src/app.js
git add backend/test-assistant.js

if git diff --staged --quiet; then
  echo -e "${YELLOW}⚠️  No changes to commit${NC}"
else
  git commit -m "Add admin assistant feature (metric templates, safe queries)"
  echo -e "${GREEN}✅ Changes committed${NC}"
fi
echo ""

# Step 2: Push to GitHub
echo -e "${BLUE}📤 Step 2: Pushing to GitHub...${NC}"
git push origin main
echo -e "${GREEN}✅ Pushed to GitHub${NC}"
echo ""

# Step 3: Pull changes on server
echo -e "${BLUE}📥 Step 3: Pulling changes on AWS server...${NC}"
ssh -i ${SSH_KEY} ${REMOTE_USER}@${SERVER_IP} "cd ${REMOTE_PATH} && git pull origin main"
echo -e "${GREEN}✅ Code updated on server${NC}"
echo ""

# Step 4: Restart ONLY backend (no database changes)
echo -e "${BLUE}🔄 Step 4: Restarting backend container...${NC}"
echo -e "${YELLOW}⚠️  This will NOT affect database or existing data${NC}"
ssh -i ${SSH_KEY} ${REMOTE_USER}@${SERVER_IP} "cd ${REMOTE_PATH} && docker compose restart backend"
echo -e "${GREEN}✅ Backend restarted${NC}"
echo ""

# Step 5: Wait for backend to be ready
echo -e "${BLUE}⏳ Step 5: Waiting for backend to start...${NC}"
sleep 10
echo -e "${GREEN}✅ Backend should be ready${NC}"
echo ""

# Step 6: Verify deployment
echo -e "${BLUE}🔍 Step 6: Verifying deployment...${NC}"
HEALTH_CHECK=$(curl -s https://balkan.thisisrikisart.com/api/health)
if echo "$HEALTH_CHECK" | grep -q '"status":"ok"'; then
  echo -e "${GREEN}✅ Health check passed${NC}"
else
  echo -e "${YELLOW}⚠️  Health check response: $HEALTH_CHECK${NC}"
fi
echo ""

# Step 7: Test assistant endpoints
echo -e "${BLUE}🧪 Step 7: Testing assistant endpoints...${NC}"
echo "Run this command to test:"
echo ""
echo -e "${GREEN}  node backend/test-assistant.js${NC}"
echo ""

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Test: node backend/test-assistant.js"
echo "2. View logs: ssh -i ${SSH_KEY} ${REMOTE_USER}@${SERVER_IP} 'cd ${REMOTE_PATH} && docker compose logs -f backend'"
echo "3. Check status: ssh -i ${SSH_KEY} ${REMOTE_USER}@${SERVER_IP} 'cd ${REMOTE_PATH} && docker compose ps'"
echo ""
echo -e "${YELLOW}📊 Database: NOT modified (safe deployment)${NC}"
echo -e "${YELLOW}🔒 Existing data: Preserved${NC}"
