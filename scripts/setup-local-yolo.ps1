# PowerShell script to set up local YOLO inference
# Run this script to configure the environment for local YOLO model inference

Write-Host "Setting up Local YOLO Inference..." -ForegroundColor Cyan

# Step 1: Create models directory
Write-Host "`n[1/4] Creating models directory..." -ForegroundColor Yellow
$modelsDir = "apps\web\models"
if (-not (Test-Path $modelsDir)) {
    New-Item -ItemType Directory -Path $modelsDir -Force | Out-Null
    Write-Host "✅ Created $modelsDir" -ForegroundColor Green
} else {
    Write-Host "✅ Directory already exists: $modelsDir" -ForegroundColor Green
}

# Step 2: Check for .env.local
Write-Host "`n[2/4] Checking .env.local configuration..." -ForegroundColor Yellow
$envFile = ".env.local"
$envExists = Test-Path $envFile

if (-not $envExists) {
    Write-Host "⚠️  .env.local not found. Creating template..." -ForegroundColor Yellow
    $envTemplate = @"
# Local YOLO Inference Configuration
USE_LOCAL_YOLO=true
YOLO_MODEL_PATH=./models/yolov11.onnx
YOLO_DATA_YAML_PATH=./Building Defect Detection 7.v2i.yolov11/data.yaml
YOLO_CONFIDENCE_THRESHOLD=0.25
YOLO_IOU_THRESHOLD=0.45

# Roboflow API (fallback)
# ROBOFLOW_API_KEY=your_api_key_here
# ROBOFLOW_MODEL_ID=your_model_id
# ROBOFLOW_MODEL_VERSION=2
"@
    Set-Content -Path $envFile -Value $envTemplate
    Write-Host "✅ Created .env.local template" -ForegroundColor Green
    Write-Host "⚠️  Please review and update .env.local with your actual values" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env.local exists" -ForegroundColor Green
    Write-Host "⚠️  Please ensure these variables are set:" -ForegroundColor Yellow
    Write-Host "   - USE_LOCAL_YOLO=true" -ForegroundColor Gray
    Write-Host "   - YOLO_MODEL_PATH=./models/yolov11.onnx" -ForegroundColor Gray
    Write-Host "   - YOLO_DATA_YAML_PATH=./Building Defect Detection 7.v2i.yolov11/data.yaml" -ForegroundColor Gray
}

# Step 3: Check for Python and ultralytics
Write-Host "`n[3/4] Checking Python environment..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
    
    # Check for ultralytics
    $ultralyticsCheck = python -c "import ultralytics; print('ok')" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ ultralytics package installed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  ultralytics not installed. Install with:" -ForegroundColor Yellow
        Write-Host "   pip install ultralytics" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Python not found or not in PATH" -ForegroundColor Yellow
    Write-Host "   Please install Python and add it to PATH" -ForegroundColor Gray
}

# Step 4: Check for model files
Write-Host "`n[4/4] Checking model files..." -ForegroundColor Yellow
$modelPath = "runs\detect\building-defect-v2-normalized-cpu\weights\best.pt"
$onnxPath = "apps\web\models\yolov11.onnx"

if (Test-Path $modelPath) {
    Write-Host "✅ Found PyTorch model: $modelPath" -ForegroundColor Green
} else {
    Write-Host "⚠️  PyTorch model not found: $modelPath" -ForegroundColor Yellow
}

if (Test-Path $onnxPath) {
    Write-Host "✅ Found ONNX model: $onnxPath" -ForegroundColor Green
} else {
    Write-Host "⚠️  ONNX model not found: $onnxPath" -ForegroundColor Yellow
    Write-Host "   Run: python scripts/convert-yolo-to-onnx.py" -ForegroundColor Gray
}

Write-Host "`n✅ Setup check complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Convert model: python scripts/convert-yolo-to-onnx.py" -ForegroundColor White
Write-Host "2. Install dependencies: npm install" -ForegroundColor White
Write-Host "3. Restart server: npm run dev" -ForegroundColor White

