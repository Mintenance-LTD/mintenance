#!/bin/bash

# SAM 3 Setup Script for Building Surveyor Agent
# This script sets up the SAM 3 Python service

echo "🔧 Setting up SAM 3 for Building Surveyor AI..."

# Navigate to SAM 3 service directory
cd apps/sam3-service || exit

# Create virtual environment
echo "📦 Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "✅ Virtual environment created"
echo "📝 To activate:"
echo "   On Linux/Mac: source venv/bin/activate"
echo "   On Windows: venv\\Scripts\\activate"

# Install dependencies
echo "📥 Installing dependencies..."
source venv/bin/activate 2>/dev/null || venv/Scripts/activate 2>/dev/null || echo "Please activate venv manually"
pip install --upgrade pip
pip install -r requirements.txt

# Authenticate with Hugging Face
echo ""
echo "🔐 Setting up Hugging Face authentication..."
echo "⚠️  IMPORTANT: You must request access to SAM 3 checkpoints first!"
echo "   1. Visit: https://huggingface.co/facebook/sam3"
echo "   2. Request access to the model"
echo "   3. Once approved, run: hf auth login"
echo "   4. Get your token from: https://huggingface.co/settings/tokens"

# Test installation
echo ""
echo "🧪 Testing SAM 3 installation..."
python -c "import sam3; print('✅ SAM 3 installed successfully')" 2>/dev/null || echo "⚠️  SAM 3 installation may have issues. Check requirements.txt"

echo ""
echo "✅ SAM 3 setup complete!"
echo ""
echo "Next steps:"
echo "1. Activate virtual environment:"
echo "   cd apps/sam3-service"
echo "   source venv/bin/activate  # or venv\\Scripts\\activate on Windows"
echo ""
echo "2. Authenticate with Hugging Face:"
echo "   hf auth login"
echo ""
echo "3. Start the service:"
echo "   python -m app.main"
echo ""
echo "4. Add to your .env.local:"
echo "   SAM3_SERVICE_URL=http://localhost:8001"
echo "   ENABLE_SAM3_SEGMENTATION=true"

