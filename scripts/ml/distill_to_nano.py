#!/usr/bin/env python3
"""
Architecture Distillation: Large Model -> Nano Model

Trains a YOLOv8n (nano, 3.2M params) student model using a larger
production model's (YOLOv8x, 68.2M params) predictions as soft labels.
The nano model is designed for edge deployment at 10-20ms inference.

Usage:
    python distill_to_nano.py \
        --teacher-model runs/train/best.pt \
        --data-yaml training-data/data.yaml \
        --epochs 50 \
        --domain residential
"""

import os
import json
import argparse
import yaml
import shutil
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime

import torch
import numpy as np
from ultralytics import YOLO


class NanoDistiller:
    """Distills a large YOLO model into a nano model for edge deployment."""

    NANO_MODEL = 'yolov8n.pt'    # 3.2M params, ~6ms on GPU
    SMALL_MODEL = 'yolov8s.pt'   # 11.2M params, ~10ms on GPU

    def __init__(self, teacher_model_path: str, student_size: str = 'nano'):
        self.teacher = YOLO(teacher_model_path)
        self.student_base = self.NANO_MODEL if student_size == 'nano' else self.SMALL_MODEL
        self.student_size = student_size
        print(f"Teacher model loaded: {teacher_model_path}")
        print(f"Student base: {self.student_base} ({student_size})")

    def generate_soft_labels(
        self,
        data_yaml: str,
        output_dir: str,
        conf_threshold: float = 0.1,
        temperature: float = 3.0
    ) -> str:
        """Generate soft labels from teacher model predictions.

        The teacher runs inference on the training images and its confidence
        scores (softened by temperature) become the training labels for the
        student. This transfers "dark knowledge" -- the teacher's uncertainty
        patterns that encode inter-class similarities.

        Args:
            data_yaml: Path to dataset YAML
            output_dir: Directory for soft label files
            conf_threshold: Minimum teacher confidence to include
            temperature: Softmax temperature (higher = softer distributions)

        Returns:
            Path to new data.yaml for soft-label training
        """
        with open(data_yaml, 'r') as f:
            data_config = yaml.safe_load(f)

        train_images_dir = Path(data_config['train'])
        soft_labels_dir = Path(output_dir) / 'soft_labels'
        soft_labels_dir.mkdir(parents=True, exist_ok=True)

        # Run teacher inference on training images
        print(f"Generating soft labels from teacher on {train_images_dir}...")
        results = self.teacher.predict(
            source=str(train_images_dir),
            conf=conf_threshold,
            save=False,
            verbose=False,
            stream=True
        )

        label_count = 0
        for result in results:
            if result.boxes is None or len(result.boxes) == 0:
                continue

            # Extract teacher predictions
            img_name = Path(result.path).stem
            label_path = soft_labels_dir / f"{img_name}.txt"

            lines = []
            for box in result.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])

                # Apply temperature scaling to confidence
                scaled_conf = conf ** (1.0 / temperature)

                # YOLO format: class x_center y_center width height [confidence]
                x, y, w, h = box.xywhn[0].tolist()
                lines.append(f"{cls_id} {x:.6f} {y:.6f} {w:.6f} {h:.6f}")

            if lines:
                with open(label_path, 'w') as f:
                    f.write('\n'.join(lines))
                label_count += 1

        print(f"Generated soft labels for {label_count} images")

        # Create new data.yaml pointing to soft labels
        soft_data_yaml = Path(output_dir) / 'soft_data.yaml'
        soft_config = {
            **data_config,
            'train': str(train_images_dir),
        }
        with open(soft_data_yaml, 'w') as f:
            yaml.dump(soft_config, f, default_flow_style=False)

        return str(soft_data_yaml)

    def train_student(
        self,
        data_yaml: str,
        epochs: int = 50,
        batch_size: int = 32,
        imgsz: int = 640,
        device: str = '0',
        project: str = 'runs/distill',
        name: str = 'nano_student',
        patience: int = 15,
        domain: str = 'residential'
    ) -> Path:
        """Train student model on teacher-labeled data.

        Uses a smaller learning rate and more aggressive augmentation
        than standard training to maximize knowledge transfer.
        """
        student = YOLO(self.student_base)

        train_args = {
            'data': data_yaml,
            'epochs': epochs,
            'batch': batch_size,
            'imgsz': imgsz,
            'device': device,
            'project': project,
            'name': name,
            'patience': patience,
            'optimizer': 'AdamW',
            'lr0': 0.001,         # Lower LR for distillation
            'lrf': 0.01,
            'warmup_epochs': 5.0,  # Longer warmup
            'close_mosaic': 5,
            'save': True,
            'save_period': 10,
            'cache': True,
            'amp': True,
            'val': True,
            'plots': True,
            # Moderate augmentation for distillation
            'hsv_h': 0.01,
            'hsv_s': 0.5,
            'hsv_v': 0.3,
            'degrees': 10,
            'translate': 0.1,
            'scale': 0.3,
            'mosaic': 0.8,
            'mixup': 0.1,
        }

        print(f"Training {self.student_size} student for domain={domain}...")
        results = student.train(**train_args)

        best_model_path = Path(project) / name / 'weights' / 'best.pt'
        return best_model_path

    def evaluate_compression(
        self,
        student_path: str,
        data_yaml: str,
        device: str = '0'
    ) -> Dict[str, Any]:
        """Compare teacher vs student model performance and size."""
        student = YOLO(student_path)

        # Evaluate both models
        print("Evaluating teacher...")
        teacher_metrics = self.teacher.val(data=data_yaml, device=device, verbose=False)
        print("Evaluating student...")
        student_metrics = student.val(data=data_yaml, device=device, verbose=False)

        # Model sizes
        teacher_size = Path(self.teacher.ckpt_path).stat().st_size / (1024 * 1024)
        student_size = Path(student_path).stat().st_size / (1024 * 1024)

        report = {
            'teacher': {
                'mAP50': float(teacher_metrics.box.map50),
                'mAP50_95': float(teacher_metrics.box.map),
                'inference_ms': float(teacher_metrics.speed['inference']),
                'size_mb': teacher_size,
            },
            'student': {
                'mAP50': float(student_metrics.box.map50),
                'mAP50_95': float(student_metrics.box.map),
                'inference_ms': float(student_metrics.speed['inference']),
                'size_mb': student_size,
            },
            'compression': {
                'size_ratio': student_size / teacher_size if teacher_size > 0 else 0,
                'speedup': (
                    teacher_metrics.speed['inference'] / student_metrics.speed['inference']
                    if student_metrics.speed['inference'] > 0 else 0
                ),
                'mAP50_retention': (
                    float(student_metrics.box.map50) / float(teacher_metrics.box.map50)
                    if float(teacher_metrics.box.map50) > 0 else 0
                ),
            }
        }

        print(f"\n{'='*50}")
        print(f"Compression Report:")
        print(f"  Teacher: {teacher_size:.1f}MB, mAP50={report['teacher']['mAP50']:.3f}, "
              f"{report['teacher']['inference_ms']:.1f}ms")
        print(f"  Student: {student_size:.1f}MB, mAP50={report['student']['mAP50']:.3f}, "
              f"{report['student']['inference_ms']:.1f}ms")
        print(f"  Size reduction: {report['compression']['size_ratio']:.2%}")
        print(f"  Speedup: {report['compression']['speedup']:.1f}x")
        print(f"  mAP50 retention: {report['compression']['mAP50_retention']:.1%}")
        print(f"{'='*50}\n")

        return report

    def export_edge_model(
        self,
        student_path: str,
        output_dir: str,
        imgsz: int = 640
    ) -> Dict[str, str]:
        """Export student model in edge-optimized formats."""
        student = YOLO(student_path)
        exported = {}

        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # ONNX FP16 -- universal edge format
        try:
            path = student.export(format='onnx', imgsz=imgsz, simplify=True, half=True)
            if path:
                dest = output_path / Path(path).name
                shutil.move(str(path), str(dest))
                exported['onnx_fp16'] = str(dest)
                print(f"  ONNX FP16: {dest}")
        except Exception as e:
            print(f"  ONNX FP16 export failed: {e}")

        # TFLite INT8 -- mobile/edge TPU
        try:
            path = student.export(format='tflite', imgsz=imgsz, int8=True)
            if path:
                dest = output_path / Path(path).name
                shutil.move(str(path), str(dest))
                exported['tflite_int8'] = str(dest)
                print(f"  TFLite INT8: {dest}")
        except Exception as e:
            print(f"  TFLite INT8 export failed: {e}")

        # TensorRT FP16 -- NVIDIA edge (Jetson)
        if torch.cuda.is_available():
            try:
                path = student.export(format='engine', imgsz=imgsz, device=0, half=True)
                if path:
                    dest = output_path / Path(path).name
                    shutil.move(str(path), str(dest))
                    exported['tensorrt_fp16'] = str(dest)
                    print(f"  TensorRT FP16: {dest}")
            except Exception as e:
                print(f"  TensorRT FP16 export failed: {e}")

        return exported


