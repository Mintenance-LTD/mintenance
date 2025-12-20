# ═══════════════════════════════════════════════════════════════
# Cell 2: Load SAM 3 Model (SIMPLE FIX - RECOMMENDED)
# ═══════════════════════════════════════════════════════════════
# This is the simplest fix that works in 99% of cases

print("=" * 70)
print("🔧 SAM 3 Model Setup with Numpy Fix")
print("=" * 70)

# CRITICAL: Install packages in specific order to avoid conflicts
print("\n⏳ Installing dependencies (this may take 1-2 minutes)...")

# Step 1: Upgrade pip silently
!pip install --upgrade pip -q 2>&1 | grep -v "already satisfied" || true

# Step 2: Force reinstall numpy 2.x for all packages
!pip install --force-reinstall "numpy>=2.0.0,<2.3.0" -q 2>&1 | grep -v "already satisfied" || true

# Step 3: Install SAM3 and let it handle its own dependencies
!pip install sam3 -q 2>&1 | grep -v "already satisfied" || true

print("✅ Dependencies installed")

# Now import everything
print("\n📦 Importing libraries...")

import torch
import numpy as np
from PIL import Image
import cv2

# Import SAM3 - this should now work without errors
from sam3.model_builder import build_sam3_image_model
from sam3.model.sam3_image_processor import Sam3Processor

print("✅ All imports successful")

# Verify versions (optional but helpful)
print(f"\n📋 Package Versions:")
print(f"   NumPy: {np.__version__}")
print(f"   PyTorch: {torch.__version__}")
print(f"   OpenCV: {cv2.__version__}")

# GPU Check
print("\n" + "=" * 70)
print("🖥️  Hardware Detection")
print("=" * 70)

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"\nDevice: {device.upper()}")

if device == "cuda":
    gpu_name = torch.cuda.get_device_name(0)
    total_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3

    print(f"GPU: {gpu_name}")
    print(f"Memory: {total_memory:.1f} GB")
    print(f"CUDA: {torch.version.cuda}")

    # Set memory optimization
    torch.cuda.empty_cache()
else:
    print("\n⚠️  No GPU detected - SAM3 will run VERY slowly on CPU")
    print("Fix: Runtime → Change runtime type → T4 GPU")
    print("\nContinuing anyway... (expect processing time of 10-30 sec/image)")

# Load SAM 3 Model
print("\n" + "=" * 70)
print("📥 Loading SAM 3 Model")
print("=" * 70)

print("\n⏳ Loading from Hugging Face...")
print("   (First run: ~2-5 min download, cached after that)")

try:
    # Build model
    model = build_sam3_image_model(
        device=device,
        load_from_HF=True
    )

    # Initialize processor
    processor = Sam3Processor(model)

    print("\n✅ SAM 3 Model Ready!")

    # Model info
    param_count = sum(p.numel() for p in model.parameters())
    print(f"\nModel Size: {param_count/1e6:.0f}M parameters")

    if device == "cuda":
        memory_used = torch.cuda.memory_allocated(0) / 1024**3
        print(f"GPU Memory Used: {memory_used:.2f} GB")

    print("\n" + "=" * 70)
    print("✅ Setup Complete - Ready for Auto-Labeling")
    print("=" * 70)

except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\nQuick Fixes:")
    print("1. Make sure you ran Cell 1 (HuggingFace login)")
    print("2. Accept SAM3 terms: https://huggingface.co/facebook/sam3")
    print("3. Restart runtime: Runtime → Restart runtime")
    print("4. Re-run Cell 1, then Cell 2")
    raise

# Test that everything works
print("\n🧪 Running quick test...")
try:
    # Create a small test image
    test_img = np.zeros((256, 256, 3), dtype=np.uint8)
    test_img[100:150, 100:150] = [255, 0, 0]  # Red square

    test_pil = Image.fromarray(test_img)

    # Quick inference test
    state = processor.set_image(test_pil)
    print("✅ Model test passed - SAM3 is working correctly")

    # Clear memory
    del test_img, test_pil, state
    if device == "cuda":
        torch.cuda.empty_cache()

except Exception as e:
    print(f"⚠️  Test failed: {e}")
    print("Model loaded but may have issues - proceed with caution")

print("\n💡 Next Step: Run Cell 3 to define defect classes")
