#!/bin/bash

# Generate database password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier barbershop-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.14 \
  --master-username barbershop_admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-0ebd32351b42c0700 \
  --db-subnet-group-name barbershop-db-subnet-group \
  --db-name barbershop_db \
  --backup-retention-period 7 \
  --no-publicly-accessible \
  --storage-encrypted \
  --region us-east-1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ RDS creation initiated (will take 5-10 minutes)"
    echo ""
    echo "Database Password: $DB_PASSWORD"
    echo ""
    echo "⚠️  SAVE THIS PASSWORD!"
fi
