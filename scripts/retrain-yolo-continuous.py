#!/usr/bin/env python3
"""
Continuous Learning YOLO Retraining Script

This script:
1. Loads the base YOLO model (best.pt)
2. Merges base dataset with user corrections
3. Fine-tunes the model on merged dataset
4. Exports to ONNX format
5. Saves model version

Usage:
    python scripts/retrain-yolo-continuous.py [--output-dir training-data/continuous-learning]
"""

import os
import sys
import argparse
import json
from pathlib import Path
from datetime import datetime

try:
    from ultralytics import YOLO
except ImportError:
    print("ERROR: ultralytics not installed. Install it with:")
    print("  pip install ultralytics")
    sys.exit(1)


def parse_args():
    parser = argparse.ArgumentParser(description='Retrain YOLO model with continuous learning')
    parser.add_argument(
        '--output-dir',
        type=str,
        default='training-data/continuous-learning',
        help='Directory containing merged training data'
    )
    parser.add_argument(
        '--base-model',
        type=str,
        default='runs/detect/building-defect-v2-normalized-cpu/weights/best.pt',
        help='Path to base model weights'
    )
    parser.add_argument(
        '--epochs',
        type=int,
        default=50,
        help='Number of training epochs (default: 50 for fine-tuning)'
    )
    parser.add_argument(
        '--batch',
        type=int,
        default=16,
        help='Batch size (default: 16)'
    )
    parser.add_argument(
        '--imgsz',
        type=int,
        default=640,
        help='Image size (default: 640)'
    )
    parser.add_argument(
        '--device',
        type=str,
        default='cpu',
        help='Device to use (cpu or cuda)'
    )
    parser.add_argument(
        '--lr0',
        type=float,
        default=0.001,
        help='Initial learning rate (default: 0.001 for fine-tuning)'
    )
    return parser.parse_args()


def get_model_version():
    """Generate model version string"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    return f'continuous-learning-v{timestamp}'


def retrain_yolo(args):
    """Main retraining function"""
    print("=" * 60)
    print("YOLO Continuous Learning Retraining")
    print("=" * 60)
    
    # Paths
    project_root = Path(__file__).parent.parent
    base_model_path = project_root / args.base_model
    output_dir = project_root / args.output_dir
    data_yaml_path = output_dir / 'data.yaml'
    
    # Check if base model exists
    if not base_model_path.exists():
        print(f"ERROR: Base model not found: {base_model_path}")
        print("\nAvailable model files:")
        weights_dir = base_model_path.parent
        if weights_dir.exists():
            for f in weights_dir.glob("*.pt"):
                print(f"  - {f}")
        sys.exit(1)
    
    # Check if data.yaml exists
    if not data_yaml_path.exists():
        print(f"ERROR: data.yaml not found: {data_yaml_path}")
        print("\nPlease run the data export service first to prepare training data.")
        sys.exit(1)
    
    print(f"\n📦 Loading base model: {base_model_path}")
    model = YOLO(str(base_model_path))
    
    print(f"\n📊 Training data: {data_yaml_path}")
    print(f"   Output directory: {output_dir}")
    
    # Generate model version
    model_version = get_model_version()
    project_name = f'building-defect-continuous-learning-{model_version}'
    
    print(f"\n🚀 Starting fine-tuning...")
    print(f"   Model version: {model_version}")
    print(f"   Epochs: {args.epochs}")
    print(f"   Batch size: {args.batch}")
    print(f"   Learning rate: {args.lr0}")
    print(f"   Device: {args.device}")
    
    try:
        # Fine-tune model
        results = model.train(
            data=str(data_yaml_path),
            epochs=args.epochs,
            imgsz=args.imgsz,
            batch=args.batch,
            device=args.device,
            project='runs/detect',
            name=project_name,
            resume=False,
            # Fine-tuning hyperparameters
            lr0=args.lr0,  # Lower learning rate for fine-tuning
            lrf=0.01,  # Final learning rate factor
            momentum=0.937,
            weight_decay=0.0005,
            warmup_epochs=3.0,
            # Data augmentation (same as base training)
            hsv_h=0.015,
            hsv_s=0.7,
            hsv_v=0.4,
            degrees=0.0,
            translate=0.1,
            scale=0.5,
            fliplr=0.5,
            mosaic=1.0,
            mixup=0.0,
            copy_paste=0.0,
            auto_augment='randaugment',
            erasing=0.4,
        )
        
        print("\n✅ Training completed successfully!")
        print(f"   Results saved to: runs/detect/{project_name}")
        
        # Get best model path
        best_model_path = Path(results.save_dir) / 'weights' / 'best.pt'
        
        # Export to ONNX
        print("\n📤 Exporting to ONNX format...")
        onnx_model = YOLO(str(best_model_path))
        onnx_path = onnx_model.export(
            format='onnx',
            imgsz=args.imgsz,
            simplify=True,
            opset=12
        )
        
        print(f"   ONNX model saved to: {onnx_path}")
        
        # Copy ONNX to models directory
        models_dir = project_root / 'apps' / 'web' / 'models'
        models_dir.mkdir(parents=True, exist_ok=True)
        
        import shutil
        onnx_filename = f'yolov11-continuous-{model_version}.onnx'
        target_onnx_path = models_dir / onnx_filename
        shutil.copy(onnx_path, target_onnx_path)
        
        print(f"   Copied to: {target_onnx_path}")
        
        # Save model metadata
        metadata = {
            'version': model_version,
            'base_model': str(base_model_path),
            'training_data': str(data_yaml_path),
            'epochs': args.epochs,
            'batch_size': args.batch,
            'learning_rate': args.lr0,
            'device': args.device,
            'best_model': str(best_model_path),
            'onnx_model': str(target_onnx_path),
            'trained_at': datetime.now().isoformat(),
            'metrics': {
                'mAP50': float(results.results_dict.get('metrics/mAP50(B)', 0)),
                'mAP50-95': float(results.results_dict.get('metrics/mAP50-95(B)', 0)),
                'precision': float(results.results_dict.get('metrics/precision(B)', 0)),
                'recall': float(results.results_dict.get('metrics/recall(B)', 0)),
            } if hasattr(results, 'results_dict') else {},
        }
        
        metadata_path = models_dir / f'model-metadata-{model_version}.json'
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"\n📝 Model metadata saved to: {metadata_path}")
        
        print("\n" + "=" * 60)
        print("✅ Retraining completed successfully!")
        print("=" * 60)
        print(f"\nNext steps:")
        print(f"1. Review model metrics in: {metadata_path}")
        print(f"2. Update .env.local: YOLO_MODEL_PATH={target_onnx_path}")
        print(f"3. Restart server to use new model")
        print(f"4. A/B test new model vs old model")
        
        return {
            'success': True,
            'version': model_version,
            'onnx_path': str(target_onnx_path),
            'metadata': metadata,
        }
        
    except Exception as e:
        print(f"\n❌ Training failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    args = parse_args()
    result = retrain_yolo(args)
    
    if result['success']:
        sys.exit(0)
    else:
        sys.exit(1)

