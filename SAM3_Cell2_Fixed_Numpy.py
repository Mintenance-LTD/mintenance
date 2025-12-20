# ═══════════════════════════════════════════════════════════════
# Cell 2: Install Dependencies & Load SAM 3 Model (NUMPY FIX)
# ═══════════════════════════════════════════════════════════════

# CRITICAL FIX: Handle numpy version conflicts in Colab
print("=" * 70)
print("🔧 Fixing numpy compatibility issues...")
print("=" * 70)

# Step 1: Uninstall conflicting packages
print("\n📦 Step 1: Cleaning up conflicting packages...")
!pip uninstall -y numpy opencv-python opencv-contrib-python opencv-python-headless

# Step 2: Install compatible numpy version first
print("\n📦 Step 2: Installing numpy 2.x for compatibility...")
!pip install "numpy>=2.0.0,<2.3.0" --quiet

# Step 3: Reinstall OpenCV with correct numpy
print("\n📦 Step 3: Reinstalling OpenCV...")
!pip install opencv-python-headless --quiet

# Step 4: Install SAM3 WITHOUT upgrading/downgrading dependencies
print("\n📦 Step 4: Installing SAM3...")
!pip install sam3 --no-deps --quiet

# Step 5: Install SAM3 dependencies individually with version control
print("\n📦 Step 5: Installing SAM3 dependencies...")
!pip install torch torchvision torchaudio --quiet
!pip install pillow transformers --quiet

print("\n✅ Package installation complete!")
print("=" * 70)

# Verify installations
import sys
print(f"\n🔍 Verifying installations...")
print(f"Python version: {sys.version.split()[0]}")

import numpy as np
print(f"NumPy version: {np.__version__}")

import cv2
print(f"OpenCV version: {cv2.__version__}")

import torch
print(f"PyTorch version: {torch.__version__}")

# Now import SAM3 components
print("\n📥 Importing SAM3 components...")
try:
    from sam3.model_builder import build_sam3_image_model
    from sam3.model.sam3_image_processor import Sam3Processor
    print("✅ SAM3 imports successful")
except ImportError as e:
    print(f"❌ SAM3 import failed: {e}")
    print("\n🔧 Attempting alternative installation method...")

    # Alternative: Install from source
    !pip install git+https://github.com/facebookresearch/segment-anything-3.git --quiet

    # Retry import
    from sam3.model_builder import build_sam3_image_model
    from sam3.model.sam3_image_processor import Sam3Processor
    print("✅ SAM3 imports successful (from source)")

from PIL import Image

print("\n" + "=" * 70)
print("🖥️  Hardware Configuration")
print("=" * 70)

# Check GPU availability
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"\n📍 Device: {device}")

if device == "cuda":
    print(f"   GPU: {torch.cuda.get_device_name(0)}")
    print(f"   CUDA Version: {torch.version.cuda}")
    memory_gb = torch.cuda.get_device_properties(0).total_memory / 1024**3
    print(f"   GPU Memory: {memory_gb:.1f} GB")

    # Check available memory
    allocated_gb = torch.cuda.memory_allocated(0) / 1024**3
    reserved_gb = torch.cuda.memory_reserved(0) / 1024**3
    print(f"   Memory Allocated: {allocated_gb:.2f} GB")
    print(f"   Memory Reserved: {reserved_gb:.2f} GB")
    print(f"   Memory Available: {memory_gb - reserved_gb:.2f} GB")
else:
    print("\n⚠️  WARNING: Running on CPU - this will be VERY slow!")
    print("   Recommended: Use a GPU runtime")
    print("   Fix: Runtime → Change runtime type → GPU (T4)")

print("\n" + "=" * 70)
print("📥 Loading SAM 3 Model from Hugging Face...")
print("=" * 70)

try:
    # Load SAM 3 model with official 2025 API
    print("\n⏳ Downloading model (this may take 2-5 minutes)...")

    model = build_sam3_image_model(
        device=device,
        load_from_HF=True  # Download from HuggingFace
    )

    print("✅ Model loaded successfully")

    # Initialize processor
    print("\n⏳ Initializing image processor...")
    processor = Sam3Processor(model)

    print("✅ Processor initialized")

    # Model info
    print(f"\n📊 Model Information:")
    print(f"   Parameters: ~848M")
    print(f"   Model device: {next(model.parameters()).device}")
    print(f"   Model dtype: {next(model.parameters()).dtype}")

    # Memory check after loading
    if device == "cuda":
        allocated_gb = torch.cuda.memory_allocated(0) / 1024**3
        print(f"   GPU Memory Used: {allocated_gb:.2f} GB")

except Exception as e:
    print(f"\n❌ ERROR loading SAM 3 model: {e}")
    print("\n🔍 Troubleshooting Guide:")
    print("=" * 70)
    print("1. Hugging Face Authentication:")
    print("   - Ensure you ran Cell 1 and logged in successfully")
    print("   - Token must have 'read' permissions")

    print("\n2. Model Access:")
    print("   - Visit: https://huggingface.co/facebook/sam3")
    print("   - Click 'Agree and access repository' if prompted")
    print("   - Ensure your HF account has access")

    print("\n3. Colab Resources:")
    print("   - Check you're using GPU runtime (not CPU)")
    print("   - Runtime → Change runtime type → GPU")

    print("\n4. Alternative Installation:")
    print("   - Try running this cell again")
    print("   - Or restart runtime and re-run from Cell 1")

    print("=" * 70)
    raise

print("\n" + "=" * 70)
print("✅ SAM 3 Setup Complete!")
print("=" * 70)
print("\n💡 Model is ready for text-prompted segmentation")
print("   Next: Run Cell 3 to define defect classes")
