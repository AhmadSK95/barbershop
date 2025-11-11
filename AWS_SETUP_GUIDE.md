# AWS Setup Guide - Barbershop App
## Step-by-Step Deployment Instructions

**Account:** us-east-1 (N. Virginia)  
**Estimated Time:** 2-3 hours  
**Date:** November 5, 2025

---

## Prerequisites Checklist

- [x] AWS Account created
- [ ] AWS CLI installed on your Mac
- [ ] SSH key pair generated
- [ ] Domain name purchased (optional for Phase 1)

---

## Phase 1: Install AWS CLI

### Step 1: Install AWS CLI
```bash
# Install AWS CLI v2
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Verify installation
aws --version
```

### Step 2: Configure AWS Credentials

You'll need to create access keys from AWS Console:

1. Go to: **IAM** → **Users** → **Your User** → **Security credentials**
2. Click **Create access key** → Select **CLI** → Create
3. Save the **Access Key ID** and **Secret Access Key**

```bash
# Configure AWS CLI
aws configure

# Enter when prompted:
# AWS Access Key ID: [paste your key]
# AWS Secret Access Key: [paste your secret]
# Default region name: us-east-1
# Default output format: json
```

### Step 3: Verify Configuration
```bash
# Test AWS CLI is working
aws sts get-caller-identity
```

---

## Phase 2: Create VPC and Network Infrastructure

### Step 1: Create VPC
```bash
# Create VPC
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=barbershop-vpc}]' \
  --query 'Vpc.VpcId' \
  --output text)

echo "VPC ID: $VPC_ID"

# Enable DNS hostnames
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-hostnames
```

### Step 2: Create Internet Gateway
```bash
# Create Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=barbershop-igw}]' \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

echo "Internet Gateway ID: $IGW_ID"

# Attach to VPC
aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID
```

### Step 3: Create Subnets
```bash
# Create Public Subnet (for EC2)
PUBLIC_SUBNET_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=barbershop-public-subnet}]' \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Public Subnet ID: $PUBLIC_SUBNET_ID"

# Create Private Subnet 1 (for RDS)
PRIVATE_SUBNET_1_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=barbershop-private-subnet-1}]' \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Private Subnet 1 ID: $PRIVATE_SUBNET_1_ID"

# Create Private Subnet 2 (for RDS - required for subnet group)
PRIVATE_SUBNET_2_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.3.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=barbershop-private-subnet-2}]' \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Private Subnet 2 ID: $PRIVATE_SUBNET_2_ID"

# Enable auto-assign public IP for public subnet
aws ec2 modify-subnet-attribute \
  --subnet-id $PUBLIC_SUBNET_ID \
  --map-public-ip-on-launch
```

### Step 4: Create Route Table
```bash
# Create Route Table
ROUTE_TABLE_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=barbershop-public-rt}]' \
  --query 'RouteTable.RouteTableId' \
  --output text)

echo "Route Table ID: $ROUTE_TABLE_ID"

# Create route to Internet Gateway
aws ec2 create-route \
  --route-table-id $ROUTE_TABLE_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID

# Associate with public subnet
aws ec2 associate-route-table \
  --route-table-id $ROUTE_TABLE_ID \
  --subnet-id $PUBLIC_SUBNET_ID
```

---

## Phase 3: Create Security Groups

### Step 1: EC2 Security Group
```bash
# Create security group for EC2
EC2_SG_ID=$(aws ec2 create-security-group \
  --group-name barbershop-ec2-sg \
  --description "Security group for Barbershop EC2 instance" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

echo "EC2 Security Group ID: $EC2_SG_ID"

# Allow SSH (port 22)
aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# Allow HTTP (port 80)
aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow HTTPS (port 443)
aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow Backend API (port 5001)
aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG_ID \
  --protocol tcp \
  --port 5001 \
  --cidr 0.0.0.0/0
```

### Step 2: RDS Security Group
```bash
# Create security group for RDS
RDS_SG_ID=$(aws ec2 create-security-group \
  --group-name barbershop-rds-sg \
  --description "Security group for Barbershop RDS instance" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

echo "RDS Security Group ID: $RDS_SG_ID"

# Allow PostgreSQL from EC2 security group
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $EC2_SG_ID
```

---

## Phase 4: Create SSH Key Pair

