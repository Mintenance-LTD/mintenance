#!/usr/bin/env python3
"""
Convert YOLO PyTorch model to ONNX format

Usage:
    python scripts/convert-yolo-to-onnx.py

This script will:
1. Load the best.pt model from runs/detect/building-defect-v2-normalized-cpu/weights/
2. Export it to ONNX format
3. Save it to apps/web/models/yolov11.onnx
"""

import os
import sys
from pathlib import Path

try:
    from ultralytics import YOLO
except ImportError:
    print("ERROR: ultralytics not installed. Install it with:")
    print("  pip install ultralytics")
    sys.exit(1)


def main():
    # Paths
    project_root = Path(__file__).parent.parent
    model_path = project_root / "runs" / "detect" / "building-defect-v2-normalized-cpu" / "weights" / "best.pt"
    output_dir = project_root / "apps" / "web" / "models"
    output_path = output_dir / "yolov11.onnx"

    # Check if model exists
    if not model_path.exists():
        print(f"ERROR: Model file not found: {model_path}")
        print("\nAvailable model files:")
        weights_dir = project_root / "runs" / "detect" / "building-defect-v2-normalized-cpu" / "weights"
        if weights_dir.exists():
            for f in weights_dir.glob("*.pt"):
                print(f"  - {f}")
        else:
            print("  No weights directory found")
        sys.exit(1)

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading model from: {model_path}")
    print(f"Output will be saved to: {output_path}")

    try:
        # Load model
        model = YOLO(str(model_path))
        print(f"✅ Model loaded successfully")
        print(f"   Model info: {model.info()}")

        # Export to ONNX
        print("\nExporting to ONNX format...")
        model.export(
            format='onnx',
            imgsz=640,  # Standard YOLO input size
            simplify=True,  # Simplify ONNX graph
            opset=12,  # ONNX opset version
        )

        # Find the exported file (ultralytics exports to same directory as model)
        exported_file = model_path.parent / f"{model_path.stem}.onnx"
        
        if exported_file.exists():
            # Move to target location
            import shutil
            shutil.move(str(exported_file), str(output_path))
            print(f"✅ Model exported successfully!")
            print(f"   Saved to: {output_path}")
            print(f"   File size: {output_path.stat().st_size / (1024 * 1024):.2f} MB")
        else:
            print(f"ERROR: Exported file not found at: {exported_file}")
            sys.exit(1)

    except Exception as e:
        print(f"ERROR: Failed to convert model: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

