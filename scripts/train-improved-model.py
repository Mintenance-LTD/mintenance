"""
Train Improved YOLO Model for Mintenance AI
Uses yolo_dataset_merged_final for better performance

This script trains a new model that should outperform best_model_final_v2.pt
"""

from ultralytics import YOLO
from pathlib import Path
import torch
import sys

# Fix encoding for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Configuration
DATA_YAML = "yolo_dataset_merged_final/data.yaml"
MODEL_SIZE = "yolov11m.pt"  # Medium - better accuracy than nano
EPOCHS = 100
IMG_SIZE = 640
BATCH_SIZE = 16
PROJECT = "runs/train"
NAME = "mintenance_ai_v3"  # New version for Mintenance AI

def train_improved_model():
    """Train improved YOLO model for Mintenance AI"""
    
    print("=" * 70)
    print("MINTENANCE AI - IMPROVED YOLO MODEL TRAINING")
    print("=" * 70)
    print()
    
    # Check for GPU
    device = 0 if torch.cuda.is_available() else 'cpu'
    print(f"🖥️  Device: {device}")
    if device == 'cpu':
        print("⚠️  WARNING: Training on CPU will be very slow (10-15 hours)!")
        print("💡 Recommendation: Use Google Colab with free T4 GPU (2-4 hours)")
        print()
    
    # Verify data.yaml exists
    data_path = Path(DATA_YAML)
    if not data_path.exists():
        print(f"❌ ERROR: {DATA_YAML} not found!")
        print(f"   Make sure yolo_dataset_merged_final directory exists")
        return False
    
    print(f"📊 Training Configuration:")
    print(f"   Dataset: {DATA_YAML}")
    print(f"   Model: {MODEL_SIZE} (Medium - better accuracy)")
    print(f"   Epochs: {EPOCHS}")
    print(f"   Image Size: {IMG_SIZE}")
    print(f"   Batch Size: {BATCH_SIZE}")
    print(f"   Device: {device}")
    print()
    
    # Verify dataset structure
    train_images = Path("yolo_dataset_merged_final/train/images")
    val_images = Path("yolo_dataset_merged_final/val/images")
    
    if not train_images.exists():
        print(f"❌ ERROR: Training images not found: {train_images}")
        return False
    
    train_count = len(list(train_images.glob("*.jpg")))
    val_count = len(list(val_images.glob("*.jpg"))) if val_images.exists() else 0
    
    print(f"📈 Dataset Statistics:")
    print(f"   Training images: {train_count}")
    print(f"   Validation images: {val_count}")
    print()
    
    if train_count < 100:
        print("⚠️  WARNING: Very few training images. Results may be poor.")
        print()
    
    # Load model
    print(f"🔄 Loading {MODEL_SIZE}...")
    try:
        model = YOLO(MODEL_SIZE)
        print(f"✅ Model loaded successfully")
        print()
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return False
    
    # Train
    print(f"🚀 Starting training...")
    print(f"   This will take {'2-4 hours' if device != 'cpu' else '10-15 hours'}")
    print(f"   Progress saved to: {PROJECT}/{NAME}/")
    print(f"   Best model: {PROJECT}/{NAME}/weights/best.pt")
    print()
    
    try:
        results = model.train(
            data=str(data_path.absolute()),
            epochs=EPOCHS,
            imgsz=IMG_SIZE,
            batch=BATCH_SIZE,
            device=device,
            project=PROJECT,
            name=NAME,
            patience=20,  # Early stopping
            save=True,
            plots=True,
            verbose=True,
            # Data augmentation for better generalization
            hsv_h=0.015,
            hsv_s=0.7,
            hsv_v=0.4,
            degrees=10,
            translate=0.1,
            scale=0.5,
            # Optimization
            optimizer='AdamW',
            lr0=0.01,
            lrf=0.01,
            momentum=0.937,
            weight_decay=0.0005,
        )
        
        print()
        print("=" * 70)
        print("✅ TRAINING COMPLETE")
        print("=" * 70)
        print()
        
        # Get best model path
        best_model = Path(PROJECT) / NAME / "weights" / "best.pt"
        if best_model.exists():
            size_mb = best_model.stat().st_size / (1024 * 1024)
            print(f"📦 Best model saved to: {best_model.absolute()}")
            print(f"   Size: {size_mb:.2f} MB")
            print()
            
            print("📊 Next Steps:")
            print("   1. Evaluate model performance:")
            print(f"      python scripts/validate-yolo-predictions.py \\")
            print(f"          yolo_dataset_merged_final/val/images/ \\")
            print(f"          --model {best_model} \\")
            print(f"          --labels-dir yolo_dataset_merged_final/val/labels/")
            print()
            print("   2. Compare with current model:")
            print(f"      python scripts/validate-yolo-predictions.py \\")
            print(f"          yolo_dataset_merged_final/val/images/ \\")
            print(f"          --model best_model_final_v2.pt \\")
            print(f"          --labels-dir yolo_dataset_merged_final/val/labels/")
            print()
            print("   3. If better, deploy to Mintenance AI:")
            print(f"      cp {best_model} best_model_final_v3.pt")
            print("      # Update .env.local: YOLO_MODEL_PATH=./best_model_final_v3.pt")
            print()
            
            return True
        else:
            print("⚠️  WARNING: Best model file not found!")
            print(f"   Check: {best_model}")
            return False
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Training interrupted by user")
        print("   Partial results saved in runs/train/")
        return False
    except Exception as e:
        print(f"\n\n❌ ERROR during training: {e}")
        import traceback
        traceback.print_exc()
        print()
        print("💡 Troubleshooting:")
        print("   1. Check dataset structure is correct")
        print("   2. Verify data.yaml paths are correct")
        print("   3. Reduce batch size if out of memory")
        print("   4. Use Google Colab for GPU training")
        return False


if __name__ == "__main__":
    success = train_improved_model()
    sys.exit(0 if success else 1)
