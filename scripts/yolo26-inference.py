"""
YOLO26 Inference Script
Run inference using YOLO models (YOLO26, YOLOv11, or custom trained models).

Usage:
    # Use pretrained YOLO26 model
    python scripts/yolo26-inference.py path/to/image.jpg
    
    # Use custom trained model (building defect detection)
    python scripts/yolo26-inference.py path/to/image.jpg --model best_model_final_v2.pt
    
    # Use custom model with data.yaml for class names
    python scripts/yolo26-inference.py path/to/image.jpg --model best_model_final_v2.pt --data-yaml yolo_dataset/data.yaml
"""

import sys
import argparse
from pathlib import Path
from typing import Optional, Dict, List

try:
    from ultralytics import YOLO
except ImportError:
    print("❌ Error: ultralytics not installed. Run: pip install -U ultralytics")
    sys.exit(1)

try:
    import yaml
except ImportError:
    print("⚠️  Warning: PyYAML not installed. Install with: pip install pyyaml")
    yaml = None

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def load_data_yaml(data_yaml_path: str) -> Optional[Dict]:
    """Load class names from data.yaml file."""
    if not yaml:
        return None
    
    try:
        yaml_path = Path(data_yaml_path)
        if not yaml_path.exists():
            return None
        
        with open(yaml_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
        
        return data
    except Exception as e:
        print(f"⚠️  Warning: Could not load data.yaml: {e}")
        return None


def get_model_info(model_path: str, data_yaml: Optional[Dict] = None) -> Dict:
    """Get information about the model."""
    model_path_obj = Path(model_path)
    
    info = {
        'path': str(model_path_obj.absolute()),
        'exists': model_path_obj.exists(),
        'size_mb': model_path_obj.stat().st_size / (1024 * 1024) if model_path_obj.exists() else 0,
        'is_custom': not model_path.startswith('yolo26') and not model_path.startswith('yolo11'),
        'model_type': 'Custom Trained' if not model_path.startswith('yolo26') and not model_path.startswith('yolo11') else 'Pretrained'
    }
    
    # Try to determine if it's a building defect model
    if info['is_custom']:
        info['model_type'] = 'Building Defect Detection (Custom)'
    
    return info


def run_inference(
    image_path: str,
    model_name: str = "yolo26n.pt",
    output_dir: Optional[str] = None,
    conf_threshold: float = 0.25,
    show_results: bool = True,
    save_results: bool = True,
    data_yaml_path: Optional[str] = None
) -> None:
    """
    Run YOLO inference on an image.
    
    Args:
        image_path: Path to the input image
        model_name: YOLO model (yolo26n.pt, yolo26s.pt, best_model_final_v2.pt, etc.)
        output_dir: Directory to save results (default: same as image directory)
        conf_threshold: Confidence threshold for detections (0.0-1.0)
        show_results: Whether to display results on screen
        save_results: Whether to save results to disk
        data_yaml_path: Optional path to data.yaml for custom class names
    """
    print("=" * 60)
    print("YOLO INFERENCE SCRIPT")
    print("=" * 60)
    print()
    
    # Validate image path
    image_path_obj = Path(image_path)
    if not image_path_obj.exists():
        print(f"❌ Error: Image file not found: {image_path}")
        sys.exit(1)
    
    if not image_path_obj.is_file():
        print(f"❌ Error: Path is not a file: {image_path}")
        sys.exit(1)
    
    print(f"✅ Input image: {image_path}")
    print(f"   Size: {image_path_obj.stat().st_size / 1024:.2f} KB")
    print()
    
    # Determine output directory
    if output_dir:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
    else:
        output_path = image_path_obj.parent
    
    print(f"📁 Output directory: {output_path}")
    print()
    
    # Get model information
    model_info = get_model_info(model_name)
    
    # Load data.yaml if provided
    data_yaml = None
    if data_yaml_path:
        data_yaml = load_data_yaml(data_yaml_path)
        if data_yaml:
            print(f"📋 Loaded class names from: {data_yaml_path}")
            if 'names' in data_yaml:
                print(f"   Classes: {len(data_yaml['names'])}")
            print()
    
    # Load model
    print(f"🔄 Loading model: {model_name}")
    
    # Check if model file exists (for custom models)
    if model_info['is_custom'] and not model_info['exists']:
        # Try common locations
        possible_paths = [
            Path(model_name),
            Path('.') / model_name,
            Path('..') / model_name,
        ]
        
        found = False
        for path in possible_paths:
            if path.exists():
                model_name = str(path.absolute())
                model_info = get_model_info(model_name)
                found = True
                break
        
        if not found:
            print(f"❌ Error: Custom model file not found: {model_name}")
            print(f"   Searched in: {[str(p) for p in possible_paths]}")
            sys.exit(1)
    
    try:
        model = YOLO(model_name)
        print(f"✅ Model loaded successfully")
        print(f"   Model type: {model_info['model_type']}")
        
        if model_info['is_custom']:
            print(f"   File size: {model_info['size_mb']:.2f} MB")
            print(f"   Path: {model_info['path']}")
        
        # Display class information
        if hasattr(model, 'names') and model.names:
            num_classes = len(model.names)
            print(f"   Classes: {num_classes}")
            
            # Show first few class names
            if num_classes <= 20:
                print(f"   Class names:")
                for idx, name in model.names.items():
                    print(f"     {idx}: {name}")
            else:
                print(f"   First 10 class names:")
                for idx in range(min(10, num_classes)):
                    if idx in model.names:
                        print(f"     {idx}: {model.names[idx]}")
                print(f"     ... and {num_classes - 10} more")
        
        print()
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        print()
        if model_info['is_custom']:
            print("💡 Tip: Make sure the model file exists and is a valid YOLO model.")
            print(f"   Expected location: {model_info['path']}")
        else:
            print("💡 Tip: The model will be downloaded automatically on first use.")
            print("   Available variants: yolo26n.pt (nano), yolo26s.pt (small),")
            print("   yolo26m.pt (medium), yolo26l.pt (large), yolo26x.pt (xlarge)")
        sys.exit(1)
    
    # Run inference
    print(f"🔍 Running inference...")
    print(f"   Confidence threshold: {conf_threshold}")
    print()
    
    try:
        results = model(
            str(image_path),
            conf=conf_threshold,
            save=save_results,
            project=str(output_path),
            name="yolo26_results"
        )
        
        print("✅ Inference completed successfully!")
        print()
        
        # Process results
        for i, result in enumerate(results):
            print(f"📊 Results for image {i + 1}:")
            print(f"   Detections: {len(result.boxes)}")
            
            if len(result.boxes) > 0:
                print(f"   Classes detected:")
                for box in result.boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    cls_name = result.names[cls_id]
                    print(f"     - {cls_name}: {conf:.2%} confidence")
            
            print()
            
            # Display results
            if show_results:
                print("🖼️  Displaying results...")
                result.show()
            
            # Save results
            if save_results:
                output_file = output_path / "yolo26_results" / f"{image_path_obj.stem}_result.jpg"
                if output_file.exists():
                    print(f"💾 Results saved to: {output_file}")
                else:
                    # Try alternative save method
                    result.save(filename=str(output_file))
                    print(f"💾 Results saved to: {output_file}")
        
        print()
        print("=" * 60)
        print("✅ Inference complete!")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Error during inference: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def main():
    """Main entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description="Run YOLO26 inference on an image",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage with pretrained YOLO26
  python scripts/yolo26-inference.py image.jpg
  
  # Use custom trained building defect model
  python scripts/yolo26-inference.py image.jpg --model best_model_final_v2.pt
  
  # Use custom model with data.yaml for class names
  python scripts/yolo26-inference.py image.jpg --model best_model_final_v2.pt --data-yaml yolo_dataset/data.yaml
  
  # Set custom confidence threshold
  python scripts/yolo26-inference.py image.jpg --model best_model_final_v2.pt --conf 0.5
  
  # Specify output directory
  python scripts/yolo26-inference.py image.jpg --model best_model_final_v2.pt --output results/
  
  # Don't display results (only save)
  python scripts/yolo26-inference.py image.jpg --model best_model_final_v2.pt --no-show
        """
    )
    
    parser.add_argument(
        "image",
        type=str,
        help="Path to the input image file"
    )
    
    parser.add_argument(
        "--model",
        type=str,
        default="yolo26n.pt",
        help="YOLO model (default: yolo26n.pt). Options: yolo26n/yolo26s/yolo26m/yolo26l/yolo26x, or custom model like best_model_final_v2.pt"
    )
    
    parser.add_argument(
        "--data-yaml",
        type=str,
        default=None,
        help="Path to data.yaml file for custom class names (optional, model will use its own class names if not provided)"
    )
    
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output directory for results (default: same as image directory)"
    )
    
    parser.add_argument(
        "--conf",
        type=float,
        default=0.25,
        help="Confidence threshold for detections (0.0-1.0, default: 0.25)"
    )
    
    parser.add_argument(
        "--no-show",
        action="store_true",
        help="Don't display results on screen (only save to disk)"
    )
    
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Don't save results to disk (only display)"
    )
    
    args = parser.parse_args()
    
    # Validate confidence threshold
    if not 0.0 <= args.conf <= 1.0:
        print("❌ Error: Confidence threshold must be between 0.0 and 1.0")
        sys.exit(1)
    
    # Run inference
    run_inference(
        image_path=args.image,
        model_name=args.model,
        output_dir=args.output,
        conf_threshold=args.conf,
        show_results=not args.no_show,
        save_results=not args.no_save,
        data_yaml_path=args.data_yaml
    )


if __name__ == "__main__":
    main()