```bash
# Create key pair
aws ec2 create-key-pair \
  --key-name barbershop-key \
  --query 'KeyMaterial' \
  --output text > ~/Desktop/barbershop/barbershop-key.pem

# Set proper permissions
chmod 400 ~/Desktop/barbershop/barbershop-key.pem

echo "SSH key saved to: ~/Desktop/barbershop/barbershop-key.pem"
```

---

## Phase 5: Launch EC2 Instance

### Step 1: Find Latest Ubuntu AMI
```bash
# Get latest Ubuntu 22.04 AMI ID
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)

echo "Ubuntu AMI ID: $AMI_ID"
```

### Step 2: Launch EC2 Instance
```bash
# Launch t3.small instance
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.small \
  --key-name barbershop-key \
  --security-group-ids $EC2_SG_ID \
  --subnet-id $PUBLIC_SUBNET_ID \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=30,VolumeType=gp3}' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=barbershop-app}]' \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "Instance ID: $INSTANCE_ID"

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "Public IP: $PUBLIC_IP"
```

---

## Phase 6: Create RDS PostgreSQL Database

### Step 1: Create DB Subnet Group
```bash
# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name barbershop-db-subnet-group \
  --db-subnet-group-description "Subnet group for Barbershop DB" \
  --subnet-ids $PRIVATE_SUBNET_1_ID $PRIVATE_SUBNET_2_ID \
  --tags "Key=Name,Value=barbershop-db-subnet-group"
```

### Step 2: Generate Database Password
```bash
# Generate secure password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "Database Password: $DB_PASSWORD"
echo "SAVE THIS PASSWORD! You'll need it for .env configuration"
```

### Step 3: Create RDS Instance
```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier barbershop-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username barbershop_admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name barbershop-db-subnet-group \
  --db-name barbershop_db \
  --backup-retention-period 7 \
  --no-publicly-accessible \
  --storage-encrypted \
  --tags "Key=Name,Value=barbershop-db"

echo "RDS instance creation initiated. This will take 5-10 minutes..."

# Wait for database to be available
aws rds wait db-instance-available --db-instance-identifier barbershop-db

# Get database endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier barbershop-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "Database Endpoint: $DB_ENDPOINT"
```

---

## Phase 7: Create S3 Bucket

```bash
# Create S3 bucket (name must be globally unique)
BUCKET_NAME="barbershop-app-$(date +%s)"

aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "S3 Bucket: $BUCKET_NAME"
```

---

## Phase 8: Save Configuration

### Create environment file with all values
```bash
cat > ~/Desktop/barbershop/aws-config.env << EOF
# AWS Infrastructure Configuration
# Generated: $(date)

# VPC
VPC_ID=$VPC_ID
PUBLIC_SUBNET_ID=$PUBLIC_SUBNET_ID
PRIVATE_SUBNET_1_ID=$PRIVATE_SUBNET_1_ID
PRIVATE_SUBNET_2_ID=$PRIVATE_SUBNET_2_ID
IGW_ID=$IGW_ID
ROUTE_TABLE_ID=$ROUTE_TABLE_ID

# Security Groups
EC2_SG_ID=$EC2_SG_ID
RDS_SG_ID=$RDS_SG_ID

# EC2
INSTANCE_ID=$INSTANCE_ID
PUBLIC_IP=$PUBLIC_IP
KEY_FILE=~/Desktop/barbershop/barbershop-key.pem

# RDS
DB_ENDPOINT=$DB_ENDPOINT
DB_NAME=barbershop_db
DB_USER=barbershop_admin
DB_PASSWORD=$DB_PASSWORD
DB_PORT=5432

# S3
S3_BUCKET=$BUCKET_NAME

# Connection String
DATABASE_URL=postgresql://barbershop_admin:$DB_PASSWORD@$DB_ENDPOINT:5432/barbershop_db

# SSH Command
# ssh -i ~/Desktop/barbershop/barbershop-key.pem ubuntu@$PUBLIC_IP
EOF

echo "Configuration saved to: ~/Desktop/barbershop/aws-config.env"
cat ~/Desktop/barbershop/aws-config.env
```

---

## Phase 9: Configure EC2 Instance

### Step 1: Connect to EC2
```bash
# SSH into your instance
ssh -i ~/Desktop/barbershop/barbershop-key.pem ubuntu@$PUBLIC_IP
```

### Step 2: Install Docker (Run on EC2)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Logout and login again for group changes to take effect
exit
```

---

## Phase 10: Deploy Application

### Step 1: Upload Application to EC2
```bash
# From your local machine, create deployment archive
cd ~/Desktop/barbershop
tar -czf barbershop-app.tar.gz \
  backend/ \
  src/ \
  public/ \
  package.json \
  docker-compose.yml \
  Dockerfile \
  nginx.conf

