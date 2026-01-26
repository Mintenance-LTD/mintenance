# YOLO Inference Scripts - Complete Summary

## 📋 Available Scripts

### 1. Single Image Inference (`yolo26-inference.py`)
**Purpose:** Run inference on a single image with detailed output

```bash
python scripts/yolo26-inference.py image.jpg --model best_model_final_v2.pt
```

**Features:**
- ✅ Works with pretrained YOLO26 models
- ✅ Works with custom trained models
- ✅ Optional data.yaml support
- ✅ Visual display and file saving
- ✅ Detailed detection information

---

### 2. Batch Processing (`batch-yolo-inference.py`)
**Purpose:** Process multiple images and generate summary statistics

```bash
python scripts/batch-yolo-inference.py yolo_dataset/val/images/ --model best_model_final_v2.pt
```

**Features:**
- ✅ Process entire directories
- ✅ Summary statistics
- ✅ Class distribution analysis
- ✅ JSON report generation
- ✅ Annotated images output
- ✅ Progress tracking

**Use Cases:**
- Testing model on validation set
- Generating statistics
- Quick performance overview
- Batch annotation generation

---

### 3. Validation (`validate-yolo-predictions.py`)
**Purpose:** Compare predictions with ground truth labels

```bash
python scripts/validate-yolo-predictions.py \
    yolo_dataset/val/images/ \
    --model best_model_final_v2.pt \
    --labels-dir yolo_dataset/val/labels/
```

**Features:**
- ✅ Precision, Recall, F1 Score calculation
- ✅ IoU-based matching
- ✅ Per-image and overall metrics
- ✅ Detailed JSON reports
- ✅ Single image or batch validation

**Use Cases:**
- Model evaluation
- Performance metrics
- Model comparison
- Confidence threshold tuning

---

## 🎯 Quick Reference

### Single Image
```bash
# Basic inference
python scripts/yolo26-inference.py image.jpg --model best_model_final_v2.pt

# With data.yaml
python scripts/yolo26-inference.py image.jpg --model best_model_final_v2.pt --data-yaml yolo_dataset/data.yaml

# Custom confidence
python scripts/yolo26-inference.py image.jpg --model best_model_final_v2.pt --conf 0.5
```

### Batch Processing
```bash
# Process all images
python scripts/batch-yolo-inference.py yolo_dataset/val/images/ --model best_model_final_v2.pt

# Test with 10 images
python scripts/batch-yolo-inference.py yolo_dataset/val/images/ --model best_model_final_v2.pt --max 10

# Custom output
python scripts/batch-yolo-inference.py yolo_dataset/val/images/ --model best_model_final_v2.pt --output my_results/
```

### Validation
```bash
# Single image validation
python scripts/validate-yolo-predictions.py image.jpg --model best_model_final_v2.pt --labels labels/image.txt

# Full validation set
python scripts/validate-yolo-predictions.py yolo_dataset/val/images/ --model best_model_final_v2.pt --labels-dir yolo_dataset/val/labels/
```

---

## 📊 Typical Workflow

### 1. Quick Test
```bash
# Test on a few images
python scripts/yolo26-inference.py yolo_dataset/val/images/sample.jpg --model best_model_final_v2.pt
```

### 2. Batch Processing
```bash
# Process validation set
python scripts/batch-yolo-inference.py yolo_dataset/val/images/ --model best_model_final_v2.pt --output validation_results/
```

### 3. Validation
```bash
# Validate against ground truth
python scripts/validate-yolo-predictions.py yolo_dataset/val/images/ --model best_model_final_v2.pt --labels-dir yolo_dataset/val/labels/
```

### 4. Analysis
- Review annotated images in `results/` directory
- Check JSON reports for detailed statistics
- Compare metrics across different models/thresholds

---

## 📁 Output Structure

### Single Image Inference
```
output_dir/
└── yolo26_results/
    └── image_result.jpg
```

### Batch Processing
```
batch_results/
├── results/                    # Annotated images
│   ├── image1_result.jpg
│   └── image2_result.jpg
└── batch_results_TIMESTAMP.json  # Statistics report
```

### Validation
```
validation_results_MODEL.json  # Detailed metrics
```

---

## 🔧 Model Support

All scripts support:
- ✅ Pretrained YOLO26 models (`yolo26n.pt`, `yolo26s.pt`, etc.)
- ✅ Custom trained models (`best_model_final_v2.pt`)
- ✅ YOLOv11 models
- ✅ Any Ultralytics YOLO format model

---

## 📚 Documentation

- `scripts/YOLO26_INFERENCE_GUIDE.md` - Complete inference guide
- `scripts/CUSTOM_MODEL_INFERENCE_README.md` - Custom model support
- `scripts/BATCH_AND_VALIDATION_GUIDE.md` - Batch and validation guide
- `scripts/YOLO_SCRIPTS_SUMMARY.md` - This file

---

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   pip install -U ultralytics pyyaml
   ```

2. **Test single image:**
   ```bash
   python scripts/yolo26-inference.py yolo_dataset/val/images/sample.jpg --model best_model_final_v2.pt
   ```

3. **Process validation set:**
   ```bash
   python scripts/batch-yolo-inference.py yolo_dataset/val/images/ --model best_model_final_v2.pt --max 10
   ```

4. **Validate predictions:**
   ```bash
   python scripts/validate-yolo-predictions.py yolo_dataset/val/images/ --model best_model_final_v2.pt --labels-dir yolo_dataset/val/labels/ --max 10
   ```

---

## ✅ All Scripts Tested and Working!

All scripts have been tested with your `best_model_final_v2.pt` model and are ready for production use.
