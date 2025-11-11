#!/bin/bash

# Barbershop AWS Infrastructure Setup Script
# This script automates the creation of all AWS resources needed for deployment

set -e  # Exit on any error

echo "=========================================="
echo "Barbershop AWS Infrastructure Setup"
echo "=========================================="
echo ""
echo "This script will create:"
echo "  - VPC with public and private subnets"
echo "  - Security groups for EC2 and RDS"
echo "  - EC2 instance (t3.small)"
echo "  - RDS PostgreSQL database (db.t3.micro)"
echo "  - S3 bucket for backups"
echo "  - SSH key pair"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 1
fi

# Configuration
REGION="us-east-1"
PROJECT_NAME="barbershop"

echo ""
echo "Step 1/11: Creating VPC..."
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=${PROJECT_NAME}-vpc}]" \
  --query 'Vpc.VpcId' \
  --output text \
  --region $REGION)

echo "✅ VPC created: $VPC_ID"

# Enable DNS
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames --region $REGION

echo ""
echo "Step 2/11: Creating Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=${PROJECT_NAME}-igw}]" \
  --query 'InternetGateway.InternetGatewayId' \
  --output text \
  --region $REGION)

aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID --region $REGION
echo "✅ Internet Gateway created: $IGW_ID"

echo ""
echo "Step 3/11: Creating Subnets..."
PUBLIC_SUBNET_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone ${REGION}a \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-subnet}]" \
  --query 'Subnet.SubnetId' \
  --output text \
  --region $REGION)

PRIVATE_SUBNET_1_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone ${REGION}a \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-subnet-1}]" \
  --query 'Subnet.SubnetId' \
  --output text \
  --region $REGION)

PRIVATE_SUBNET_2_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.3.0/24 \
  --availability-zone ${REGION}b \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-subnet-2}]" \
  --query 'Subnet.SubnetId' \
  --output text \
  --region $REGION)

aws ec2 modify-subnet-attribute --subnet-id $PUBLIC_SUBNET_ID --map-public-ip-on-launch --region $REGION

echo "✅ Public Subnet: $PUBLIC_SUBNET_ID"
echo "✅ Private Subnet 1: $PRIVATE_SUBNET_1_ID"
echo "✅ Private Subnet 2: $PRIVATE_SUBNET_2_ID"

echo ""
echo "Step 4/11: Creating Route Table..."
ROUTE_TABLE_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-rt}]" \
  --query 'RouteTable.RouteTableId' \
  --output text \
  --region $REGION)

aws ec2 create-route \
  --route-table-id $ROUTE_TABLE_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID \
  --region $REGION > /dev/null

aws ec2 associate-route-table \
  --route-table-id $ROUTE_TABLE_ID \
  --subnet-id $PUBLIC_SUBNET_ID \
  --region $REGION > /dev/null

echo "✅ Route Table created: $ROUTE_TABLE_ID"

echo ""
echo "Step 5/11: Creating Security Groups..."
EC2_SG_ID=$(aws ec2 create-security-group \
  --group-name ${PROJECT_NAME}-ec2-sg \
  --description "Security group for ${PROJECT_NAME} EC2 instance" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text \
  --region $REGION)

# Add EC2 security group rules
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $REGION > /dev/null
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $REGION > /dev/null
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $REGION > /dev/null
aws ec2 authorize-security-group-ingress --group-id $EC2_SG_ID --protocol tcp --port 5001 --cidr 0.0.0.0/0 --region $REGION > /dev/null

echo "✅ EC2 Security Group: $EC2_SG_ID"

RDS_SG_ID=$(aws ec2 create-security-group \
  --group-name ${PROJECT_NAME}-rds-sg \
  --description "Security group for ${PROJECT_NAME} RDS instance" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text \
  --region $REGION)

aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $EC2_SG_ID \
  --region $REGION > /dev/null

echo "✅ RDS Security Group: $RDS_SG_ID"

echo ""
echo "Step 6/11: Creating SSH Key Pair..."
aws ec2 create-key-pair \
  --key-name ${PROJECT_NAME}-key \
  --query 'KeyMaterial' \
  --output text \
  --region $REGION > ${PROJECT_NAME}-key.pem

chmod 400 ${PROJECT_NAME}-key.pem
echo "✅ SSH Key saved: $(pwd)/${PROJECT_NAME}-key.pem"

echo ""
echo "Step 7/11: Finding Latest Ubuntu AMI..."
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text \
  --region $REGION)

echo "✅ Ubuntu AMI: $AMI_ID"