# Copy to EC2
scp -i ~/Desktop/barbershop/barbershop-key.pem \
  barbershop-app.tar.gz \
  ubuntu@$PUBLIC_IP:~/

# SSH back into EC2
ssh -i ~/Desktop/barbershop/barbershop-key.pem ubuntu@$PUBLIC_IP

# Extract archive
tar -xzf barbershop-app.tar.gz
cd barbershop
```

### Step 2: Configure Environment Variables (On EC2)
```bash
# Source the config from your local machine first
# (Copy the DB_PASSWORD, DB_ENDPOINT, etc. from aws-config.env)

# Create .env file
cat > .env << 'EOF'
# Database
DB_HOST=<YOUR_DB_ENDPOINT>
DB_PORT=5432
DB_NAME=barbershop_db
DB_USER=barbershop_admin
DB_PASSWORD=<YOUR_DB_PASSWORD>

# JWT Secrets (generate new ones)
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# Server
NODE_ENV=production
PORT=5001
FRONTEND_URL=http://<YOUR_PUBLIC_IP>

# Email (use SendGrid or similar)
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=<YOUR_SENDGRID_API_KEY>
EMAIL_FROM=noreply@yourdomain.com

# Admin
ADMIN_EMAIL=admin@barbershop.com
ADMIN_PASSWORD=<GENERATE_SECURE_PASSWORD>
EOF

# Generate JWT secrets
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)" >> .env
```

### Step 3: Start Application
```bash
# Run database migrations
cd backend
npm install
npm run migrate

# Start Docker containers
cd ..
docker-compose up -d --build

# Check status
docker-compose ps
docker-compose logs -f
```

---

## Phase 11: Verify Deployment

### Test endpoints
```bash
# Health check
curl http://$PUBLIC_IP:5001/health

# Test API
curl http://$PUBLIC_IP:5001/api/users/services
```

---

## Cost Summary

| Resource | Type | Monthly Cost |
|----------|------|--------------|
| EC2 | t3.small | $15.18 |
| RDS | db.t3.micro | $15.33 |
| S3 | 10GB | $0.50 |
| Data Transfer | 50GB | $4.50 |
| **Total** | | **~$35.51/month** |

---

## Next Steps

1. ✅ Infrastructure setup complete
2. [ ] Configure domain name (Route 53)
3. [ ] Set up SSL certificate (Let's Encrypt)
4. [ ] Configure CI/CD (GitHub Actions)
5. [ ] Set up monitoring (CloudWatch)
6. [ ] Configure automated backups

---

## Troubleshooting

### Can't SSH into EC2?
```bash
# Check instance status
aws ec2 describe-instances --instance-ids $INSTANCE_ID

# Check security group rules
aws ec2 describe-security-groups --group-ids $EC2_SG_ID
```

### Database connection issues?
```bash
# Verify RDS is running
aws rds describe-db-instances --db-instance-identifier barbershop-db

# Check security group allows EC2 → RDS
aws ec2 describe-security-groups --group-ids $RDS_SG_ID
```

### Docker issues on EC2?
```bash
# Check Docker status
sudo systemctl status docker

# View logs
docker-compose logs
```

---

## Cleanup (If needed)

```bash
# Delete all resources (BE CAREFUL!)
aws ec2 terminate-instances --instance-ids $INSTANCE_ID
aws rds delete-db-instance --db-instance-identifier barbershop-db --skip-final-snapshot
aws s3 rb s3://$BUCKET_NAME --force
aws ec2 delete-security-group --group-id $EC2_SG_ID
aws ec2 delete-security-group --group-id $RDS_SG_ID
aws ec2 delete-subnet --subnet-id $PUBLIC_SUBNET_ID
aws ec2 delete-subnet --subnet-id $PRIVATE_SUBNET_1_ID
aws ec2 delete-subnet --subnet-id $PRIVATE_SUBNET_2_ID
aws ec2 detach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID
aws ec2 delete-internet-gateway --internet-gateway-id $IGW_ID
aws ec2 delete-route-table --route-table-id $ROUTE_TABLE_ID
aws ec2 delete-vpc --vpc-id $VPC_ID
```

---

**Setup Time:** 2-3 hours  
**Difficulty:** Intermediate  
**Support:** Contact if you encounter any issues
