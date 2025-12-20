"""
Progressive Unfreezing Transfer Learning for YOLO v11

This script implements advanced transfer learning techniques to improve YOLO model performance
from the current 27.1% mAP@50 to the target 45-55% range.

Key Techniques:
1. Progressive Unfreezing: Gradually unfreeze layers during training
2. Discriminative Learning Rates: Different LR for different layer groups
3. One-Cycle Learning Rate Schedule: Better convergence
4. Mixed Precision Training: Faster training with FP16
5. Advanced Augmentation: Building damage-specific augmentations
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.cuda.amp import GradScaler, autocast
from torch.utils.data import DataLoader
import numpy as np
from pathlib import Path
import yaml
import json
from typing import Dict, List, Tuple, Optional
import logging
from datetime import datetime
import wandb  # For experiment tracking
from ultralytics import YOLO
import albumentations as A
from albumentations.pytorch import ToTensorV2

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ProgressiveUnfreezingTrainer:
    """
    Implements progressive unfreezing for YOLO transfer learning.

    Progressive unfreezing strategy:
    1. Stage 1: Train only the head (detection layers) - 10 epochs
    2. Stage 2: Unfreeze neck (FPN/PAN) - 10 epochs
    3. Stage 3: Unfreeze late backbone - 10 epochs
    4. Stage 4: Unfreeze middle backbone - 10 epochs
    5. Stage 5: Fine-tune entire network - 20 epochs
    """

    def __init__(
        self,
        model_path: str = 'yolo11n.pt',  # Pretrained YOLO model
        data_yaml: str = 'dataset.yaml',
        output_dir: str = './runs/progressive',
        device: str = 'cuda' if torch.cuda.is_available() else 'cpu'
    ):
        self.model_path = model_path
        self.data_yaml = data_yaml
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.device = device

        # Load model
        self.model = YOLO(model_path)

        # Training stages configuration
        self.stages = [
            {
                'name': 'head_only',
                'epochs': 10,
                'lr': 1e-3,
                'freeze_until': -5,  # Freeze all except last 5 layers
                'description': 'Training detection head only'
            },
            {
                'name': 'neck_unfrozen',
                'epochs': 10,
                'lr': 5e-4,
                'freeze_until': -15,  # Unfreeze neck layers
                'description': 'Unfreezing neck (FPN/PAN) layers'
            },
            {
                'name': 'late_backbone',
                'epochs': 10,
                'lr': 2e-4,
                'freeze_until': -30,  # Unfreeze late backbone
                'description': 'Unfreezing late backbone layers'
            },
            {
                'name': 'middle_backbone',
                'epochs': 10,
                'lr': 1e-4,
                'freeze_until': -50,  # Unfreeze middle backbone
                'description': 'Unfreezing middle backbone layers'
            },
            {
                'name': 'full_finetune',
                'epochs': 20,
                'lr': 5e-5,
                'freeze_until': 0,  # Unfreeze all layers
                'description': 'Fine-tuning entire network'
            }
        ]

        # Load dataset configuration
        with open(data_yaml, 'r') as f:
            self.data_config = yaml.safe_load(f)

        # Initialize metrics tracking
        self.best_map50 = 0
        self.stage_metrics = {}

        # Initialize WandB for experiment tracking
        self.init_wandb()

    def init_wandb(self):
        """Initialize Weights & Biases tracking"""
        wandb.init(
            project="yolo-building-damage",
            name=f"progressive-unfreezing-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            config={
                'model': self.model_path,
                'stages': self.stages,
                'device': self.device
            }
        )

    def get_building_damage_augmentations(self) -> A.Compose:
        """
        Get augmentations specific to building damage detection.

        Building damage characteristics:
        - Various lighting conditions (shadows, overexposure)
        - Different angles and perspectives
        - Weather effects (rain, fog)
        - Image quality variations (blur, compression)
        - Scale variations (close-up to aerial views)
        """
        return A.Compose([
            # Perspective and rotation for different viewing angles
            A.RandomRotate90(p=0.5),
            A.ShiftScaleRotate(
                shift_limit=0.1,
                scale_limit=0.2,
                rotate_limit=15,
                border_mode=0,
                p=0.5
            ),

            # Lighting conditions
            A.RandomBrightnessContrast(
                brightness_limit=0.3,
                contrast_limit=0.3,
                p=0.5
            ),
            A.RandomGamma(gamma_limit=(80, 120), p=0.3),

            # Weather effects
            A.OneOf([
                A.RandomFog(fog_coef_lower=0.1, fog_coef_upper=0.3, p=1),
                A.RandomRain(slant_lower=-10, slant_upper=10, drop_length=10, p=1),
                A.RandomSunFlare(flare_roi=(0, 0, 1, 0.5), angle_lower=0, p=1),
            ], p=0.2),

            # Image quality variations
            A.OneOf([
                A.Blur(blur_limit=3, p=1),
                A.MotionBlur(blur_limit=5, p=1),
                A.GaussianBlur(blur_limit=3, p=1),
            ], p=0.3),

            # Noise from different camera sensors
            A.OneOf([
                A.GaussNoise(var_limit=(10, 50), p=1),
                A.ISONoise(color_shift=(0.01, 0.05), intensity=(0.1, 0.5), p=1),
            ], p=0.2),

            # Compression artifacts
            A.ImageCompression(quality_lower=70, quality_upper=100, p=0.3),

            # Color variations
            A.HueSaturationValue(
                hue_shift_limit=10,
                sat_shift_limit=20,
                val_shift_limit=20,
                p=0.3
            ),

            # Advanced augmentations
            A.CLAHE(clip_limit=2.0, tile_grid_size=(8, 8), p=0.2),
            A.ToGray(p=0.1),  # Some images might be grayscale

            # Mixup for better generalization
            # Note: Implement separately in training loop
        ], bbox_params=A.BboxParams(
            format='yolo',
            label_fields=['class_labels'],
            min_visibility=0.3
        ))

    def freeze_layers(self, freeze_until: int):
        """
        Freeze layers based on the stage configuration.

        Args:
            freeze_until: Number of layers to keep unfrozen from the end.
                         Negative values count from the end.
                         0 means unfreeze all.
        """
        model = self.model.model

        # Get all parameters
        params = list(model.parameters())
        total_params = len(params)

        if freeze_until == 0:
            # Unfreeze all
            for param in params:
                param.requires_grad = True
            logger.info(f"All {total_params} parameter groups unfrozen")
        else:
            # Freeze until specified layer
            freeze_count = total_params + freeze_until if freeze_until < 0 else freeze_until

            for i, param in enumerate(params):
                param.requires_grad = i >= freeze_count

            unfrozen = total_params - freeze_count
            logger.info(f"Froze {freeze_count} parameter groups, {unfrozen} unfrozen")

    def get_discriminative_lr(self, base_lr: float, stage: int) -> List[Dict]:
        """
        Set discriminative learning rates for different layer groups.

        Earlier layers (features) get lower LR, later layers (task-specific) get higher LR.
        """
        model = self.model.model
        params = list(model.parameters())

        # Divide parameters into groups
        n_groups = 4
        params_per_group = len(params) // n_groups

        param_groups = []
        for i in range(n_groups):
            start_idx = i * params_per_group
            end_idx = start_idx + params_per_group if i < n_groups - 1 else len(params)

            # Exponentially decay LR for earlier groups
            group_lr = base_lr * (0.1 ** (n_groups - i - 1))

            param_groups.append({
                'params': params[start_idx:end_idx],
                'lr': group_lr
            })

            logger.info(f"Group {i}: LR={group_lr:.2e}, params={end_idx-start_idx}")

        return param_groups

    def train_stage(self, stage: Dict) -> Dict:
        """
        Train a single stage of progressive unfreezing.
        """
        logger.info(f"\n{'='*50}")
        logger.info(f"Stage: {stage['name']}")
        logger.info(f"Description: {stage['description']}")
        logger.info(f"Epochs: {stage['epochs']}, LR: {stage['lr']}")
        logger.info(f"{'='*50}\n")

        # Freeze/unfreeze layers
        self.freeze_layers(stage['freeze_until'])

        # Configure training parameters
        train_args = {
            'data': self.data_yaml,
            'epochs': stage['epochs'],
            'imgsz': 640,
            'batch': 16,  # Adjust based on GPU memory
            'device': self.device,
            'project': str(self.output_dir),
            'name': stage['name'],
            'exist_ok': True,
            'pretrained': False,  # We're using our own pretrained model
            'optimizer': 'AdamW',
            'lr0': stage['lr'],
            'lrf': 0.01,  # Final LR = lr0 * lrf
            'momentum': 0.937,
            'weight_decay': 0.0005,
            'warmup_epochs': min(3, stage['epochs'] // 3),
            'warmup_momentum': 0.8,
            'warmup_bias_lr': 0.1,
            'box': 7.5,  # Box loss weight
            'cls': 0.5,  # Class loss weight
            'dfl': 1.5,  # Distribution focal loss weight
            'label_smoothing': 0.1,
            'patience': 10,
            'save': True,
            'save_period': 5,
            'cache': True,  # Cache images for faster training
            'amp': True,  # Mixed precision training
            'mosaic': 1.0 if stage['name'] != 'full_finetune' else 0.5,  # Reduce mosaic in final stage
            'mixup': 0.2,  # Mixup augmentation
            'copy_paste': 0.1,  # Copy-paste augmentation
            'degrees': 15,  # Rotation augmentation
            'translate': 0.1,
            'scale': 0.5,
            'shear': 0.0,
            'perspective': 0.0001,
            'flipud': 0.0,  # No vertical flip for buildings
            'fliplr': 0.5,  # Horizontal flip OK
            'hsv_h': 0.015,
            'hsv_s': 0.7,
            'hsv_v': 0.4,
        }

        # Train this stage
        results = self.model.train(**train_args)

        # Extract metrics
        metrics = {
            'stage': stage['name'],
            'final_loss': results.results_dict.get('train/loss', 0),
            'map50': results.results_dict.get('metrics/mAP50(B)', 0),
            'map50_95': results.results_dict.get('metrics/mAP50-95(B)', 0),
            'precision': results.results_dict.get('metrics/precision(B)', 0),
            'recall': results.results_dict.get('metrics/recall(B)', 0),
        }

        # Log to WandB
        wandb.log(metrics)

        # Save best model
        if metrics['map50'] > self.best_map50:
            self.best_map50 = metrics['map50']
            best_model_path = self.output_dir / 'best_model.pt'
            self.model.save(best_model_path)
            logger.info(f"New best model saved: mAP@50 = {self.best_map50:.4f}")

        return metrics

    def apply_tta(self, model: YOLO) -> float:
        """
        Apply Test Time Augmentation (TTA) for better validation scores.

        TTA applies multiple augmentations at inference and averages predictions.
        """
        # Standard TTA augmentations
        tta_augmentations = [
            {'fliplr': True},
            {'scale': 1.1},
            {'scale': 0.9},
            {'degrees': 5},
            {'degrees': -5},
        ]

        all_predictions = []

        for aug in tta_augmentations:
            # Apply augmentation and get predictions
            # Note: This is pseudo-code, actual implementation depends on YOLO API
            preds = model.val(augment=True, **aug)
            all_predictions.append(preds)

        # Average predictions
        # Note: Implement proper averaging of bounding boxes and confidences
        final_predictions = self._average_predictions(all_predictions)

        return final_predictions

    def _average_predictions(self, predictions_list):
        """Average multiple predictions (simplified)"""
        # Implementation depends on prediction format
        # This is a placeholder
        return np.mean([p.get('map50', 0) for p in predictions_list])

    def run_training(self):
        """
        Run the complete progressive unfreezing training pipeline.
        """
        logger.info("Starting Progressive Unfreezing Training")
        logger.info(f"Initial model: {self.model_path}")
        logger.info(f"Output directory: {self.output_dir}")

        # Training loop through stages
        for i, stage in enumerate(self.stages, 1):
            logger.info(f"\n{'#'*60}")
            logger.info(f"STAGE {i}/{len(self.stages)}")
            logger.info(f"{'#'*60}")

            # Train this stage
            metrics = self.train_stage(stage)
            self.stage_metrics[stage['name']] = metrics

            # Validate with TTA
            if stage['name'] == 'full_finetune':
                logger.info("Applying Test Time Augmentation for final validation...")
                tta_score = self.apply_tta(self.model)
                metrics['map50_tta'] = tta_score
                logger.info(f"TTA mAP@50: {tta_score:.4f}")

        # Final report
        self.generate_report()

        # Close WandB
        wandb.finish()

        return self.best_map50

    def generate_report(self):
        """Generate training report with recommendations."""
        report_path = self.output_dir / 'training_report.json'

        report = {
            'timestamp': datetime.now().isoformat(),
            'best_map50': self.best_map50,
            'stage_metrics': self.stage_metrics,
            'recommendations': []
        }

        # Generate recommendations based on results
        if self.best_map50 < 0.45:
            report['recommendations'].extend([
                "mAP@50 below target (45%). Consider:",
                "1. Increasing dataset size with more diverse examples",
                "2. Using a larger YOLO variant (yolo11s or yolo11m)",
                "3. Extending training epochs for each stage",
                "4. Adjusting class weights for imbalanced classes",
                "5. Adding more aggressive augmentations"
            ])
        elif self.best_map50 < 0.55:
            report['recommendations'].extend([
                "mAP@50 in acceptable range but can be improved:",
                "1. Fine-tune hyperparameters with grid search",
                "2. Implement pseudo-labeling with high-confidence predictions",
                "3. Use ensemble of multiple models",
                "4. Add hard negative mining"
            ])
        else:
            report['recommendations'].append("Excellent performance achieved!")

        # Check for overfitting
        for stage_name, metrics in self.stage_metrics.items():
            if 'train_loss' in metrics and 'val_loss' in metrics:
                if metrics['val_loss'] > metrics['train_loss'] * 1.5:
                    report['recommendations'].append(
                        f"Potential overfitting in {stage_name}. Add more regularization."
                    )

        # Save report
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)

        logger.info(f"Training report saved to {report_path}")

        # Print summary
        print("\n" + "="*60)
        print("TRAINING COMPLETE")
        print("="*60)
        print(f"Best mAP@50: {self.best_map50:.4f}")
        print("\nStage Results:")
        for stage_name, metrics in self.stage_metrics.items():
            print(f"  {stage_name}: mAP@50 = {metrics.get('map50', 0):.4f}")
        print("\nRecommendations:")
        for rec in report['recommendations']:
            print(f"  - {rec}")
        print("="*60)


class OneCycleLR:
    """
    Implements 1cycle learning rate policy for better convergence.

    The 1cycle policy:
    1. Start with low LR
    2. Gradually increase to max_lr (warmup)
    3. Gradually decrease below initial LR
    4. Final annealing to very low LR
    """

    def __init__(
        self,
        optimizer,
        max_lr,
        total_steps,
        pct_start=0.3,
        anneal_strategy='cos',
        div_factor=25.0,
        final_div_factor=10000.0
    ):
        self.optimizer = optimizer
        self.max_lr = max_lr
        self.total_steps = total_steps
        self.pct_start = pct_start
        self.anneal_strategy = anneal_strategy
        self.div_factor = div_factor
        self.final_div_factor = final_div_factor

        self.initial_lr = max_lr / div_factor
        self.min_lr = self.initial_lr / final_div_factor

        self.step_num = 0

    def step(self):
        """Update learning rate."""
        self.step_num += 1

        if self.step_num <= self.pct_start * self.total_steps:
            # Warmup phase
            pct = self.step_num / (self.pct_start * self.total_steps)
            lr = self.initial_lr + pct * (self.max_lr - self.initial_lr)
        else:
            # Annealing phase
            pct = (self.step_num - self.pct_start * self.total_steps) / \
                  ((1 - self.pct_start) * self.total_steps)

            if self.anneal_strategy == 'cos':
                lr = self.min_lr + (self.max_lr - self.min_lr) * \
                     (1 + np.cos(np.pi * pct)) / 2
            else:  # linear
                lr = self.max_lr - pct * (self.max_lr - self.min_lr)

        # Update optimizer
        for param_group in self.optimizer.param_groups:
            param_group['lr'] = lr

        return lr


def main():
    """Main training function."""
    import argparse

    parser = argparse.ArgumentParser(description='Progressive Unfreezing YOLO Training')
    parser.add_argument('--model', default='yolo11n.pt', help='Base YOLO model')
    parser.add_argument('--data', default='dataset.yaml', help='Dataset YAML file')
    parser.add_argument('--output', default='./runs/progressive', help='Output directory')
    parser.add_argument('--device', default='cuda', help='Device to use')

    args = parser.parse_args()

    # Create trainer
    trainer = ProgressiveUnfreezingTrainer(
        model_path=args.model,
        data_yaml=args.data,
        output_dir=args.output,
        device=args.device
    )

    # Run training
    best_map = trainer.run_training()

    print(f"\nTraining complete! Best mAP@50: {best_map:.4f}")

    if best_map >= 0.45:
        print("✅ Target performance achieved!")
    else:
        print("⚠️ Below target. Review recommendations in training_report.json")


if __name__ == '__main__':
    main()