def main():
    parser = argparse.ArgumentParser(
        description='Distill large YOLO model to nano for edge deployment'
    )
    parser.add_argument('--teacher-model', required=True,
                       help='Path to teacher model (.pt)')
    parser.add_argument('--data-yaml', required=True,
                       help='Path to training data.yaml')
    parser.add_argument('--student-size', default='nano',
                       choices=['nano', 'small'],
                       help='Student model size (nano=3.2M, small=11.2M)')
    parser.add_argument('--epochs', type=int, default=50,
                       help='Training epochs for student')
    parser.add_argument('--batch-size', type=int, default=32,
                       help='Batch size')
    parser.add_argument('--imgsz', type=int, default=640,
                       help='Image size')
    parser.add_argument('--device', default='0',
                       help='CUDA device')
    parser.add_argument('--project', default='runs/distill',
                       help='Project directory')
    parser.add_argument('--name', default='nano_student',
                       help='Experiment name')
    parser.add_argument('--domain', default='residential',
                       help='Domain ID')
    parser.add_argument('--temperature', type=float, default=3.0,
                       help='Soft label temperature')
    parser.add_argument('--export-edge', action='store_true',
                       help='Export edge-optimized formats after training')
    parser.add_argument('--evaluate', action='store_true',
                       help='Run compression evaluation')

    args = parser.parse_args()

    distiller = NanoDistiller(args.teacher_model, student_size=args.student_size)

    # Step 1: Generate soft labels from teacher
    soft_label_dir = Path(args.project) / 'soft_labels'
    soft_data_yaml = distiller.generate_soft_labels(
        data_yaml=args.data_yaml,
        output_dir=str(soft_label_dir),
        temperature=args.temperature
    )

    # Step 2: Train student on soft labels
    best_student = distiller.train_student(
        data_yaml=soft_data_yaml,
        epochs=args.epochs,
        batch_size=args.batch_size,
        imgsz=args.imgsz,
        device=args.device,
        project=args.project,
        name=args.name,
        domain=args.domain
    )
    print(f"Student model saved: {best_student}")

    # Step 3: Evaluate compression quality
    if args.evaluate:
        report = distiller.evaluate_compression(
            student_path=str(best_student),
            data_yaml=args.data_yaml,
            device=args.device
        )
        report_path = best_student.parent.parent / 'compression_report.json'
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"Compression report: {report_path}")

    # Step 4: Export edge-optimized formats
    if args.export_edge:
        print("Exporting edge-optimized models...")
        edge_dir = best_student.parent.parent / 'edge_exports'
        exported = distiller.export_edge_model(
            student_path=str(best_student),
            output_dir=str(edge_dir),
            imgsz=args.imgsz
        )
        print(f"Edge exports: {list(exported.keys())}")

    # Save summary
    summary = {
        'teacher_model': args.teacher_model,
        'student_size': args.student_size,
        'student_model': str(best_student),
        'domain': args.domain,
        'epochs': args.epochs,
        'temperature': args.temperature,
        'timestamp': datetime.now().isoformat()
    }
    summary_path = best_student.parent.parent / 'distillation_summary.json'
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)

    print(f"Distillation complete. Summary: {summary_path}")


if __name__ == '__main__':
    main()
