# SAM 3 Setup Script for Building Surveyor Agent (Windows PowerShell)
# This script sets up the SAM 3 Python service on Windows

Write-Host "🔧 Setting up SAM 3 for Building Surveyor AI..." -ForegroundColor Cyan

# Navigate to SAM 3 service directory
Set-Location apps\sam3-service

# Create virtual environment
Write-Host "📦 Creating Python virtual environment..." -ForegroundColor Yellow
python -m venv venv

# Activate virtual environment
Write-Host "✅ Virtual environment created" -ForegroundColor Green
Write-Host "📝 To activate, run: .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow

# Install dependencies
Write-Host "📥 Installing dependencies..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt

# Authenticate with Hugging Face
Write-Host ""
Write-Host "🔐 Setting up Hugging Face authentication..." -ForegroundColor Yellow
Write-Host "⚠️  IMPORTANT: You must request access to SAM 3 checkpoints first!" -ForegroundColor Red
Write-Host "   1. Visit: https://huggingface.co/facebook/sam3" -ForegroundColor White
Write-Host "   2. Request access to the model" -ForegroundColor White
Write-Host "   3. Once approved, run: hf auth login" -ForegroundColor White
Write-Host "   4. Get your token from: https://huggingface.co/settings/tokens" -ForegroundColor White

# Test installation
Write-Host ""
Write-Host "🧪 Testing SAM 3 installation..." -ForegroundColor Yellow
python -c "import sam3; print('✅ SAM 3 installed successfully')" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  SAM 3 installation may have issues. Check requirements.txt" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ SAM 3 setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Activate virtual environment:" -ForegroundColor White
Write-Host "   cd apps\sam3-service" -ForegroundColor Gray
Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Authenticate with Hugging Face:" -ForegroundColor White
Write-Host "   hf auth login" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start the service:" -ForegroundColor White
Write-Host "   python -m app.main" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Add to your .env.local:" -ForegroundColor White
Write-Host "   SAM3_SERVICE_URL=http://localhost:8001" -ForegroundColor Gray
Write-Host "   ENABLE_SAM3_SEGMENTATION=true" -ForegroundColor Gray

