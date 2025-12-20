# ═══════════════════════════════════════════════════════════════
# Cell 2: Install Dependencies & Load SAM 3 Model (RESTART METHOD)
# ═══════════════════════════════════════════════════════════════
# This method restarts the runtime for a clean package environment

import os
import sys

# Flag to track if we've already restarted
RESTART_FLAG = '/content/.sam3_restart_done'

if not os.path.exists(RESTART_FLAG):
    print("=" * 70)
    print("🔧 CLEAN INSTALLATION METHOD")
    print("=" * 70)
    print("\n📦 Installing packages with proper dependency resolution...")

    # Install everything in correct order BEFORE importing
    print("\n⏳ Step 1/4: Upgrading pip...")
    !pip install --upgrade pip --quiet

    print("⏳ Step 2/4: Installing numpy 2.x...")
    !pip install "numpy>=2.0.0,<2.3.0" --force-reinstall --quiet

    print("⏳ Step 3/4: Installing core dependencies...")
    !pip install torch torchvision torchaudio --quiet
    !pip install opencv-python-headless pillow transformers --quiet

    print("⏳ Step 4/4: Installing SAM3...")
    !pip install sam3 --quiet

    # Create restart flag
    with open(RESTART_FLAG, 'w') as f:
        f.write('restart_done')

    print("\n✅ Installation complete!")
    print("\n🔄 RESTARTING RUNTIME for clean imports...")
    print("=" * 70)
    print("\n⚠️  After restart, run this cell again to load the model")

    # Restart runtime
    os.kill(os.getpid(), 9)

else:
    # Packages are installed, now we can import
    print("=" * 70)
    print("📥 Loading SAM 3 Model (Post-Restart)")
    print("=" * 70)

    # Verify package versions
    print("\n🔍 Package Versions:")

    import numpy as np
    print(f"   NumPy: {np.__version__}")

    import cv2
    print(f"   OpenCV: {cv2.__version__}")

    import torch
    print(f"   PyTorch: {torch.__version__}")

    # Import SAM3
    print("\n📦 Importing SAM3...")
    from sam3.model_builder import build_sam3_image_model
    from sam3.model.sam3_image_processor import Sam3Processor
    from PIL import Image
    print("   ✅ SAM3 imported successfully")

    # Check GPU
    print("\n" + "=" * 70)
    print("🖥️  Hardware Configuration")
    print("=" * 70)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"\n📍 Device: {device}")

    if device == "cuda":
        print(f"   GPU: {torch.cuda.get_device_name(0)}")
        print(f"   CUDA Version: {torch.version.cuda}")
        memory_gb = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"   Total GPU Memory: {memory_gb:.1f} GB")
    else:
        print("\n⚠️  WARNING: No GPU detected!")
        print("   Fix: Runtime → Change runtime type → T4 GPU")

    # Load model
    print("\n" + "=" * 70)
    print("📥 Loading SAM 3 Model from Hugging Face...")
    print("=" * 70)

    try:
        print("\n⏳ Downloading model (first time: 2-5 minutes)...")
        print("   Model will be cached for future runs")

        model = build_sam3_image_model(
            device=device,
            load_from_HF=True  # Download from HuggingFace
        )

        print("✅ Model loaded successfully")

        # Initialize processor
        print("\n⏳ Initializing image processor...")
        processor = Sam3Processor(model)

        print("✅ Processor ready")

        # Model statistics
        total_params = sum(p.numel() for p in model.parameters())
        trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

        print(f"\n📊 Model Statistics:")
        print(f"   Total parameters: {total_params:,} (~{total_params/1e6:.0f}M)")
        print(f"   Trainable parameters: {trainable_params:,}")
        print(f"   Model device: {next(model.parameters()).device}")
        print(f"   Model precision: {next(model.parameters()).dtype}")

        if device == "cuda":
            allocated_gb = torch.cuda.memory_allocated(0) / 1024**3
            reserved_gb = torch.cuda.memory_reserved(0) / 1024**3
            print(f"   GPU Memory Allocated: {allocated_gb:.2f} GB")
            print(f"   GPU Memory Reserved: {reserved_gb:.2f} GB")

        print("\n" + "=" * 70)
        print("✅ SAM 3 Ready for Segmentation!")
        print("=" * 70)
        print("\n💡 You can now proceed to Cell 3 to define defect classes")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print("\n🔍 Troubleshooting:")
        print("=" * 70)

        import traceback
        print(traceback.format_exc())

        print("\n💡 Common Fixes:")
        print("1. Hugging Face Authentication:")
        print("   - Re-run Cell 1 and ensure successful login")
        print("   - Check token has 'read' permissions")

        print("\n2. Model Access:")
        print("   - Visit: https://huggingface.co/facebook/sam3")
        print("   - Accept terms if required")

        print("\n3. Runtime Issues:")
        print("   - Runtime → Restart runtime")
        print("   - Delete restart flag: !rm /content/.sam3_restart_done")
        print("   - Re-run this cell")

        print("\n4. Memory Issues:")
        print("   - Ensure you're using GPU runtime (not CPU)")
        print("   - Try a higher-tier GPU if available")

        print("=" * 70)
        raise