echo ""
echo "Step 8/11: Launching EC2 Instance (t3.small)..."
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.small \
  --key-name ${PROJECT_NAME}-key \
  --security-group-ids $EC2_SG_ID \
  --subnet-id $PUBLIC_SUBNET_ID \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=30,VolumeType=gp3}' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${PROJECT_NAME}-app}]" \
  --query 'Instances[0].InstanceId' \
  --output text \
  --region $REGION)

echo "✅ EC2 Instance launching: $INSTANCE_ID"
echo "   Waiting for instance to start (this may take 1-2 minutes)..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text \
  --region $REGION)

echo "✅ EC2 Instance running at: $PUBLIC_IP"

echo ""
echo "Step 9/11: Creating RDS DB Subnet Group..."
aws rds create-db-subnet-group \
  --db-subnet-group-name ${PROJECT_NAME}-db-subnet-group \
  --db-subnet-group-description "Subnet group for ${PROJECT_NAME} DB" \
  --subnet-ids $PRIVATE_SUBNET_1_ID $PRIVATE_SUBNET_2_ID \
  --region $REGION > /dev/null

echo "✅ DB Subnet Group created"

echo ""
echo "Step 10/11: Generating Database Password..."
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "✅ Database password generated"

echo ""
echo "Step 11/11: Creating RDS PostgreSQL Instance (db.t3.micro)..."
echo "   This will take 5-10 minutes..."
aws rds create-db-instance \
  --db-instance-identifier ${PROJECT_NAME}-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.14 \
  --master-username ${PROJECT_NAME}_admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name ${PROJECT_NAME}-db-subnet-group \
  --db-name ${PROJECT_NAME}_db \
  --backup-retention-period 7 \
  --no-publicly-accessible \
  --storage-encrypted \
  --region $REGION > /dev/null

echo "   Waiting for database to become available..."
aws rds wait db-instance-available --db-instance-identifier ${PROJECT_NAME}-db --region $REGION

DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier ${PROJECT_NAME}-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text \
  --region $REGION)

echo "✅ RDS Instance available at: $DB_ENDPOINT"

echo ""
echo "Step 12/11: Creating S3 Bucket..."
BUCKET_NAME="${PROJECT_NAME}-app-$(date +%s)"
aws s3api create-bucket --bucket $BUCKET_NAME --region $REGION > /dev/null 2>&1 || true
aws s3api put-bucket-versioning --bucket $BUCKET_NAME --versioning-configuration Status=Enabled --region $REGION > /dev/null
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region $REGION > /dev/null

echo "✅ S3 Bucket: $BUCKET_NAME"

echo ""
echo "=========================================="
echo "✅ AWS Infrastructure Setup Complete!"
echo "=========================================="
echo ""

# Save configuration
CONFIG_FILE="aws-config.env"
cat > $CONFIG_FILE << EOF
# AWS Infrastructure Configuration
# Generated: $(date)

# Region
AWS_REGION=$REGION

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
SSH_KEY_FILE=$(pwd)/${PROJECT_NAME}-key.pem

# RDS
DB_ENDPOINT=$DB_ENDPOINT
DB_NAME=${PROJECT_NAME}_db
DB_USER=${PROJECT_NAME}_admin
DB_PASSWORD=$DB_PASSWORD
DB_PORT=5432

# S3
S3_BUCKET=$BUCKET_NAME

# Connection Strings
DATABASE_URL=postgresql://${PROJECT_NAME}_admin:$DB_PASSWORD@$DB_ENDPOINT:5432/${PROJECT_NAME}_db
SSH_COMMAND=ssh -i $(pwd)/${PROJECT_NAME}-key.pem ubuntu@$PUBLIC_IP
EOF

echo "📄 Configuration saved to: $CONFIG_FILE"
echo ""
echo "🔑 Important Information:"
echo "   SSH Key: $(pwd)/${PROJECT_NAME}-key.pem"
echo "   Public IP: $PUBLIC_IP"
echo "   Database Endpoint: $DB_ENDPOINT"
echo "   Database Password: $DB_PASSWORD"
echo ""
echo "⚠️  SAVE THE DATABASE PASSWORD! You'll need it for deployment."
echo ""
echo "Next Steps:"
echo "1. Review the configuration in $CONFIG_FILE"
echo "2. SSH into your server: ssh -i ${PROJECT_NAME}-key.pem ubuntu@$PUBLIC_IP"
echo "3. Deploy your application"
echo ""
echo "Monthly Cost Estimate: ~\$35-40/month"
echo ""
