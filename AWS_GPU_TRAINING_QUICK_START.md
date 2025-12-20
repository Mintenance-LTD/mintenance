# AWS GPU Training Quick Start Guide

## Current Training Status
- **Local Training**: Stopped at epoch 56/300 (18.7% complete)
- **Performance**: mAP@50: 22.9%, Precision: 69.9%, Recall: 20.9%
- **Checkpoint Saved**: `maintenance_production/v1.02/weights/last.pt` (149 MB)
- **Time Remaining**: ~244 epochs (~33-37 hours on CPU vs 3-8 hours on GPU)

## Step 1: Install AWS CLI ✅
You've already downloaded `AWSCLIV2.msi`. Please:
1. Double-click `AWSCLIV2.msi` to run the installer
2. Follow the installation wizard (default options are fine)
3. Restart your terminal/command prompt after installation
4. Verify installation: `aws --version`

## Step 2: Configure AWS Credentials
After installing AWS CLI, run:
```bash
aws configure
```

You'll need:
- **AWS Access Key ID**: Get from AWS Console → IAM → Users → Your User → Security credentials
- **AWS Secret Access Key**: Saved when you created the access key
- **Default region**: Enter `us-east-1` (cheapest for GPUs)
- **Default output format**: Enter `json`

## Step 3: Request GPU Quota Increase (CRITICAL - Do This First!)
**THIS IS TIME-SENSITIVE - Approval takes 15-30 minutes**

1. Go to: https://console.aws.amazon.com/servicequotas/
2. Search for "EC2"
3. Request increases for these quotas:

### Required Quotas:
| Quota Name | Current | Request | Purpose |
|-----------|---------|---------|---------|
| Running On-Demand P instances | 0 | 8 | For p3.2xlarge if spot fails |
| All P Spot Instance Requests | 0 | 8 | For p3.2xlarge spot ($0.92/hr) |
| Running On-Demand G and VT instances | 0 | 4 | For g4dn.xlarge if spot fails |
| All G and VT Spot Instance Requests | 0 | 4 | For g4dn.xlarge spot ($0.16/hr) |

### How to Request:
1. Click on each quota name
2. Click "Request quota increase"
3. Enter the new value
4. Add reason: "YOLO model training for computer vision application"
5. Submit

## Step 4: Run Quick Setup Script
While waiting for quota approval, set up your infrastructure:

```bash
cd infrastructure/aws
bash quick-setup.sh
```

This will:
- Create S3 bucket for training data
- Set up IAM roles and permissions
- Create security groups
- Generate SSH key pair
- Save configuration to `aws-config.env`

## Step 5: Upload Training Data
The script will ask if you want to upload training data. Say **yes** to upload your 998 images.

## Step 6: Launch GPU Training

Once quota is approved, choose your instance:

### Option A: Cheapest (Recommended for First Run)
```bash
bash launch-gpu-training.sh g4dn.xlarge
```
- **Cost**: ~$1.44 total (8-10 hours @ $0.16/hr)
- **GPU**: NVIDIA T4 (16GB)
- **Speed**: 30 epochs/hour

### Option B: Faster
```bash
bash launch-gpu-training.sh g5.xlarge
```
- **Cost**: ~$1.80 total (5-7 hours @ $0.30/hr)
- **GPU**: NVIDIA A10G (24GB)
- **Speed**: 45 epochs/hour

### Option C: Fastest
```bash
bash launch-gpu-training.sh p3.2xlarge
```
- **Cost**: ~$4.60 total (4-5 hours @ $0.92/hr)
- **GPU**: NVIDIA V100 (16GB)
- **Speed**: 60 epochs/hour

## Training Will Resume Automatically!
The script automatically detects your checkpoint at epoch 56 and continues from there:
- Epochs 1-56: ✅ Already complete (16.8 hours on CPU)
- Epochs 57-300: Will run on GPU (3-8 hours)

## Monitor Progress
After launching, you'll get:
- Instance ID and Public IP
- SSH command to connect
- Commands to monitor training

To check progress:
```bash
# SSH to instance (replace IP)
ssh -i yolo-training-key.pem ubuntu@<PUBLIC_IP>

# View training logs
tail -f /var/log/user-data.log

# Watch live training
screen -r training
```

## Auto-Termination
**Important**: The instance auto-terminates when training completes to save money!
- Results automatically upload to S3
- Model saved to: `s3://your-bucket/results/`
- Instance shuts down after upload

## After Training Completes
1. Download final model from S3:
```bash
aws s3 cp s3://your-bucket/results/maintenance_production/gpu_run/weights/best.pt ./best_model.pt
```

2. Model will have:
- mAP@50: >70% (target)
- ONNX export for deployment
- TorchScript export for mobile

## Cost Summary
| Instance | Time | Total Cost | Savings vs On-Demand |
|----------|------|------------|---------------------|
| g4dn.xlarge | 8-10h | $1.44 | 70% saved |
| g5.xlarge | 5-7h | $1.80 | 70% saved |
| p3.2xlarge | 4-5h | $4.60 | 70% saved |

## Troubleshooting

### "Capacity Error" on Spot Instance
- Try different availability zone: Add `--availability-zone us-east-1b`
- Or use on-demand (more expensive): Remove `--instance-market-options` line

### "Quota Exceeded" Error
- Check quota request status at: https://console.aws.amazon.com/servicequotas/
- Approval usually takes 15-30 minutes

### SSH Connection Refused
- Wait 2-3 minutes for instance to fully boot
- Check security group allows SSH from your IP

### Training Not Starting
- SSH to instance and check: `tail -f /var/log/user-data.log`
- Look for Python/CUDA errors

## Quick Commands Reference
```bash
# Check quota status
aws service-quotas get-service-quota --service-code ec2 --quota-code L-74FC7D96

# List running instances
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running"

# Stop instance (if needed)
aws ec2 stop-instances --instance-ids <INSTANCE_ID>

# Download results
aws s3 sync s3://your-bucket/results/ ./results/
```

## Support
- AWS Free Tier includes some EC2 usage
- Spot instances save 70% vs on-demand
- Instance auto-terminates to prevent overcharges
- Monitor AWS billing dashboard regularly