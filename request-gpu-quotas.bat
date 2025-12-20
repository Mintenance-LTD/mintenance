@echo off
echo ========================================
echo GPU Quota Increase Request Script
echo ========================================
echo.
echo Current GPU quotas: 0 (cannot launch instances)
echo.
echo This script will request quota increases for:
echo - G instance types (g4dn.xlarge) - CHEAPEST option
echo - P instance types (p3.2xlarge) - FASTEST option
echo.
echo Cost comparison:
echo - g4dn.xlarge: $1.44 total (8-10 hours)
echo - p3.2xlarge: $4.60 total (4-5 hours)
echo.
echo ========================================
echo Requesting quotas...
echo ========================================
echo.

REM Request G instance spot quota (4 vCPUs = 1x g4dn.xlarge)
echo [1/4] Requesting G Spot Instance quota (g4dn.xlarge)...
aws service-quotas request-service-quota-increase ^
    --service-code ec2 ^
    --quota-code L-3819A6DF ^
    --desired-value 4 ^
    --region us-east-1

echo.

REM Request G instance on-demand quota (backup)
echo [2/4] Requesting G On-Demand Instance quota (backup)...
aws service-quotas request-service-quota-increase ^
    --service-code ec2 ^
    --quota-code L-DB2E81BA ^
    --desired-value 4 ^
    --region us-east-1

echo.

REM Request P instance spot quota (8 vCPUs = 1x p3.2xlarge)
echo [3/4] Requesting P Spot Instance quota (p3.2xlarge)...
aws service-quotas request-service-quota-increase ^
    --service-code ec2 ^
    --quota-code L-7212CCBC ^
    --desired-value 8 ^
    --region us-east-1

echo.

REM Request P instance on-demand quota (backup)
echo [4/4] Requesting P On-Demand Instance quota (backup)...
aws service-quotas request-service-quota-increase ^
    --service-code ec2 ^
    --quota-code L-417A185B ^
    --desired-value 8 ^
    --region us-east-1

echo.
echo ========================================
echo Quota requests submitted!
echo ========================================
echo.
echo Approval typically takes 15-30 minutes.
echo.
echo To check status:
echo aws service-quotas list-requested-service-quota-change-history --service-code ec2 --region us-east-1
echo.
echo Once approved, you can launch GPU training with:
echo cd infrastructure\aws
echo bash launch-gpu-training.sh g4dn.xlarge
echo.
echo The script will automatically resume from epoch 56!
echo.
pause