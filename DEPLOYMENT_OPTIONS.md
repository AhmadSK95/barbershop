# Deployment Options for AWS Sync

## Option 1: Manual Script (Fastest Setup) ⚡

**Best for:** Quick deployments, full control

### Setup:
```bash
# 1. Copy example config
cp deploy.env.example deploy.env

# 2. Edit deploy.env with your AWS details
# Update: AWS_HOST, AWS_USER, AWS_KEY, REMOTE_DIR

# 3. Run deployment
source deploy.env && ./deploy.sh
```

### Usage:
```bash
# Simple one-command deploy
source deploy.env && ./deploy.sh

# Or add to ~/.zshrc for convenience:
alias deploy="cd /Users/moenuddeenahmadshaik/Desktop/barbershop && source deploy.env && ./deploy.sh"

# Then just run:
deploy
```

### Pros:
- ✅ Immediate setup (< 5 minutes)
- ✅ Interactive commit prompts
- ✅ Health checks included
- ✅ Works offline (commits locally first)

### Cons:
- ❌ Manual execution required
- ❌ No deployment history
- ❌ No rollback mechanism

---

## Option 2: GitHub Actions (Recommended) 🚀

**Best for:** Automated deployments, team collaboration

### Setup:
```bash
# 1. Add secrets to GitHub repository
# Go to: Settings > Secrets and variables > Actions > New repository secret

# Add these secrets:
AWS_SSH_KEY      # Your private SSH key content (cat ~/.ssh/your-key.pem)
AWS_HOST         # Your AWS IP or domain (e.g., 54.123.45.67)
AWS_USER         # SSH user (usually 'ubuntu' or 'ec2-user')
REMOTE_DIR       # Path on server (e.g., /home/ubuntu/barbershop)

# 2. Push the workflow file (already created)
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions deployment"
git push
```

### Usage:
```bash
# Automatic: Just push to main branch
git add .
git commit -m "Your changes"
git push

# Manual trigger: GitHub > Actions > Deploy to AWS > Run workflow
```

### Pros:
- ✅ Fully automated on push
- ✅ Deployment history in Actions tab
- ✅ Team visibility
- ✅ Can add tests before deploy
- ✅ Notifications on failure

### Cons:
- ❌ Requires GitHub configuration
- ❌ Depends on GitHub availability
- ❌ Slight delay (30-60 seconds to start)

---

## Option 3: Git Hooks (Post-Receive) 🎣

**Best for:** Instant deployment on git push to server

### Setup on AWS Server:
```bash
# SSH to your AWS server
ssh -i ~/.ssh/your-key.pem ubuntu@your-aws-ip

# Navigate to your repo
cd /home/ubuntu/barbershop/.git/hooks

# Create post-receive hook
cat > post-receive << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying latest changes..."

cd /home/ubuntu/barbershop
git --git-dir=.git --work-tree=. checkout -f

echo "📦 Rebuilding containers..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo "✅ Deployment complete!"
EOF

chmod +x post-receive
```

### Usage:
```bash
# Add AWS as a remote
git remote add aws ssh://ubuntu@your-aws-ip/home/ubuntu/barbershop

# Push to deploy
git push aws main
```

### Pros:
- ✅ Instant deployment
- ✅ No third-party dependency
- ✅ Simple and fast

### Cons:
- ❌ No rollback mechanism
- ❌ Harder to debug failures
- ❌ Requires manual hook setup

---

## Option 4: AWS CodeDeploy ☁️

**Best for:** Enterprise deployments, AWS-native approach

### Setup:
```bash
# 1. Install AWS CLI
brew install awscli
aws configure

# 2. Create appspec.yml in project root
cat > appspec.yml << 'EOF'
version: 0.0
os: linux
hooks:
  ApplicationStop:
    - location: scripts/stop.sh
      timeout: 300
  ApplicationStart:
    - location: scripts/start.sh
      timeout: 300
EOF

# 3. Create deployment scripts
mkdir -p scripts
echo "docker-compose down" > scripts/stop.sh
echo "docker-compose up -d --build" > scripts/start.sh
chmod +x scripts/*.sh

# 4. Configure CodeDeploy in AWS Console
```

### Usage:
```bash
# Deploy via AWS CLI
aws deploy create-deployment \
  --application-name barbershop \
  --deployment-group-name production \
  --github-location repository=AhmadSK95/barbershop,commitId=$(git rev-parse HEAD)
```

### Pros:
- ✅ AWS-native solution
- ✅ Built-in rollback
- ✅ Monitoring & alerts
- ✅ Blue/green deployments

### Cons:
- ❌ Complex setup
- ❌ Additional AWS costs
- ❌ Overkill for small projects

---

## Option 5: Watchtower (Auto-Update Docker) 🐳

**Best for:** Automated container updates without rebuild

### Setup on AWS Server:
```bash
# Add watchtower to docker-compose.yml
cat >> docker-compose.yml << 'EOF'

  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_POLL_INTERVAL=300  # Check every 5 minutes
      - WATCHTOWER_CLEANUP=true
EOF

docker-compose up -d watchtower
```

### Usage:
```bash
# Just push images to registry
docker build -t your-registry/barbershop:latest .
docker push your-registry/barbershop:latest

# Watchtower auto-updates containers
```

### Pros:
- ✅ Fully automated
- ✅ No manual deployment
- ✅ Works with Docker Hub/ECR

### Cons:
- ❌ Requires container registry
- ❌ Less control over deployment timing
- ❌ May update at inconvenient times

---

## Comparison Table

| Option | Setup Time | Automation | Cost | Complexity | Recommended For |
|--------|-----------|------------|------|------------|-----------------|
| Manual Script | 5 min | Manual | Free | Low | Development |
| GitHub Actions | 15 min | Full | Free | Medium | Production |
| Git Hooks | 10 min | On Push | Free | Low | Small Teams |
| AWS CodeDeploy | 2 hours | Full | $$$ | High | Enterprise |
| Watchtower | 20 min | Full | $ | Medium | Docker-heavy |

---

## Recommended Workflow

### For Development:
```bash
# Use manual script for quick iterations
source deploy.env && ./deploy.sh
```

### For Production:
```bash
# Use GitHub Actions
git add .
git commit -m "Feature: add new booking flow"
git push  # Auto-deploys via GitHub Actions
```

### For Hotfixes:
```bash
# Use manual script for immediate deployment
source deploy.env && ./deploy.sh
```

---

## Troubleshooting

### Script fails with "Permission denied (publickey)"
```bash
# Fix SSH key permissions
chmod 400 ~/.ssh/your-key.pem

# Test SSH connection
ssh -i ~/.ssh/your-key.pem ubuntu@your-aws-ip "echo 'Connected!'"
```

### GitHub Actions fails
```bash
# Check secrets are configured
# GitHub > Settings > Secrets > Actions

# View logs
# GitHub > Actions > Click failed workflow > View logs
```

### Docker containers won't start
```bash
# SSH to server and check logs
ssh -i ~/.ssh/your-key.pem ubuntu@your-aws-ip
cd /home/ubuntu/barbershop
docker-compose logs -f
```
