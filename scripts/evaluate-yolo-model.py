#!/usr/bin/env python
"""
YOLO Model Evaluation Script for Building Surveyor AI

Evaluates YOLO models on test datasets and outputs comprehensive metrics
for integration with the ModelEvaluationService.
"""

import argparse
import json
import os
import sys
from pathlib import Path
from datetime import datetime
import numpy as np
from typing import Dict, List, Tuple, Any
import warnings
warnings.filterwarnings('ignore')

try:
    from ultralytics import YOLO
    import torch
    import yaml
except ImportError as e:
    print(f"Error: Required package not installed: {e}")
    print("Please install: pip install ultralytics torch pyyaml")
    sys.exit(1)


class YOLOModelEvaluator:
    """Comprehensive YOLO model evaluation"""

    def __init__(self, model_path: str, device: str = 'cpu'):
        """
        Initialize the evaluator with a YOLO model.

        Args:
            model_path: Path to the YOLO model file (.pt or .onnx)
            device: Device to run evaluation on ('cpu' or 'cuda')
        """
        self.model_path = Path(model_path)
        self.device = device

        if not self.model_path.exists():
            raise FileNotFoundError(f"Model not found: {model_path}")

        print(f"Loading model: {self.model_path}")
        self.model = YOLO(str(self.model_path))

        # Move model to device
        if device == 'cuda' and torch.cuda.is_available():
            self.model.to('cuda')
            print(f"Using CUDA device: {torch.cuda.get_device_name(0)}")
        else:
            self.model.to('cpu')
            print("Using CPU for evaluation")

    def evaluate(self,
                 dataset_path: str,
                 conf_threshold: float = 0.25,
                 iou_threshold: float = 0.45,
                 max_det: int = 300,
                 batch_size: int = 1,
                 verbose: bool = False) -> Dict[str, Any]:
        """
        Evaluate the model on a test dataset.

        Args:
            dataset_path: Path to the test dataset (YOLO format)
            conf_threshold: Confidence threshold for predictions
            iou_threshold: IoU threshold for NMS
            max_det: Maximum detections per image
            batch_size: Batch size for evaluation
            verbose: Print detailed progress

        Returns:
            Dictionary containing evaluation metrics
        """
        print(f"\n{'='*60}")
        print("Starting Model Evaluation")
        print(f"{'='*60}")
        print(f"Dataset: {dataset_path}")
        print(f"Confidence Threshold: {conf_threshold}")
        print(f"IoU Threshold: {iou_threshold}")
        print(f"Max Detections: {max_det}")
        print(f"Batch Size: {batch_size}")

        # Find data.yaml file
        data_yaml = self._find_data_yaml(dataset_path)
        if not data_yaml:
            raise FileNotFoundError(f"No data.yaml found in {dataset_path}")

        print(f"Using data configuration: {data_yaml}")

        # Run validation
        try:
            results = self.model.val(
                data=str(data_yaml),
                conf=conf_threshold,
                iou=iou_threshold,
                max_det=max_det,
                batch=batch_size,
                device=self.device,
                verbose=verbose,
                save_json=True,  # Save COCO format results
                save_conf=True,  # Save confidence scores
                plots=False      # Don't generate plots (can enable if needed)
            )

            # Extract metrics
            metrics = self._extract_metrics(results)

            # Add evaluation metadata
            metrics['evaluation_metadata'] = {
                'model_path': str(self.model_path),
                'dataset_path': dataset_path,
                'conf_threshold': conf_threshold,
                'iou_threshold': iou_threshold,
                'max_det': max_det,
                'batch_size': batch_size,
                'device': self.device,
                'timestamp': datetime.now().isoformat()
            }

            # Calculate additional metrics
            metrics = self._calculate_additional_metrics(metrics)

            print(f"\n{'='*60}")
            print("Evaluation Complete!")
            print(f"{'='*60}")
            self._print_summary(metrics)

            return metrics

        except Exception as e:
            print(f"Error during evaluation: {e}")
            raise

    def _find_data_yaml(self, dataset_path: str) -> Path:
        """Find the data.yaml configuration file."""
        dataset_path = Path(dataset_path)

        # Check common locations
        candidates = [
            dataset_path / 'data.yaml',
            dataset_path.parent / 'data.yaml',
            Path('data.yaml'),  # Current directory
        ]

        for candidate in candidates:
            if candidate.exists():
                return candidate

        # Search recursively
        for yaml_file in dataset_path.rglob('*.yaml'):
            if 'data' in yaml_file.name.lower():
                return yaml_file

        return None

    def _extract_metrics(self, results) -> Dict[str, Any]:
        """Extract metrics from YOLO validation results."""
        metrics = {}

        # Core metrics
        if hasattr(results, 'box'):
            box = results.box
            metrics['mAP50'] = float(box.map50) if hasattr(box, 'map50') else 0
            metrics['mAP50_95'] = float(box.map) if hasattr(box, 'map') else 0
            metrics['precision'] = float(box.mp) if hasattr(box, 'mp') else 0
            metrics['recall'] = float(box.mr) if hasattr(box, 'mr') else 0
        else:
            # Fallback for different result structure
            metrics['mAP50'] = float(results.results_dict.get('metrics/mAP50(B)', 0))
            metrics['mAP50_95'] = float(results.results_dict.get('metrics/mAP50-95(B)', 0))
            metrics['precision'] = float(results.results_dict.get('metrics/precision(B)', 0))
            metrics['recall'] = float(results.results_dict.get('metrics/recall(B)', 0))

        # Per-class metrics
        if hasattr(results, 'ap_class_index'):
            per_class_metrics = {}
            class_names = results.names if hasattr(results, 'names') else {}

            for i, class_idx in enumerate(results.ap_class_index):
                class_name = class_names.get(class_idx, f'class_{class_idx}')
                per_class_metrics[class_name] = {
                    'ap50': float(results.ap50[i]) if i < len(results.ap50) else 0,
                    'ap': float(results.ap[i]) if i < len(results.ap) else 0,
                    'precision': float(results.p[i]) if i < len(results.p) else 0,
                    'recall': float(results.r[i]) if i < len(results.r) else 0,
                }

            metrics['per_class_metrics'] = per_class_metrics

        # Confusion matrix
        if hasattr(results, 'confusion_matrix'):
            cm = results.confusion_matrix
            if hasattr(cm, 'matrix'):
                metrics['confusion_matrix'] = cm.matrix.tolist()

        # Speed metrics
        if hasattr(results, 'speed'):
            speed = results.speed
            metrics['inference_speed'] = {
                'preprocess_ms': float(speed.get('preprocess', 0)),
                'inference_ms': float(speed.get('inference', 0)),
                'postprocess_ms': float(speed.get('postprocess', 0)),
                'total_ms': float(sum(speed.values()))
            }

        return metrics

    def _calculate_additional_metrics(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate additional derived metrics."""

        # F1 Score
        precision = metrics.get('precision', 0)
        recall = metrics.get('recall', 0)
        if precision + recall > 0:
            metrics['f1_score'] = 2 * (precision * recall) / (precision + recall)
        else:
            metrics['f1_score'] = 0

        # Model size
        model_size_bytes = os.path.getsize(self.model_path)
        metrics['model_size_mb'] = model_size_bytes / (1024 * 1024)

        # Calculate accuracy if confusion matrix is available
        if 'confusion_matrix' in metrics:
            cm = np.array(metrics['confusion_matrix'])
            if cm.size > 0:
                correct = np.trace(cm)
                total = np.sum(cm)
                metrics['accuracy'] = float(correct / total) if total > 0 else 0

        # Add quality indicators
        metrics['quality_indicators'] = {
            'meets_production_threshold': (
                metrics.get('mAP50', 0) >= 0.70 and
                metrics.get('precision', 0) >= 0.75 and
                metrics.get('recall', 0) >= 0.70
            ),
            'high_quality': metrics.get('mAP50', 0) >= 0.85,
            'needs_improvement': metrics.get('mAP50', 0) < 0.60
        }

        return metrics

    def _print_summary(self, metrics: Dict[str, Any]):
        """Print a formatted summary of evaluation metrics."""
        print("\n" + "="*40)
        print("EVALUATION METRICS SUMMARY")
        print("="*40)

        # Core metrics
        print("\nCore Metrics:")
        print(f"  mAP@50:       {metrics.get('mAP50', 0):.4f}")
        print(f"  mAP@50-95:    {metrics.get('mAP50_95', 0):.4f}")
        print(f"  Precision:    {metrics.get('precision', 0):.4f}")
        print(f"  Recall:       {metrics.get('recall', 0):.4f}")
        print(f"  F1 Score:     {metrics.get('f1_score', 0):.4f}")

        if 'accuracy' in metrics:
            print(f"  Accuracy:     {metrics['accuracy']:.4f}")

        # Model info
        print(f"\nModel Size: {metrics.get('model_size_mb', 0):.2f} MB")

        # Speed metrics
        if 'inference_speed' in metrics:
            speed = metrics['inference_speed']
            print(f"\nInference Speed:")
            print(f"  Total: {speed['total_ms']:.2f} ms/image")
            print(f"  FPS: {1000/speed['total_ms']:.2f}")

        # Quality indicators
        if 'quality_indicators' in metrics:
            qi = metrics['quality_indicators']
            print(f"\nQuality Assessment:")
            print(f"  Production Ready: {'✅ Yes' if qi['meets_production_threshold'] else '❌ No'}")
            print(f"  High Quality: {'✅ Yes' if qi['high_quality'] else '❌ No'}")
            print(f"  Needs Improvement: {'⚠️ Yes' if qi['needs_improvement'] else '✅ No'}")

        # Top performing classes
        if 'per_class_metrics' in metrics:
            print("\nTop 5 Performing Classes:")
            sorted_classes = sorted(
                metrics['per_class_metrics'].items(),
                key=lambda x: x[1]['ap50'],
                reverse=True
            )[:5]

            for class_name, class_metrics in sorted_classes:
                print(f"  {class_name:20s} - AP50: {class_metrics['ap50']:.3f}")

        print("\n" + "="*40)

    def predict_single_image(self, image_path: str, save_path: str = None) -> Dict:
        """
        Run prediction on a single image for testing.

        Args:
            image_path: Path to the test image
            save_path: Optional path to save annotated result

        Returns:
            Prediction results
        """
        results = self.model(image_path)

        if save_path:
            results[0].save(save_path)

        # Extract predictions
        predictions = []
        for r in results:
            if r.boxes is not None:
                for box, cls, conf in zip(r.boxes.xyxy, r.boxes.cls, r.boxes.conf):
                    predictions.append({
                        'bbox': box.tolist(),
                        'class_id': int(cls),
                        'class_name': r.names[int(cls)],
                        'confidence': float(conf)
                    })

        return {
            'image_path': image_path,
            'num_detections': len(predictions),
            'predictions': predictions
        }


def main():
    """Main entry point for the evaluation script."""
    parser = argparse.ArgumentParser(
        description='Evaluate YOLO model on test dataset'
    )

    parser.add_argument(
        '--model',
        type=str,
        required=True,
        help='Path to YOLO model file (.pt or .onnx)'
    )

    parser.add_argument(
        '--dataset',
        type=str,
        required=True,
        help='Path to test dataset directory'
    )

    parser.add_argument(
        '--conf',
        type=float,
        default=0.25,
        help='Confidence threshold (default: 0.25)'
    )

    parser.add_argument(
        '--iou',
        type=float,
        default=0.45,
        help='IoU threshold for NMS (default: 0.45)'
    )

    parser.add_argument(
        '--max-det',
        type=int,
        default=300,
        help='Maximum detections per image (default: 300)'
    )

    parser.add_argument(
        '--device',
        type=str,
        default='cpu',
        choices=['cpu', 'cuda'],
        help='Device to run evaluation on (default: cpu)'
    )

    parser.add_argument(
        '--batch',
        type=int,
        default=1,
        help='Batch size for evaluation (default: 1)'
    )

    parser.add_argument(
        '--output-json',
        type=str,
        help='Path to save evaluation results as JSON'
    )

    parser.add_argument(
        '--test-image',
        type=str,
        help='Optional: Test on a single image first'
    )

    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Print detailed progress during evaluation'
    )

    args = parser.parse_args()

    try:
        # Initialize evaluator
        evaluator = YOLOModelEvaluator(args.model, args.device)

        # Optional: Test on single image
        if args.test_image:
            print(f"\nTesting on single image: {args.test_image}")
            test_result = evaluator.predict_single_image(args.test_image)
            print(f"Detected {test_result['num_detections']} objects")
            for pred in test_result['predictions'][:5]:  # Show first 5
                print(f"  - {pred['class_name']}: {pred['confidence']:.3f}")

        # Run full evaluation
        metrics = evaluator.evaluate(
            dataset_path=args.dataset,
            conf_threshold=args.conf,
            iou_threshold=args.iou,
            max_det=args.max_det,
            batch_size=args.batch,
            verbose=args.verbose
        )

        # Save results if requested
        if args.output_json:
            output_path = Path(args.output_json)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            with open(output_path, 'w') as f:
                json.dump(metrics, f, indent=2, default=str)

            print(f"\nResults saved to: {output_path}")

        # Exit with appropriate code
        if metrics.get('quality_indicators', {}).get('meets_production_threshold', False):
            print("\n✅ Model meets production thresholds!")
            sys.exit(0)
        else:
            print("\n⚠️ Model does not meet production thresholds yet.")
            sys.exit(1)

    except Exception as e:
        print(f"\n❌ Evaluation failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(2)


if __name__ == "__main__":
    main()