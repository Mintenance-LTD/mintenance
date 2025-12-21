# AWS Credentials Setup

Your current credentials are invalid. You need to get new ones from AWS Console.

## Step 1: Get Your AWS Credentials

1. **Go to AWS Console**: https://console.aws.amazon.com/
2. **Sign in** with your AWS account
3. **Navigate to IAM**:
   - Click your username in the top-right corner
   - Select "Security credentials"
   OR
   - Go directly to: https://console.aws.amazon.com/iam/home#/security_credentials

4. **Create Access Key**:
   - Scroll to "Access keys" section
   - Click "Create access key"
   - Select "Command Line Interface (CLI)"
   - Check the confirmation box
   - Click "Create access key"
   - **IMPORTANT**: Save both the Access Key ID and Secret Access Key

## Step 2: Configure AWS CLI

Run this command in your terminal:
```bash
aws configure
```

Enter the following when prompted:
- **AWS Access Key ID**: [Enter your new Access Key ID]
- **AWS Secret Access Key**: [Enter your new Secret Access Key]
- **Default region name**: `us-east-1` (better GPU availability than eu-north-1)
- **Default output format**: `json`

## Step 3: Verify Configuration

After configuring, verify it works:
```bash
aws sts get-caller-identity
```

You should see your account details if successful.

## Step 4: CRITICAL - Request GPU Quotas

**DO THIS NOW - IT TAKES 15-30 MINUTES TO APPROVE!**

Go to: https://console.aws.amazon.com/servicequotas/home/services/ec2/quotas

Search and request increases for these quotas:

| Quota Name | Request Value | Why |
|------------|---------------|-----|
| All G and VT Spot Instance Requests | 4 | For g4dn.xlarge GPU ($0.16/hr) |
| Running On-Demand G and VT instances | 4 | Backup if spot unavailable |
| All P Spot Instance Requests | 8 | For p3.2xlarge GPU ($0.92/hr) |
| Running On-Demand P instances | 8 | Backup if spot unavailable |

**How to request:**
1. Click on each quota name
2. Click "Request increase"
3. Enter the new value (4 or 8)
4. Reason: "YOLO model training for computer vision application"
5. Submit

## Why This Is Important

- Your YOLO training is stuck at epoch 56/300 (18.7% complete)
- Remaining training on CPU: 33-37 hours
- With GPU: Only 3-8 hours
- Cost: $1.44-$4.60 total (spot instances)

## Quick Commands After Setup

```bash
# Check quota status
aws service-quotas list-requested-service-quota-change-history --service-code ec2

# Once approved, launch GPU training
cd infrastructure/aws
bash quick-setup.sh
bash launch-gpu-training.sh g4dn.xlarge
```

The training will automatically resume from epoch 56!