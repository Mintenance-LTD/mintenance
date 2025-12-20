# AWS Infrastructure Setup Guide for YOLO Training

## Overview
This guide will help you set up cost-optimized AWS infrastructure for YOLO model training using spot instances, saving up to 70% on GPU costs.

## Quick Start (5 Minutes)

### Prerequisites
1. AWS Account with billing enabled
2. AWS CLI installed and configured
3. Terraform installed (optional, for infrastructure as code)

### Step 1: Configure AWS CLI
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output: json
```

### Step 2: Create IAM Role and Instance Profile
```bash
# Create IAM role for EC2 instances
aws iam create-role --role-name mintenance-ml-ec2-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach policies
aws iam attach-role-policy --role-name mintenance-ml-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy --role-name mintenance-ml-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly

# Create instance profile
aws iam create-instance-profile --instance-profile-name mintenance-ml-instance-profile
aws iam add-role-to-instance-profile \
  --instance-profile-name mintenance-ml-instance-profile \
  --role-name mintenance-ml-ec2-role
```

### Step 3: Create S3 Bucket
```bash
# Create S3 bucket for training data and models
aws s3 mb s3://mintenance-ml-storage-production --region us-east-1

# Create folder structure
aws s3api put-object --bucket mintenance-ml-storage-production --key datasets/
aws s3api put-object --bucket mintenance-ml-storage-production --key models/
aws s3api put-object --bucket mintenance-ml-storage-production --key training-output/
```

### Step 4: Upload Training Data
```bash
# Upload your local training data to S3
cd yolo_dataset_full
aws s3 sync . s3://mintenance-ml-storage-production/datasets/yolo-training-data/ \
  --exclude "*.pyc" --exclude "__pycache__/*"
```

### Step 5: Create Security Group
```bash
# Create security group for training instances
aws ec2 create-security-group \
  --group-name mintenance-ml-training-sg \
  --description "Security group for ML training instances"

# Allow SSH access (optional, for debugging)
aws ec2 authorize-security-group-ingress \
  --group-name mintenance-ml-training-sg \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0
```

### Step 6: Create Key Pair (Optional, for SSH)
```bash
aws ec2 create-key-pair --key-name mintenance-ml-key \
  --query 'KeyMaterial' --output text > ~/.ssh/mintenance-ml-key.pem
chmod 400 ~/.ssh/mintenance-ml-key.pem
```

## Launching Training Instances

### Option 1: Quick Spot Instance Launch (Recommended)
```bash
# Run the provided script
chmod +x infrastructure/aws/launch-spot-training.sh
./infrastructure/aws/launch-spot-training.sh
```

### Option 2: SageMaker Training Job (Managed Service)
```bash
# Install dependencies
pip install sagemaker boto3

# Run SageMaker training job
python infrastructure/aws/sagemaker-training-job.py
```

### Option 3: Manual EC2 Launch
```bash
# Launch p3.2xlarge spot instance
aws ec2 run-instances \
  --image-id ami-0c94855ba95c574c8 \
  --instance-type p3.2xlarge \
  --key-name mintenance-ml-key \
  --security-groups mintenance-ml-training-sg \
  --instance-market-options "MarketType=spot,SpotOptions={MaxPrice=1.00}" \
  --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=100}" \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=YOLO-Training}]"
```

## Cost Optimization Tips

### 1. Use Spot Instances (70% Savings)
- **p3.2xlarge**: $0.92/hour (spot) vs $3.06/hour (on-demand)
- **g4dn.xlarge**: $0.16/hour (spot) vs $0.526/hour (on-demand)

### 2. Instance Recommendations by Budget

| Budget | Instance | GPU | Training Time | Total Cost |
|--------|----------|-----|--------------|------------|
| **Minimum** | g4dn.xlarge | T4 | 8-10 hours | $1.44 |
| **Balanced** | g5.xlarge | A10G | 5-7 hours | $1.80 |
| **Fast** | p3.2xlarge | V100 | 4-5 hours | $4.60 |
| **Ultra-Fast** | p3.8xlarge | 4xV100 | 2-3 hours | $11.00 |

### 3. Auto-Termination Script
Add this to your training script to auto-terminate after completion:
```python
import boto3
import requests

