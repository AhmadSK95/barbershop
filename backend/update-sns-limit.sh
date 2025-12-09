#!/bin/bash

# Update AWS SNS monthly spending limit to $5
# Run this if you have AWS CLI configured

echo "🔧 Updating AWS SNS spending limit to \$5..."

aws sns set-sms-attributes \
  --attributes "MonthlySpendLimit=5" \
  --region us-east-1

if [ $? -eq 0 ]; then
  echo "✅ Successfully updated spending limit to \$5!"
  echo ""
  echo "Verifying..."
  node check-aws-sns-config.js
else
  echo "❌ Failed to update. You may need to:"
  echo "   1. Install AWS CLI: brew install awscli"
  echo "   2. Configure credentials: aws configure"
  echo "   3. Or use AWS Console instead"
fi
