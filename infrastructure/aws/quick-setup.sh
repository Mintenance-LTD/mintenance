#!/bin/bash
# Quick AWS Setup Script for YOLO Training
# Run this after AWS CLI is configured

set -e

echo "🚀 Starting AWS Quick Setup for YOLO Training"
echo "============================================"

# Variables
BUCKET_NAME="mintenance-yolo-training-$(date +%s)"
REGION="us-east-1"
KEY_NAME="yolo-training-key"

# Step 1: Create S3 Bucket
echo "📦 Creating S3 bucket: $BUCKET_NAME"
aws s3 mb s3://$BUCKET_NAME --region $REGION || echo "Bucket might already exist"

# Step 2: Create IAM Role
echo "🔐 Creating IAM role for EC2..."
aws iam create-role --role-name yolo-training-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' 2>/dev/null || echo "Role already exists"

# Attach policies
aws iam attach-role-policy --role-name yolo-training-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess 2>/dev/null || true

# Create instance profile
aws iam create-instance-profile --instance-profile-name yolo-training-profile 2>/dev/null || echo "Profile exists"
aws iam add-role-to-instance-profile \
  --instance-profile-name yolo-training-profile \
  --role-name yolo-training-role 2>/dev/null || true

# Step 3: Create Security Group
echo "🔒 Creating security group..."
SG_ID=$(aws ec2 create-security-group \
  --group-name yolo-training-sg \
  --description "Security group for YOLO training" \
  --query 'GroupId' \
  --output text 2>/dev/null || aws ec2 describe-security-groups \
  --group-names yolo-training-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

echo "Security Group ID: $SG_ID"

# Allow SSH (optional)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0 2>/dev/null || true

# Step 4: Create Key Pair
echo "🔑 Creating key pair..."
aws ec2 create-key-pair --key-name $KEY_NAME \
  --query 'KeyMaterial' \
  --output text > $KEY_NAME.pem 2>/dev/null || echo "Key already exists"

if [ -f "$KEY_NAME.pem" ]; then
  chmod 400 $KEY_NAME.pem
  echo "Key saved to: $KEY_NAME.pem"
fi

# Step 5: Upload training data
echo "📤 Uploading training data to S3..."
echo "This will upload your YOLO dataset (998 images)"
read -p "Do you want to upload now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  aws s3 sync yolo_dataset_full/ s3://$BUCKET_NAME/training-data/ \
    --exclude "*.pyc" \
    --exclude "__pycache__/*" \
    --exclude "runs/*"
  echo "✅ Data uploaded to s3://$BUCKET_NAME/training-data/"
fi

# Step 6: Save configuration
cat > aws-config.env << EOF
export AWS_REGION=$REGION
export S3_BUCKET=$BUCKET_NAME
export SECURITY_GROUP=$SG_ID
export KEY_NAME=$KEY_NAME
export INSTANCE_PROFILE=yolo-training-profile
EOF

echo ""
echo "✅ AWS Setup Complete!"
echo "========================"
echo "Configuration saved to: aws-config.env"
echo ""
echo "📝 Next Steps:"
echo "1. Wait for GPU quota increase approval (check email)"
echo "2. Source the config: source aws-config.env"
echo "3. Launch training: ./launch-gpu-training.sh"
echo ""
echo "Your S3 bucket: $BUCKET_NAME"
echo "Your security group: $SG_ID"
echo "Your key pair: $KEY_NAME"