#!/bin/bash
# Launch GPU Training on AWS - Optimized for Cost & Speed
# This script launches a spot instance and runs YOLO training

set -e

# Load configuration
source aws-config.env 2>/dev/null || {
  echo "❌ Please run quick-setup.sh first!"
  exit 1
}

# Configuration
INSTANCE_TYPE=${1:-g4dn.xlarge}  # Default to cheapest GPU
MAX_PRICE="0.30"  # Max spot price

echo "🚀 Launching GPU Training Instance"
echo "=================================="
echo "Instance Type: $INSTANCE_TYPE"
echo "Max Spot Price: \$$MAX_PRICE/hour"
echo ""

# Pricing guide
cat << EOF
💰 Cost Estimates (Spot Pricing):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
g4dn.xlarge  - \$0.16/hr - 8-10 hours - Total: \$1.44-1.60
g5.xlarge    - \$0.30/hr - 5-7 hours  - Total: \$1.50-2.10
p3.2xlarge   - \$0.92/hr - 4-5 hours  - Total: \$3.68-4.60
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF

read -p "Continue with $INSTANCE_TYPE? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 1
fi

# Get latest Deep Learning AMI
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=Deep Learning AMI GPU PyTorch * (Ubuntu 20.04)*" \
  --query 'Images[0].ImageId' \
  --output text)

echo "Using AMI: $AMI_ID"

# Create user data script
cat > user_data_temp.sh << 'USERDATA'
#!/bin/bash

# Log output
exec > /var/log/user-data.log 2>&1

echo "Starting YOLO training setup..."

# Update and install dependencies
apt-get update
apt-get install -y python3-pip git screen

# Install PyTorch and Ultralytics
pip3 install torch torchvision ultralytics boto3

# Setup working directory
cd /home/ubuntu
mkdir -p training

# Download training data from S3
aws s3 sync s3://BUCKET_PLACEHOLDER/training-data/ /home/ubuntu/training/

# Resume training from checkpoint if exists
cd /home/ubuntu/training

# Create training script
cat > run_training.py << 'TRAINING'
from ultralytics import YOLO
import torch
import os

print(f"GPU Available: {torch.cuda.is_available()}")
print(f"GPU Count: {torch.cuda.device_count()}")
if torch.cuda.is_available():
    print(f"GPU Name: {torch.cuda.get_device_name(0)}")

# Check for checkpoint
checkpoint = None
if os.path.exists('maintenance_production/v1.02/weights/last.pt'):
    checkpoint = 'maintenance_production/v1.02/weights/last.pt'
    print(f"Resuming from checkpoint: {checkpoint}")
else:
    checkpoint = 'yolov8m.pt'
    print("Starting fresh training")

model = YOLO(checkpoint)

# Train with GPU optimization
results = model.train(
    data='data.yaml',
    epochs=300,
    imgsz=640,
    batch=16,  # Larger batch for GPU
    device=0,  # GPU device
    workers=4,
    project='maintenance_production',
    name='gpu_run',
    patience=50,
    save_period=50,
    optimizer='AdamW',
    lr0=0.001,
    cache='ram',
    amp=True,  # Mixed precision for speed
)

# Export to ONNX
print("Exporting to ONNX...")
model.export(format='onnx', simplify=True)

# Upload results to S3
os.system('aws s3 sync maintenance_production/ s3://BUCKET_PLACEHOLDER/results/')
print("Training complete! Results uploaded to S3")

# Terminate instance to save costs
os.system('sudo shutdown -h now')
TRAINING

# Replace bucket placeholder
sed -i 's/BUCKET_PLACEHOLDER/'"$S3_BUCKET"'/g' run_training.py

# Start training in screen
screen -dmS training python3 run_training.py

echo "Training started! Instance will auto-terminate when complete."
echo "To monitor: ssh to instance and run: screen -r training"

USERDATA

# Replace bucket name in user data
sed -i "s/BUCKET_PLACEHOLDER/$S3_BUCKET/g" user_data_temp.sh

# Launch spot instance
echo "Requesting spot instance..."

INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type $INSTANCE_TYPE \
  --key-name $KEY_NAME \
  --security-groups yolo-training-sg \
  --instance-market-options "MarketType=spot,SpotOptions={MaxPrice=$MAX_PRICE,SpotInstanceType=one-time}" \
  --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=100,VolumeType=gp3}" \
  --iam-instance-profile "Name=$INSTANCE_PROFILE" \
  --user-data file://user_data_temp.sh \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=YOLO-GPU-Training},{Key=Project,Value=Mintenance}]" \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "✅ Instance launched: $INSTANCE_ID"

# Wait for instance to be running
echo "Waiting for instance to start..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

# Clean up temp file
rm user_data_temp.sh

echo ""
echo "🎉 GPU Training Instance Ready!"
echo "================================"
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "SSH: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo ""
echo "⏰ Training Timeline:"
echo "- Setup: 5-10 minutes"
echo "- Training: 4-10 hours (depending on instance)"
echo "- Auto-terminates when complete"
echo ""
echo "📊 Monitor progress:"
echo "1. SSH to instance: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo "2. View logs: tail -f /var/log/user-data.log"
echo "3. Check training: screen -r training"
echo ""
echo "💰 Estimated cost: \$1.44-4.60 total"
echo "✨ Results will upload to: s3://$S3_BUCKET/results/"