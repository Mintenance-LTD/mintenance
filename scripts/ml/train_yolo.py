#!/usr/bin/env python3
"""
Train YOLO model for building defect detection with continuous learning support.
"""

import os
import json
import argparse
import yaml
from pathlib import Path
from typing import Dict, Any, Optional, List
import torch
from ultralytics import YOLO
import wandb
import numpy as np
from datetime import datetime
import hashlib
import shutil

class YOLOTrainer:
    def __init__(
        self,
        config_path: Optional[str] = None,
        use_wandb: bool = True
    ):
        self.config = self.load_config(config_path) if config_path else {}
        self.use_wandb = use_wandb and os.environ.get('WANDB_API_KEY')

        if self.use_wandb:
            wandb.init(
                project="mintenance-yolo",
                config=self.config,
                tags=["building-defects", "continuous-learning"]
            )

    def load_config(self, config_path: str) -> Dict[str, Any]:
        """Load training configuration from YAML file."""
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)

    def get_base_model(self, mode: str = 'incremental') -> str:
        """Get the base model path based on training mode."""

        if mode == 'full':
            # Start from pretrained YOLOv8
            return 'yolov8x.pt'
        elif mode == 'incremental':
            # Load the last best model from S3 or local storage
            last_model = self.get_last_model()
            if last_model and os.path.exists(last_model):
                print(f"Loading previous model from {last_model}")
                return last_model
            else:
                print("No previous model found, starting from pretrained")
                return 'yolov8x.pt'
        else:  # experimental
            # Use a smaller model for experiments
            return 'yolov8m.pt'

    def get_last_model(self) -> Optional[str]:
        """Get the path to the last trained model."""

        # Check local model registry
        model_registry = Path('/tmp/model_registry')
        if model_registry.exists():
            models = sorted(model_registry.glob('*/weights/best.pt'))
            if models:
                return str(models[-1])

        # Check S3 (if configured)
        if os.environ.get('AWS_ACCESS_KEY_ID'):
            import boto3
            s3 = boto3.client('s3')
            try:
                response = s3.list_objects_v2(
                    Bucket='mintenance-ml-models',
                    Prefix='yolo/',
                    MaxKeys=1
                )
                if response.get('Contents'):
                    # Download the latest model
                    latest_key = response['Contents'][0]['Key']
                    local_path = f'/tmp/last_model.pt'
                    s3.download_file('mintenance-ml-models', latest_key, local_path)
                    return local_path
            except Exception as e:
                print(f"Failed to fetch model from S3: {e}")

        return None

    def apply_class_weights(self, data_yaml_path: str) -> Dict[int, float]:
        """Calculate class weights to handle imbalanced dataset."""

        # Load dataset to calculate class frequencies
        with open(data_yaml_path, 'r') as f:
            data_config = yaml.safe_load(f)

        train_labels_dir = Path(data_config['train']).parent / 'labels'

        class_counts = np.zeros(data_config['nc'])
        total_instances = 0

        for label_file in train_labels_dir.glob('*.txt'):
            with open(label_file, 'r') as f:
                for line in f:
                    if line.strip():
                        class_id = int(line.split()[0])
                        if class_id < data_config['nc']:
                            class_counts[class_id] += 1
                            total_instances += 1

        # Calculate weights (inverse frequency)
        class_weights = {}
        for i in range(data_config['nc']):
            if class_counts[i] > 0:
                weight = (total_instances / (data_config['nc'] * class_counts[i]))
                # Clip weights to reasonable range
                class_weights[i] = min(max(weight, 0.5), 3.0)
            else:
                class_weights[i] = 1.0

        print(f"Class weights calculated: {len(class_weights)} classes")
        return class_weights

    def get_augmentation_config(self, mode: str) -> Dict[str, Any]:
        """Get augmentation configuration based on training mode."""

        if mode == 'experimental':
            # Heavy augmentation for experiments
            return {
                'hsv_h': 0.015,
                'hsv_s': 0.7,
                'hsv_v': 0.4,
                'degrees': 15,
                'translate': 0.2,
                'scale': 0.5,
                'shear': 5,
                'perspective': 0.001,
                'flipud': 0.5,
                'fliplr': 0.5,
                'mosaic': 1.0,
                'mixup': 0.2,
                'copy_paste': 0.3
            }
        else:
            # Standard augmentation
            return {
                'hsv_h': 0.01,
                'hsv_s': 0.5,
                'hsv_v': 0.3,
                'degrees': 10,
                'translate': 0.1,
                'scale': 0.3,
                'shear': 2,
                'perspective': 0.0,
                'flipud': 0.2,
                'fliplr': 0.5,
                'mosaic': 0.8,
                'mixup': 0.1,
                'copy_paste': 0.1
            }

    def train(
        self,
        data_yaml: str,
        epochs: int = 100,
        batch_size: int = 16,
        imgsz: int = 640,
        device: str = '0',
        project: str = 'runs/train',
        name: str = 'yolo_building_defects',
        mode: str = 'incremental',
        patience: int = 20,
        optimizer: str = 'AdamW',
        lr0: float = 0.01,
        lrf: float = 0.01,
        momentum: float = 0.937,
        weight_decay: float = 0.0005,
        warmup_epochs: float = 3.0,
        close_mosaic: int = 10
    ) -> Path:
        """Train YOLO model with specified configuration."""

        # Get base model
        base_model = self.get_base_model(mode)

        # Initialize YOLO model
        model = YOLO(base_model)

        # Calculate class weights
        class_weights = self.apply_class_weights(data_yaml)

        # Get augmentation config
        aug_config = self.get_augmentation_config(mode)

        # Training arguments
        train_args = {
            'data': data_yaml,
            'epochs': epochs,
            'batch': batch_size,
            'imgsz': imgsz,
            'device': device,
            'project': project,
            'name': name,
            'patience': patience,
            'optimizer': optimizer,
            'lr0': lr0,
            'lrf': lrf,
            'momentum': momentum,
            'weight_decay': weight_decay,
            'warmup_epochs': warmup_epochs,
            'close_mosaic': close_mosaic,
            'save': True,
            'save_period': 10,
            'cache': True,
            'pretrained': mode != 'incremental',
            'resume': False,
            'amp': True,  # Automatic mixed precision
            'fraction': 1.0,
            'profile': False,
            'overlap_mask': True,
            'mask_ratio': 4,
            'dropout': 0.0,
            'val': True,
            'plots': True,
            **aug_config
        }

        # Add callbacks for continuous learning
        if mode == 'incremental':
            train_args['freeze'] = 10  # Freeze backbone for first epochs

        # Train model
        results = model.train(**train_args)

        # Get best model path
        best_model_path = Path(project) / name / 'weights' / 'best.pt'

        # Log metrics to wandb
        if self.use_wandb:
            metrics = {
                'final_epoch': results.epoch[-1] if hasattr(results, 'epoch') else epochs,
                'best_fitness': results.fitness if hasattr(results, 'fitness') else 0,
                'final_precision': results.results_dict.get('metrics/precision(B)', 0),
                'final_recall': results.results_dict.get('metrics/recall(B)', 0),
                'final_mAP50': results.results_dict.get('metrics/mAP50(B)', 0),
                'final_mAP50_95': results.results_dict.get('metrics/mAP50-95(B)', 0)
            }
            wandb.log(metrics)
            wandb.save(str(best_model_path))

        return best_model_path

    def evaluate(
        self,
        model_path: str,
        data_yaml: str,
        split: str = 'test',
        batch_size: int = 32,
        imgsz: int = 640,
        device: str = '0',
        conf_threshold: float = 0.001,
        iou_threshold: float = 0.6
    ) -> Dict[str, Any]:
        """Evaluate trained model on test set."""

        model = YOLO(model_path)

        # Update data yaml to use test split
        with open(data_yaml, 'r') as f:
            data_config = yaml.safe_load(f)

        # Run validation
        metrics = model.val(
            data=data_yaml,
            batch=batch_size,
            imgsz=imgsz,
            device=device,
            split=split,
            conf=conf_threshold,
            iou=iou_threshold,
            save_json=True,
            save_hybrid=False,
            plots=True
        )

        # Extract key metrics
        evaluation_results = {
            'precision': float(metrics.box.p),
            'recall': float(metrics.box.r),
            'mAP50': float(metrics.box.map50),
            'mAP50_95': float(metrics.box.map),
            'fitness': float(metrics.fitness),
            'speed': {
                'preprocess': float(metrics.speed['preprocess']),
                'inference': float(metrics.speed['inference']),
                'postprocess': float(metrics.speed['postprocess'])
            },
            'per_class': {}
        }

        # Add per-class metrics
        for i, class_name in enumerate(data_config['names']):
            if i < len(metrics.box.p_class):
                evaluation_results['per_class'][class_name] = {
                    'precision': float(metrics.box.p_class[i]),
                    'recall': float(metrics.box.r_class[i]),
                    'mAP50': float(metrics.box.map50_class[i]),
                    'mAP50_95': float(metrics.box.map_class[i])
                }

        return evaluation_results

    def export_model(
        self,
        model_path: str,
        output_dir: str,
        formats: List[str] = ['onnx', 'torchscript', 'tflite']
    ) -> Dict[str, str]:
        """Export model to various formats for deployment."""

        model = YOLO(model_path)
        exported_paths = {}

        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        for format_type in formats:
            try:
                if format_type == 'onnx':
                    exported_path = model.export(
                        format='onnx',
                        imgsz=640,
                        opset=12,
                        simplify=True,
                        dynamic=True
                    )
                elif format_type == 'torchscript':
                    exported_path = model.export(
                        format='torchscript',
                        imgsz=640,
                        optimize=True
                    )
                elif format_type == 'tflite':
                    exported_path = model.export(
                        format='tflite',
                        imgsz=640,
                        int8=False  # Use FP16 instead of INT8 for better accuracy
                    )
                elif format_type == 'tensorrt':
                    if torch.cuda.is_available():
                        exported_path = model.export(
                            format='engine',
                            imgsz=640,
                            device=0,
                            half=True  # FP16 precision
                        )
                else:
                    continue

                # Move to output directory
                if exported_path:
                    final_path = output_path / Path(exported_path).name
                    shutil.move(exported_path, final_path)
                    exported_paths[format_type] = str(final_path)

            except Exception as e:
                print(f"Failed to export to {format_type}: {e}")

        return exported_paths

    def calculate_model_hash(self, model_path: str) -> str:
        """Calculate hash of model for versioning."""
        hasher = hashlib.sha256()
        with open(model_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                hasher.update(chunk)
        return hasher.hexdigest()[:12]


def main():
    parser = argparse.ArgumentParser(description='Train YOLO for building defect detection')
    parser.add_argument('--config', help='Training configuration file')
    parser.add_argument('--data-yaml', required=True, help='Path to data.yaml file')
    parser.add_argument('--epochs', type=int, default=100, help='Number of epochs')
    parser.add_argument('--batch-size', type=int, default=16, help='Batch size')
    parser.add_argument('--imgsz', type=int, default=640, help='Image size')
    parser.add_argument('--device', default='0', help='CUDA device')
    parser.add_argument('--project', default='runs/train', help='Project directory')
    parser.add_argument('--name', default='yolo_building', help='Experiment name')
    parser.add_argument('--mode', choices=['full', 'incremental', 'experimental'],
                       default='incremental', help='Training mode')
    parser.add_argument('--patience', type=int, default=20, help='Early stopping patience')
    parser.add_argument('--export', action='store_true', help='Export model after training')
    parser.add_argument('--evaluate', action='store_true', help='Evaluate after training')

    args = parser.parse_args()

    # Initialize trainer
    trainer = YOLOTrainer(config_path=args.config, use_wandb=True)

    # Train model
    print(f"Starting training in {args.mode} mode...")
    best_model = trainer.train(
        data_yaml=args.data_yaml,
        epochs=args.epochs,
        batch_size=args.batch_size,
        imgsz=args.imgsz,
        device=args.device,
        project=args.project,
        name=args.name,
        mode=args.mode,
        patience=args.patience
    )

    print(f"Training complete. Best model saved at: {best_model}")

    # Evaluate if requested
    if args.evaluate:
        print("Evaluating model...")
        metrics = trainer.evaluate(
            model_path=str(best_model),
            data_yaml=args.data_yaml,
            device=args.device
        )

        # Save metrics
        metrics_path = best_model.parent.parent / 'metrics.json'
        with open(metrics_path, 'w') as f:
            json.dump(metrics, f, indent=2)

        print(f"Evaluation metrics:")
        print(f"  Precision: {metrics['precision']:.3f}")
        print(f"  Recall: {metrics['recall']:.3f}")
        print(f"  mAP@50: {metrics['mAP50']:.3f}")
        print(f"  mAP@50-95: {metrics['mAP50_95']:.3f}")

    # Export if requested
    if args.export:
        print("Exporting model...")
        export_dir = best_model.parent.parent / 'exports'
        exported = trainer.export_model(
            model_path=str(best_model),
            output_dir=str(export_dir)
        )
        print(f"Exported formats: {list(exported.keys())}")

    # Calculate model hash for versioning
    model_hash = trainer.calculate_model_hash(str(best_model))
    print(f"Model hash: {model_hash}")

    # Save training summary
    summary = {
        'model_path': str(best_model),
        'model_hash': model_hash,
        'training_mode': args.mode,
        'epochs': args.epochs,
        'timestamp': datetime.now().isoformat()
    }

    summary_path = best_model.parent.parent / 'training_summary.json'
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)


if __name__ == '__main__':
    main()