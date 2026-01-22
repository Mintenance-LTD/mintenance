"""
Batch YOLO Inference Script
Process multiple images with your custom YOLO model and generate a summary report.

Usage:
    python scripts/batch-yolo-inference.py yolo_dataset/val/images/ --model best_model_final_v2.pt
    python scripts/batch-yolo-inference.py yolo_dataset/val/images/ --model best_model_final_v2.pt --output batch_results/
"""

import sys
import argparse
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

try:
    from ultralytics import YOLO
except ImportError:
    print("❌ Error: ultralytics not installed. Run: pip install -U ultralytics")
    sys.exit(1)

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def process_image(
    model: YOLO,
    image_path: Path,
    conf_threshold: float,
    output_dir: Optional[Path] = None
) -> Dict:
    """Process a single image and return results."""
    try:
        results = model(
            str(image_path),
            conf=conf_threshold,
            save=output_dir is not None,
            project=str(output_dir.parent) if output_dir else None,
            name=output_dir.name if output_dir else None,
            verbose=False
        )
        
        result = results[0]
        detections = []
        
        for box in result.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            cls_name = result.names[cls_id]
            
            # Get bounding box coordinates
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            
            detections.append({
                'class_id': cls_id,
                'class_name': cls_name,
                'confidence': conf,
                'bbox': [x1, y1, x2, y2]
            })
        
        return {
            'image': str(image_path),
            'success': True,
            'detections_count': len(detections),
            'detections': detections,
            'error': None
        }
    except Exception as e:
        return {
            'image': str(image_path),
            'success': False,
            'detections_count': 0,
            'detections': [],
            'error': str(e)
        }


