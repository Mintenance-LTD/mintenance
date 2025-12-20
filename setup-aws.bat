@echo off
echo ===================================
echo AWS CLI Setup for YOLO GPU Training
echo ===================================
echo.

REM Check if AWS CLI is installed
aws --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: AWS CLI is not installed!
    echo.
    echo Please install AWS CLI first:
    echo 1. Run AWSCLIV2.msi installer
    echo 2. Restart this terminal
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)

echo AWS CLI detected!
aws --version
echo.

echo ===================================
echo Step 1: Configure AWS Credentials
echo ===================================
echo.
echo You'll need:
echo - AWS Access Key ID
echo - AWS Secret Access Key
echo - Default region: us-east-1
echo - Output format: json
echo.
echo Press any key to start configuration...
pause >nul

aws configure

echo.
echo ===================================
echo Step 2: Verify Configuration
echo ===================================
aws sts get-caller-identity

if %errorlevel% neq 0 (
    echo.
    echo ERROR: AWS credentials not configured correctly!
    echo Please run 'aws configure' again.
    pause
    exit /b 1
)

echo.
echo ===================================
echo Step 3: Check GPU Quotas
echo ===================================
echo Checking your current GPU instance quotas...
echo.

aws service-quotas get-service-quota --service-code ec2 --quota-code L-74FC7D96 --region us-east-1 2>nul
if %errorlevel% neq 0 (
    echo No P instance quota found - you need to request an increase
)

aws service-quotas get-service-quota --service-code ec2 --quota-code L-DB2E81BA --region us-east-1 2>nul
if %errorlevel% neq 0 (
    echo No G instance quota found - you need to request an increase
)

echo.
echo ===================================
echo IMPORTANT: Request GPU Quota Increases!
echo ===================================
echo.
echo You MUST request GPU quota increases before you can launch instances.
echo.
echo Go to: https://console.aws.amazon.com/servicequotas/
echo.
echo Request these quotas:
echo 1. "All P Spot Instance Requests" - Request: 8
echo 2. "All G and VT Spot Instance Requests" - Request: 4
echo.
echo Approval takes 15-30 minutes.
echo.
echo Press any key to open the AWS Console...
pause >nul

start https://console.aws.amazon.com/servicequotas/home/services/ec2/quotas

echo.
echo ===================================
echo Setup Complete!
echo ===================================
echo.
echo Next steps:
echo 1. Request GPU quotas in the browser (15-30 min approval)
echo 2. Run: cd infrastructure\aws
echo 3. Run: bash quick-setup.sh
echo 4. Run: bash launch-gpu-training.sh g4dn.xlarge
echo.
pause