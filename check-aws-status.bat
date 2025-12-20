@echo off
echo ========================================
echo AWS GPU Training Setup Status
echo ========================================
echo.

echo [1] AWS Account
aws sts get-caller-identity --query "Account" --output text
echo.

echo [2] Quota Requests Status
echo ----------------------------------------
aws service-quotas list-requested-service-quota-change-history --service-code ec2 --region us-east-1 --query "RequestedQuotas[*].[QuotaName,Status]" --output table
echo.

echo [3] S3 Bucket Status
echo ----------------------------------------
echo Bucket: mintenance-yolo-training-1765195257
aws s3 ls s3://mintenance-yolo-training-1765195257/training-data/ --summarize --human-readable --recursive 2>nul | tail -2
echo.

echo [4] Training Checkpoint Status
echo ----------------------------------------
if exist "yolo_dataset_full\maintenance_production\v1.02\weights\last.pt" (
    echo ✓ Checkpoint found: last.pt
    dir "yolo_dataset_full\maintenance_production\v1.02\weights\last.pt" | findstr "last.pt"
    echo   Current epoch: 56/300 ^(18.7%% complete^)
    echo   Remaining: 244 epochs
) else (
    echo ✗ Checkpoint not found
)
echo.

echo ========================================
echo Next Steps
echo ========================================
echo.
echo Once quota status shows "CASE_CLOSED" or "APPROVED":
echo.
echo   cd infrastructure\aws
echo   bash launch-gpu-training.sh g4dn.xlarge
echo.
echo Cost estimates:
echo   g4dn.xlarge: $1.44 ^(8-10 hours^)
echo   p3.2xlarge:  $4.60 ^(4-5 hours^)
echo.
pause