def batch_inference(
    image_dir: str,
    model_path: str,
    output_dir: Optional[str] = None,
    conf_threshold: float = 0.25,
    max_images: Optional[int] = None
) -> None:
    """Process multiple images in batch."""
    print("=" * 70)
    print("BATCH YOLO INFERENCE")
    print("=" * 70)
    print()
    
    # Validate image directory
    image_dir_path = Path(image_dir)
    if not image_dir_path.exists():
        print(f"❌ Error: Image directory not found: {image_dir}")
        sys.exit(1)
    
    if not image_dir_path.is_dir():
        print(f"❌ Error: Path is not a directory: {image_dir}")
        sys.exit(1)
    
    # Find all images
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp'}
    image_files = [
        f for f in image_dir_path.iterdir()
        if f.suffix.lower() in image_extensions and f.is_file()
    ]
    
    if not image_files:
        print(f"❌ Error: No images found in {image_dir}")
        sys.exit(1)
    
    # Limit number of images if specified
    if max_images:
        image_files = image_files[:max_images]
    
    print(f"📁 Image directory: {image_dir_path}")
    print(f"📊 Found {len(image_files)} images")
    if max_images:
        print(f"   Processing first {max_images} images")
    print()
    
    # Setup output directory
    if output_dir:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        results_dir = output_path / "results"
        results_dir.mkdir(exist_ok=True)
    else:
        output_path = image_dir_path.parent / "batch_inference_results"
        output_path.mkdir(exist_ok=True)
        results_dir = output_path / "results"
        results_dir.mkdir(exist_ok=True)
    
    print(f"💾 Output directory: {output_path}")
    print()
    
    # Load model
    print(f"🔄 Loading model: {model_path}")
    try:
        model = YOLO(model_path)
        print(f"✅ Model loaded successfully")
        
        if hasattr(model, 'names') and model.names:
            print(f"   Classes: {len(model.names)}")
        
        print()
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        sys.exit(1)
    
    # Process images
    print(f"🔍 Processing {len(image_files)} images...")
    print(f"   Confidence threshold: {conf_threshold}")
    print()
    
    results = []
    class_stats = {}
    total_detections = 0
    successful_images = 0
    failed_images = 0
    
    for i, image_file in enumerate(image_files, 1):
        print(f"[{i}/{len(image_files)}] Processing: {image_file.name}", end=" ... ")
        
        result = process_image(
            model=model,
            image_path=image_file,
            conf_threshold=conf_threshold,
            output_dir=results_dir
        )
        
        results.append(result)
        
        if result['success']:
            successful_images += 1
            detections_count = result['detections_count']
            total_detections += detections_count
            
            # Update class statistics
            for det in result['detections']:
                class_name = det['class_name']
                class_stats[class_name] = class_stats.get(class_name, 0) + 1
            
            print(f"✅ {detections_count} detection(s)")
        else:
            failed_images += 1
            print(f"❌ Error: {result['error']}")
    
    print()
    print("=" * 70)
    print("BATCH PROCESSING COMPLETE")
    print("=" * 70)
    print()
    
    # Generate summary
    print("📊 SUMMARY")
    print("-" * 70)
    print(f"Total images processed: {len(image_files)}")
    print(f"  ✅ Successful: {successful_images}")
    print(f"  ❌ Failed: {failed_images}")
    print(f"Total detections: {total_detections}")
    print(f"Average detections per image: {total_detections / successful_images:.2f}" if successful_images > 0 else "N/A")
    print()
    
    if class_stats:
        print("📈 DETECTIONS BY CLASS")
        print("-" * 70)
        sorted_classes = sorted(class_stats.items(), key=lambda x: x[1], reverse=True)
        for class_name, count in sorted_classes:
            percentage = (count / total_detections * 100) if total_detections > 0 else 0
            print(f"  {class_name:25s}: {count:4d} ({percentage:5.1f}%)")
        print()
    
    # Save results to JSON
    results_file = output_path / f"batch_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    summary = {
        'timestamp': datetime.now().isoformat(),
        'model': model_path,
        'image_directory': str(image_dir_path),
        'confidence_threshold': conf_threshold,
        'total_images': len(image_files),
        'successful_images': successful_images,
        'failed_images': failed_images,
        'total_detections': total_detections,
        'class_statistics': class_stats,
        'results': results
    }
    
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Detailed results saved to: {results_file}")
    print(f"🖼️  Annotated images saved to: {results_dir}")
    print()
    print("=" * 70)
    print("✅ Batch inference complete!")
    print("=" * 70)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Batch process images with YOLO model",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process all images in validation directory
  python scripts/batch-yolo-inference.py yolo_dataset/val/images/ --model best_model_final_v2.pt
  
  # Process with custom output directory
  python scripts/batch-yolo-inference.py yolo_dataset/val/images/ --model best_model_final_v2.pt --output batch_results/
  
  # Process first 10 images only
  python scripts/batch-yolo-inference.py yolo_dataset/val/images/ --model best_model_final_v2.pt --max 10
  
  # Custom confidence threshold
  python scripts/batch-yolo-inference.py yolo_dataset/val/images/ --model best_model_final_v2.pt --conf 0.5
        """
    )
    
    parser.add_argument(
        "image_dir",
        type=str,
        help="Directory containing images to process"
    )
    
    parser.add_argument(
        "--model",
        type=str,
        required=True,
        help="Path to YOLO model file (e.g., best_model_final_v2.pt)"
    )
    
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output directory for results (default: batch_inference_results/)"
    )
    
    parser.add_argument(
        "--conf",
        type=float,
        default=0.25,
        help="Confidence threshold for detections (0.0-1.0, default: 0.25)"
    )
    
    parser.add_argument(
        "--max",
        type=int,
        default=None,
        help="Maximum number of images to process (for testing)"
    )
    
    args = parser.parse_args()
    
    # Validate confidence threshold
    if not 0.0 <= args.conf <= 1.0:
        print("❌ Error: Confidence threshold must be between 0.0 and 1.0")
        sys.exit(1)
    
    # Run batch inference
    batch_inference(
        image_dir=args.image_dir,
        model_path=args.model,
        output_dir=args.output,
        conf_threshold=args.conf,
        max_images=args.max
    )


if __name__ == "__main__":
    main()
