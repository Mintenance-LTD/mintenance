"""
YOLO Prediction Validation Script
Compare model predictions with ground truth labels and calculate metrics.

Usage:
    python scripts/validate-yolo-predictions.py image.jpg --model best_model_final_v2.pt --labels labels/image.txt
    python scripts/validate-yolo-predictions.py yolo_dataset/val/images/ --model best_model_final_v2.pt --labels-dir yolo_dataset/val/labels/
"""

import sys
import argparse
from pathlib import Path
from typing import List, Tuple, Dict, Optional
import json

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


def load_yolo_label(label_path: Path) -> List[Tuple[int, float, float, float, float]]:
    """Load YOLO format label file.
    
    Returns list of (class_id, x_center, y_center, width, height) tuples.
    """
    if not label_path.exists():
        return []
    
    labels = []
    try:
        with open(label_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                parts = line.split()
                if len(parts) >= 5:
                    class_id = int(parts[0])
                    x_center = float(parts[1])
                    y_center = float(parts[2])
                    width = float(parts[3])
                    height = float(parts[4])
                    labels.append((class_id, x_center, y_center, width, height))
    except Exception as e:
        print(f"⚠️  Warning: Could not load label file {label_path}: {e}")
    
    return labels


def calculate_iou(box1: Tuple[float, float, float, float], box2: Tuple[float, float, float, float]) -> float:
    """Calculate Intersection over Union (IoU) for two boxes.
    
    Boxes are in format (x1, y1, x2, y2) - absolute coordinates.
    """
    x1_min, y1_min, x1_max, y1_max = box1
    x2_min, y2_min, x2_max, y2_max = box2
    
    # Calculate intersection
    inter_x_min = max(x1_min, x2_min)
    inter_y_min = max(y1_min, y2_min)
    inter_x_max = min(x1_max, x2_max)
    inter_y_max = min(y1_max, y2_max)
    
    if inter_x_max <= inter_x_min or inter_y_max <= inter_y_min:
        return 0.0
    
    inter_area = (inter_x_max - inter_x_min) * (inter_y_max - inter_y_min)
    
    # Calculate union
    box1_area = (x1_max - x1_min) * (y1_max - y1_min)
    box2_area = (x2_max - x2_min) * (y2_max - y2_min)
    union_area = box1_area + box2_area - inter_area
    
    if union_area == 0:
        return 0.0
    
    return inter_area / union_area


def yolo_to_absolute(bbox: Tuple[float, float, float, float], img_width: int, img_height: int) -> Tuple[float, float, float, float]:
    """Convert YOLO format (normalized center, width, height) to absolute coordinates (x1, y1, x2, y2)."""
    x_center, y_center, width, height = bbox
    
    x1 = (x_center - width / 2) * img_width
    y1 = (y_center - height / 2) * img_height
    x2 = (x_center + width / 2) * img_width
    y2 = (y_center + height / 2) * img_height
    
    return (x1, y1, x2, y2)


def validate_predictions(
    image_path: Path,
    model: YOLO,
    ground_truth_labels: List[Tuple[int, float, float, float, float]],
    conf_threshold: float = 0.25,
    iou_threshold: float = 0.5
) -> Dict:
    """Validate model predictions against ground truth labels."""
    # Run inference
    results = model(str(image_path), conf=conf_threshold, verbose=False)
    result = results[0]
    
    # Get image dimensions
    img_height, img_width = result.orig_shape[:2]
    
    # Extract predictions
    predictions = []
    for box in result.boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        predictions.append({
            'class_id': cls_id,
            'class_name': result.names[cls_id],
            'confidence': conf,
            'bbox': (x1, y1, x2, y2)
        })
    
    # Match predictions with ground truth
    matched_gt = set()
    matched_pred = set()
    matches = []
    
    for pred_idx, pred in enumerate(predictions):
        best_iou = 0.0
        best_gt_idx = None
        
        for gt_idx, gt_label in enumerate(ground_truth_labels):
            if gt_idx in matched_gt:
                continue
            
            gt_class_id, x_center, y_center, width, height = gt_label
            gt_bbox = yolo_to_absolute((x_center, y_center, width, height), img_width, img_height)
            
            iou = calculate_iou(pred['bbox'], gt_bbox)
            
            # Check if same class and IoU > threshold
            if pred['class_id'] == gt_class_id and iou > best_iou and iou >= iou_threshold:
                best_iou = iou
                best_gt_idx = gt_idx
        
        if best_gt_idx is not None:
            matched_gt.add(best_gt_idx)
            matched_pred.add(pred_idx)
            matches.append({
                'prediction': pred,
                'ground_truth': ground_truth_labels[best_gt_idx],
                'iou': best_iou
            })
    
    # Calculate metrics
    true_positives = len(matches)
    false_positives = len(predictions) - len(matched_pred)
    false_negatives = len(ground_truth_labels) - len(matched_gt)
    
    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0.0
    recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0.0
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    
    return {
        'image': str(image_path),
        'predictions': len(predictions),
        'ground_truth': len(ground_truth_labels),
        'true_positives': true_positives,
        'false_positives': false_positives,
        'false_negatives': false_negatives,
        'precision': precision,
        'recall': recall,
        'f1_score': f1_score,
        'matches': matches,
        'predictions_detail': predictions
    }


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Validate YOLO predictions against ground truth labels",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Validate single image
  python scripts/validate-yolo-predictions.py image.jpg --model best_model_final_v2.pt --labels labels/image.txt
  
  # Validate directory of images
  python scripts/validate-yolo-predictions.py yolo_dataset/val/images/ --model best_model_final_v2.pt --labels-dir yolo_dataset/val/labels/
        """
    )
    
    parser.add_argument(
        "image",
        type=str,
        help="Path to image file or directory containing images"
    )
    
    parser.add_argument(
        "--model",
        type=str,
        required=True,
        help="Path to YOLO model file"
    )
    
    parser.add_argument(
        "--labels",
        type=str,
        default=None,
        help="Path to ground truth label file (for single image)"
    )
    
    parser.add_argument(
        "--labels-dir",
        type=str,
        default=None,
        help="Directory containing ground truth label files (for directory of images)"
    )
    
    parser.add_argument(
        "--conf",
        type=float,
        default=0.25,
        help="Confidence threshold (default: 0.25)"
    )
    
    parser.add_argument(
        "--iou",
        type=float,
        default=0.5,
        help="IoU threshold for matching (default: 0.5)"
    )
    
    args = parser.parse_args()
    
    # Load model
    print(f"🔄 Loading model: {args.model}")
    try:
        model = YOLO(args.model)
        print(f"✅ Model loaded successfully\n")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        sys.exit(1)
    
    # Process single image or directory
    image_path = Path(args.image)
    
    if image_path.is_file():
        # Single image
        if not args.labels:
            print("❌ Error: --labels required for single image validation")
            sys.exit(1)
        
        label_path = Path(args.labels)
        ground_truth = load_yolo_label(label_path)
        
        print(f"📊 Validating: {image_path.name}")
        print(f"   Ground truth labels: {len(ground_truth)}")
        print()
        
        result = validate_predictions(
            image_path=image_path,
            model=model,
            ground_truth_labels=ground_truth,
            conf_threshold=args.conf,
            iou_threshold=args.iou
        )
        
        print("=" * 70)
        print("VALIDATION RESULTS")
        print("=" * 70)
        print(f"Image: {image_path.name}")
        print(f"Predictions: {result['predictions']}")
        print(f"Ground Truth: {result['ground_truth']}")
        print(f"True Positives: {result['true_positives']}")
        print(f"False Positives: {result['false_positives']}")
        print(f"False Negatives: {result['false_negatives']}")
        print(f"Precision: {result['precision']:.2%}")
        print(f"Recall: {result['recall']:.2%}")
        print(f"F1 Score: {result['f1_score']:.2%}")
        print()
        
        if result['matches']:
            print("Matched Predictions:")
            for match in result['matches']:
                pred = match['prediction']
                print(f"  {pred['class_name']}: {pred['confidence']:.2%} confidence, IoU: {match['iou']:.2%}")
    
    elif image_path.is_dir():
        # Directory of images
        if not args.labels_dir:
            print("❌ Error: --labels-dir required for directory validation")
            sys.exit(1)
        
        labels_dir = Path(args.labels_dir)
        image_extensions = {'.jpg', '.jpeg', '.png'}
        image_files = [f for f in image_path.iterdir() if f.suffix.lower() in image_extensions]
        
        print(f"📁 Processing {len(image_files)} images...\n")
        
        all_results = []
        total_tp = 0
        total_fp = 0
        total_fn = 0
        
        for img_file in image_files:
            label_file = labels_dir / f"{img_file.stem}.txt"
            ground_truth = load_yolo_label(label_file)
            
            result = validate_predictions(
                image_path=img_file,
                model=model,
                ground_truth_labels=ground_truth,
                conf_threshold=args.conf,
                iou_threshold=args.iou
            )
            
            all_results.append(result)
            total_tp += result['true_positives']
            total_fp += result['false_positives']
            total_fn += result['false_negatives']
        
        # Overall metrics
        overall_precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
        overall_recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
        overall_f1 = 2 * (overall_precision * overall_recall) / (overall_precision + overall_recall) if (overall_precision + overall_recall) > 0 else 0.0
        
        print("=" * 70)
        print("OVERALL VALIDATION RESULTS")
        print("=" * 70)
        print(f"Total Images: {len(image_files)}")
        print(f"True Positives: {total_tp}")
        print(f"False Positives: {total_fp}")
        print(f"False Negatives: {total_fn}")
        print(f"Overall Precision: {overall_precision:.2%}")
        print(f"Overall Recall: {overall_recall:.2%}")
        print(f"Overall F1 Score: {overall_f1:.2%}")
        print()
        
        # Save detailed results
        results_file = image_path.parent / f"validation_results_{args.model.stem}.json"
        with open(results_file, 'w') as f:
            json.dump({
                'overall_metrics': {
                    'precision': overall_precision,
                    'recall': overall_recall,
                    'f1_score': overall_f1,
                    'true_positives': total_tp,
                    'false_positives': total_fp,
                    'false_negatives': total_fn
                },
                'per_image_results': all_results
            }, f, indent=2)
        
        print(f"💾 Detailed results saved to: {results_file}")
    
    else:
        print(f"❌ Error: Path not found: {args.image}")
        sys.exit(1)


if __name__ == "__main__":
    main()
