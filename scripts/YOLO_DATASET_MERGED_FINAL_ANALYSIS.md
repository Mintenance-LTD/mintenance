# YOLO Dataset Merged Final - Analysis

## 📊 Dataset Overview

**Location:** `yolo_dataset_merged_final/`

**Purpose:** Merged dataset combining Building Defect Detection dataset with SAM2 labeled images for training YOLO models.

## 📁 Structure

```
yolo_dataset_merged_final/
├── data.yaml              # Dataset configuration
├── merge_stats.json       # Merging statistics
├── train/
│   ├── images/           # 3,119 training images
│   └── labels/           # 3,119 label files
├── val/
│   ├── images/           # 1,454 validation images
│   └── labels/           # 1,454 label files
└── test/
    ├── images/           # 204 test images
    └── labels/           # 204 label files
```

## 📈 Statistics

### Current File Counts
- **Train:** 3,119 images
- **Validation:** 1,454 images
- **Test:** 204 images
- **Total:** 4,777 images

### Expected (from merge_stats.json)
- **Train:** 4,692 images
- **Validation:** 1,785 images
- **Test:** 398 images
- **Total:** 6,875 images

**Note:** There's a discrepancy between expected and actual file counts. Some images may have been removed during cleaning or the merge_stats.json reflects an earlier state.

## 🏷️ Classes (15 Building Defect Types)

From `data.yaml`:

1. `general_damage` (class 0)
2. `cracks` (class 1)
3. `mold` (class 2)
4. `water_damage` (class 3)
5. `structural_damage` (class 4)
6. `electrical_issues` (class 5)
7. `plumbing_issues` (class 6)
8. `roofing_damage` (class 7)
9. `window_damage` (class 8)
10. `door_damage` (class 9)
11. `floor_damage` (class 10)
12. `wall_damage` (class 11)
13. `ceiling_damage` (class 12)
14. `hvac_issues` (class 13)
15. `insulation_issues` (class 14)

## 📋 Dataset Configuration

**data.yaml:**
```yaml
path: .
train: train/images
val: val/images
test: val/images  # Note: test uses val/images path
nc: 15
names: [15 class names listed above]
```

## 🔍 Sources

According to `merge_stats.json`, this dataset was created by merging:

1. **Existing Dataset:** `Building Defect Detection 7.v2i.yolov11`
   - Roboflow dataset with 71 classes
   - Mapped to 15 maintenance classes

2. **SAM2 Dataset:** `sam2_labeled_2000_images`
   - SAM2 auto-labeled images
   - Enhanced with segmentation data

## ✅ Compatibility with Your Scripts

This dataset is **fully compatible** with all your YOLO inference scripts:

### 1. Single Image Inference
```bash
python scripts/yolo26-inference.py \
    yolo_dataset_merged_final/val/images/sample.jpg \
    --model best_model_final_v2.pt \
    --data-yaml yolo_dataset_merged_final/data.yaml
```

### 2. Batch Processing
```bash
python scripts/batch-yolo-inference.py \
    yolo_dataset_merged_final/val/images/ \
    --model best_model_final_v2.pt \
    --output merged_val_results/
```

### 3. Validation
```bash
python scripts/validate-yolo-predictions.py \
    yolo_dataset_merged_final/val/images/ \
    --model best_model_final_v2.pt \
    --labels-dir yolo_dataset_merged_final/val/labels/
```

## 🎯 Use Cases

### Training
- Use `data.yaml` for training new models
- Large training set (3,119 images) for robust training
- Good validation set (1,454 images) for evaluation

### Testing
- Test set (204 images) for final model evaluation
- Can be used with validation scripts

### Model Evaluation
- Compare `best_model_final_v2.pt` predictions with ground truth
- Calculate precision, recall, F1 scores
- Analyze class distribution

## 📊 Dataset Quality Checks

### Recommended Checks:

1. **Label File Validation**
   ```bash
   # Check for empty label files
   find yolo_dataset_merged_final -name "*.txt" -empty
   ```

2. **Image-Label Matching**
   ```bash
   # Verify all images have corresponding labels
   python -c "
   from pathlib import Path
   train_imgs = set(p.stem for p in Path('yolo_dataset_merged_final/train/images').glob('*.jpg'))
   train_labels = set(p.stem for p in Path('yolo_dataset_merged_final/train/labels').glob('*.txt'))
   print(f'Missing labels: {len(train_imgs - train_labels)}')
   print(f'Extra labels: {len(train_labels - train_imgs)}')
   "
   ```

3. **Class Distribution Analysis**
   ```bash
   # Analyze class distribution in labels
   python scripts/batch-yolo-inference.py \
       yolo_dataset_merged_final/train/images/ \
       --model best_model_final_v2.pt \
       --max 100 \
       --output class_analysis/
   ```

## 🔧 Training with This Dataset

### Using Your Training Script
```bash
python train-yolo-model.py
```

This will use:
- **Data:** `yolo_dataset_merged_final/data.yaml`
- **Model:** `yolov11n.pt` (nano)
- **Epochs:** 100
- **Output:** `runs/train/merged_model_v1/`

### Custom Training
```python
from ultralytics import YOLO

model = YOLO('yolov11n.pt')
model.train(
    data='yolo_dataset_merged_final/data.yaml',
    epochs=100,
    imgsz=640,
    batch=16
)
```

## 📝 Notes

1. **Test Set Path:** In `data.yaml`, test uses `val/images` path. This is fine for training but you may want to update it to `test/images` if you have a separate test set.

2. **Class Mapping:** The dataset uses 15 classes which match your `best_model_final_v2.pt` model classes.

3. **File Count Discrepancy:** The actual file count (4,777) is less than expected (6,875). This could be due to:
   - Cleaning/removal of empty or invalid labels
   - Deduplication
   - File system differences

4. **Dataset Size:** With 3,119 training images, this is a substantial dataset for training building defect detection models.

## 🚀 Quick Start

### Test Dataset with Your Model
```bash
# Quick test on validation set
python scripts/batch-yolo-inference.py \
    yolo_dataset_merged_final/val/images/ \
    --model best_model_final_v2.pt \
    --max 10 \
    --output test_merged_dataset/
```

### Validate Model Performance
```bash
# Validate on validation set
python scripts/validate-yolo-predictions.py \
    yolo_dataset_merged_final/val/images/ \
    --model best_model_final_v2.pt \
    --labels-dir yolo_dataset_merged_final/val/labels/ \
    --conf 0.25
```

## 📚 Related Files

- `merge-sam2-dataset.py` - Script that created this dataset
- `merge_stats.json` - Original merging statistics
- `create-final-clean-dataset.py` - Script for cleaning dataset
- `train-yolo-model.py` - Training script using this dataset
