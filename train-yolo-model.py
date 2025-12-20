"""
Train YOLO model on merged dataset (Building Defect Detection + SAM2)
"""

from ultralytics import YOLO
from pathlib import Path
import torch

# Configuration
DATA_YAML = "yolo_dataset_merged_final/data.yaml"
MODEL_SIZE = "yolov11n.pt"  # nano - fastest training
EPOCHS = 100
IMG_SIZE = 640
BATCH_SIZE = 16
PROJECT = "runs/train"
NAME = "merged_model_v1"

def train_model():
    """Train YOLO model on merged dataset"""

    print("=" * 70)
    print("YOLO TRAINING - Merged Dataset")
    print("=" * 70)

    # Check for GPU
    device = 0 if torch.cuda.is_available() else 'cpu'
    print(f"\nDevice: {device}")
    if device == 'cpu':
        print("WARNING: Training on CPU will be very slow!")
        print("Consider using Google Colab with GPU for faster training")

    # Verify data.yaml exists
    data_path = Path(DATA_YAML)
    if not data_path.exists():
        print(f"\nERROR: {DATA_YAML} not found!")
        return

    print(f"\nTraining Configuration:")
    print(f"   Data: {DATA_YAML}")
    print(f"   Model: {MODEL_SIZE}")
    print(f"   Epochs: {EPOCHS}")
    print(f"   Image Size: {IMG_SIZE}")
    print(f"   Batch Size: {BATCH_SIZE}")
    print(f"   Device: {device}")

    # Load model
    print(f"\nLoading {MODEL_SIZE}...")
    model = YOLO(MODEL_SIZE)

    # Train
    print(f"\nStarting training...")
    print("This will take several hours. Progress will be saved in runs/train/merged_model_v1/\n")

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
        verbose=True
    )

    print("\n" + "=" * 70)
    print("TRAINING COMPLETE")
    print("=" * 70)

    # Get best model path
    best_model = Path(PROJECT) / NAME / "weights" / "best.pt"
    print(f"\nBest model saved to: {best_model.absolute()}")

    print(f"\nNext Steps:")
    print(f"   1. Validate model:")
    print(f"      python validate-yolo-model.py")
    print(f"   2. Compare with existing best_model_final.pt")
    print(f"   3. Convert to ONNX if performance is better")

    return results

if __name__ == "__main__":
    try:
        train_model()
    except KeyboardInterrupt:
        print("\n\nTraining interrupted by user")
    except Exception as e:
        print(f"\n\nERROR: {e}")
        print("\nIf training on CPU is too slow, consider:")
        print("   1. Using Google Colab with free T4 GPU")
        print("   2. Reducing epochs to 50")
        print("   3. Using smaller batch size (8 instead of 16)")
