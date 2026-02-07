#!/bin/bash
# Launch AWS Spot Instance for YOLO Training
# Cost-optimized GPU training with automatic setup

set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
INSTANCE_TYPE=${INSTANCE_TYPE:-p3.2xlarge}  # Default to V100 GPU
MAX_PRICE=${MAX_PRICE:-1.00}  # Max $1/hour for spot
KEY_NAME=${KEY_NAME:-mintenance-ml-key}
SECURITY_GROUP=${SECURITY_GROUP:-sg-training}
SUBNET_ID=${SUBNET_ID:-}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Launching AWS Spot Instance for YOLO Training${NC}"
echo -e "${YELLOW}Instance Type: ${INSTANCE_TYPE}${NC}"
echo -e "${YELLOW}Max Price: \$${MAX_PRICE}/hour${NC}"

# Create user data script for instance initialization
cat > user_data.sh << 'EOF'
#!/bin/bash

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install NVIDIA Docker support
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker

# Install Python and dependencies
sudo apt-get install -y python3-pip git
pip3 install torch torchvision ultralytics boto3

# Clone the repository
cd /home/ubuntu
git clone https://github.com/Mintenance-LTD/mintenance.git
cd mintenance/yolo_dataset_full

# Download training data from S3
aws s3 sync s3://mintenance-ml-storage-production/datasets/yolo-training-data ./

# Create training script wrapper
cat > run_training.sh << 'SCRIPT'
#!/bin/bash

# Configure GPU
export CUDA_VISIBLE_DEVICES=0

# Run training with optimized settings
python3 train.py \
    --epochs 300 \
    --batch-size 16 \
    --device 0 \
    --workers 4 \
    --cache ram \
    --project /home/ubuntu/training_output \
    --name production_run \
    --save-period 50 \
    --patience 50 \
    2>&1 | tee training.log

# Upload results to S3
aws s3 sync /home/ubuntu/training_output s3://mintenance-ml-storage-production/training-output/

# Send notification
aws sns publish \
    --topic-arn "arn:aws:sns:${AWS_REGION}:${AWS_ACCOUNT_ID}:mintenance-ml-training-notifications" \
    --message "Training complete! Check S3 for results." \
    --subject "YOLO Training Finished"

# Terminate spot instance to save costs
sudo shutdown -h now
SCRIPT

chmod +x run_training.sh

# Start training in screen session
screen -dmS training bash run_training.sh

echo "Training started in background. Use 'screen -r training' to monitor."
EOF

# Get the latest Deep Learning AMI
AMI_ID=$(aws ec2 describe-images \
    --region ${AWS_REGION} \
    --owners amazon \
    --filters "Name=name,Values=Deep Learning AMI GPU PyTorch * (Ubuntu 20.04)*" \
    --query 'Images[0].ImageId' \
    --output text)

echo -e "${GREEN}Using AMI: ${AMI_ID}${NC}"

# Create spot instance request
SPOT_REQUEST=$(aws ec2 request-spot-instances \
    --region ${AWS_REGION} \
    --spot-price "${MAX_PRICE}" \
    --instance-count 1 \
    --type "one-time" \
    --launch-specification "{
        \"ImageId\": \"${AMI_ID}\",
        \"InstanceType\": \"${INSTANCE_TYPE}\",
        \"KeyName\": \"${KEY_NAME}\",
        \"SecurityGroups\": [\"${SECURITY_GROUP}\"],
        \"UserData\": \"$(base64 -w 0 user_data.sh)\",
        \"BlockDeviceMappings\": [
            {
                \"DeviceName\": \"/dev/sda1\",
                \"Ebs\": {
                    \"VolumeSize\": 100,
                    \"VolumeType\": \"gp3\",
                    \"DeleteOnTermination\": true
                }
            }
        ],
        \"IamInstanceProfile\": {
            \"Name\": \"mintenance-ml-instance-profile\"
        },
        \"TagSpecifications\": [
            {
                \"ResourceType\": \"instance\",
                \"Tags\": [
                    {\"Key\": \"Name\", \"Value\": \"YOLO-Training-Spot\"},
                    {\"Key\": \"Project\", \"Value\": \"Mintenance\"},
                    {\"Key\": \"Type\", \"Value\": \"ML-Training\"}
                ]
            }
        ]
    }" \
    --output json)

# Extract request ID
REQUEST_ID=$(echo $SPOT_REQUEST | jq -r '.SpotInstanceRequests[0].SpotInstanceRequestId')

echo -e "${GREEN}Spot instance request created: ${REQUEST_ID}${NC}"
echo -e "${YELLOW}Waiting for instance to launch...${NC}"

# Wait for instance to be fulfilled
aws ec2 wait spot-instance-request-fulfilled \
    --region ${AWS_REGION} \
    --spot-instance-request-ids ${REQUEST_ID}

# Get instance ID
INSTANCE_ID=$(aws ec2 describe-spot-instance-requests \
    --region ${AWS_REGION} \
    --spot-instance-request-ids ${REQUEST_ID} \
    --query 'SpotInstanceRequests[0].InstanceId' \
    --output text)

echo -e "${GREEN}✅ Instance launched: ${INSTANCE_ID}${NC}"

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --region ${AWS_REGION} \
    --instance-ids ${INSTANCE_ID} \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo -e "${GREEN}Instance IP: ${PUBLIC_IP}${NC}"
echo ""
echo -e "${GREEN}=== Training Started ===${NC}"
echo -e "SSH: ssh -i ~/.ssh/${KEY_NAME}.pem ubuntu@${PUBLIC_IP}"
echo -e "Monitor: screen -r training (after SSH)"
echo ""
echo -e "${YELLOW}Estimated completion: 4-6 hours${NC}"
echo -e "${YELLOW}Estimated cost: \$4.60 (spot) vs \$15.30 (on-demand)${NC}"
echo ""
echo -e "${GREEN}The instance will automatically:${NC}"
echo "1. Download training data"
echo "2. Run YOLO training for 300 epochs"
echo "3. Upload results to S3"
echo "4. Send notification when complete"
echo "5. Terminate itself to save costs"

# Clean up
rm user_data.sh