# Get instance ID
instance_id = requests.get('http://169.254.169.254/latest/meta-data/instance-id').text

# Terminate after training
ec2 = boto3.client('ec2', region_name='us-east-1')
ec2.terminate_instances(InstanceIds=[instance_id])
```

## Monitoring Training Progress

### CloudWatch Metrics
```bash
# View training metrics
aws cloudwatch get-metric-statistics \
  --namespace "ML/Training" \
  --metric-name "mAP" \
  --dimensions Name=TrainingJob,Value=yolo-training \
  --statistics Maximum \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-12-31T23:59:59Z \
  --period 300
```

### S3 Model Download
```bash
# Download trained model
aws s3 cp s3://mintenance-ml-storage-production/training-output/best.pt ./
aws s3 cp s3://mintenance-ml-storage-production/training-output/best.onnx ./
```

## Terraform Deployment (Infrastructure as Code)

### Deploy Complete Infrastructure
```bash
cd infrastructure/aws
terraform init
terraform plan
terraform apply
```

### Destroy Infrastructure (Clean Up)
```bash
terraform destroy
```

## Budget Alerts

### Set Up Cost Alerts
```bash
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

Create `budget.json`:
```json
{
  "BudgetName": "ML-Training-Budget",
  "BudgetLimit": {
    "Amount": "50",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

## Troubleshooting

### Common Issues

1. **Spot Instance Request Failed**
   - Increase max price slightly
   - Try different availability zones
   - Use different instance types

2. **Out of Memory During Training**
   - Reduce batch size
   - Use gradient accumulation
   - Switch to larger instance

3. **Training Too Slow**
   - Upgrade to p3.2xlarge or p3.8xlarge
   - Enable mixed precision training
   - Use cached datasets

### Support Commands
```bash
# Check spot pricing history
aws ec2 describe-spot-price-history \
  --instance-types p3.2xlarge \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --product-descriptions "Linux/UNIX" \
  --query 'SpotPriceHistory[*].[SpotPrice,AvailabilityZone]' \
  --output table

# List running instances
aws ec2 describe-instances \
  --filters "Name=tag:Project,Values=Mintenance" \
  --query 'Reservations[*].Instances[*].[InstanceId,State.Name,InstanceType,PublicIpAddress]' \
  --output table

# Cancel spot request
aws ec2 cancel-spot-instance-requests --spot-instance-request-ids REQUEST_ID
```

## Estimated Costs Summary

### Per Training Run (300 Epochs)
- **Local CPU**: $0 (40-48 hours)
- **AWS g4dn.xlarge Spot**: $1.44 (9 hours)
- **AWS p3.2xlarge Spot**: $4.60 (5 hours)
- **AWS p3.2xlarge On-Demand**: $15.30 (5 hours)
- **SageMaker with Spot**: $5-6 (managed service)

### Monthly (4 Training Runs)
- **Storage (S3)**: $5
- **Training (4x p3.2xlarge spot)**: $18.40
- **Data Transfer**: $5
- **Total**: ~$30/month

## Next Steps

1. **Test with Small Dataset First**
   - Use 100 images to verify setup
   - Estimated time: 30 minutes
   - Cost: < $1

2. **Production Training**
   - Full 1000 image dataset
   - 300 epochs
   - Deploy to production

3. **Set Up Continuous Training**
   - GitHub Actions integration
   - Automated retraining on new data
   - A/B testing framework

## Support

For issues or questions:
- Check CloudWatch logs
- Review S3 training outputs
- Monitor EC2 instance status
- Email alerts via SNS

---

**Remember**: Always terminate instances after training to avoid unnecessary charges!