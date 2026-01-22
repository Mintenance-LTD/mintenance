# Batch Processing and Validation Guide

Complete guide for batch processing images and validating model predictions against ground truth labels.

## Quick Start

### Batch Processing

```bash
# Process all validation images
python scripts/batch-yolo-inference.py yolo_dataset/val/images/ --model best_model_final_v2.pt

# Process with custom settings
python scripts/batch-yolo-inference.py yolo_dataset/val/images/ \
    --model best_model_final_v2.pt \
    --output my_results/ \
    --conf 0.5 \
    --max 20
```

### Validation

```bash
# Validate single image
python scripts/validate-yolo-predictions.py \
    yolo_dataset/val/images/sample.jpg \
    --model best_model_final_v2.pt \
    --labels yolo_dataset/val/labels/sample.txt

# Validate entire validation set
python scripts/validate-yolo-predictions.py \
    yolo_dataset/val/images/ \
    --model best_model_final_v2.pt \
    --labels-dir yolo_dataset/val/labels/
```

## Batch Processing Script

### Features

- ✅ Process multiple images in one command
- ✅ Generate summary statistics
- ✅ Class distribution analysis
- ✅ JSON report with detailed results
- ✅ Annotated images output

### Usage

```bash
python scripts/batch-yolo-inference.py <image_dir> --model <model_path> [options]
```

### Options

- `--model MODEL` - Path to YOLO model (required)
- `--output OUTPUT` - Output directory (default: `batch_inference_results/`)
- `--conf CONF` - Confidence threshold 0.0-1.0 (default: 0.25)
- `--max MAX` - Maximum number of images to process (for testing)

### Example Output

```
======================================================================
BATCH PROCESSING COMPLETE
======================================================================

📊 SUMMARY
----------------------------------------------------------------------
Total images processed: 20
  ✅ Successful: 20
  ❌ Failed: 0
Total detections: 35
Average detections per image: 1.75

📈 DETECTIONS BY CLASS
----------------------------------------------------------------------
  roofing_damage           :   12 ( 34.3%)
  wall_crack               :    8 ( 22.9%)
  water_damage             :    7 ( 20.0%)
  general_damage           :    5 ( 14.3%)
  window_damage            :    3 (  8.6%)

💾 Detailed results saved to: batch_results/batch_results_20260119_113740.json
🖼️  Annotated images saved to: batch_results/results
```

### Output Files

1. **JSON Report** (`batch_results_TIMESTAMP.json`)
   - Complete results for each image
   - Class statistics
   - Detection details with bounding boxes

2. **Annotated Images** (`results/`)
   - All images with bounding boxes and labels
   - Ready for visual inspection

## Validation Script

### Features

- ✅ Compare predictions with ground truth labels
- ✅ Calculate precision, recall, F1 score
- ✅ IoU-based matching
- ✅ Per-image and overall metrics
- ✅ Detailed JSON report

### Usage

**Single Image:**
```bash
python scripts/validate-yolo-predictions.py \
    image.jpg \
    --model best_model_final_v2.pt \
    --labels labels/image.txt
```

**Directory:**
```bash
python scripts/validate-yolo-predictions.py \
    yolo_dataset/val/images/ \
    --model best_model_final_v2.pt \
    --labels-dir yolo_dataset/val/labels/
```

### Options

- `--model MODEL` - Path to YOLO model (required)
- `--labels LABELS` - Ground truth label file (for single image)
- `--labels-dir LABELS_DIR` - Directory with label files (for directory)
- `--conf CONF` - Confidence threshold (default: 0.25)
- `--iou IOU` - IoU threshold for matching (default: 0.5)

### Metrics Explained

- **Precision**: True Positives / (True Positives + False Positives)
  - How many predictions were correct?
  
- **Recall**: True Positives / (True Positives + False Negatives)
  - How many ground truth objects were found?
  
- **F1 Score**: Harmonic mean of precision and recall
  - Overall performance metric

- **IoU (Intersection over Union)**: Overlap between predicted and ground truth boxes
  - Used to determine if a prediction matches ground truth

### Example Output

```
======================================================================
OVERALL VALIDATION RESULTS
======================================================================
Total Images: 20
True Positives: 28
False Positives: 7
False Negatives: 5
Overall Precision: 80.00%
Overall Recall: 84.85%
Overall F1 Score: 82.35%

💾 Detailed results saved to: validation_results_best_model_final_v2.json
```

## Workflow Examples

### 1. Quick Model Test

```bash
# Test on 10 images
python scripts/batch-yolo-inference.py \
    yolo_dataset/val/images/ \
    --model best_model_final_v2.pt \
    --max 10 \
    --output quick_test/
```

### 2. Full Validation Set Processing

```bash
# Process all validation images
python scripts/batch-yolo-inference.py \
    yolo_dataset/val/images/ \
    --model best_model_final_v2.pt \
    --output validation_results/

# Validate against ground truth
python scripts/validate-yolo-predictions.py \
    yolo_dataset/val/images/ \
    --model best_model_final_v2.pt \
    --labels-dir yolo_dataset/val/labels/ \
    --conf 0.25
```

### 3. Model Comparison

```bash
# Test model v1
python scripts/batch-yolo-inference.py \
    yolo_dataset/val/images/ \
    --model best_model_final.pt \
    --output results_v1/

# Test model v2
python scripts/batch-yolo-inference.py \
    yolo_dataset/val/images/ \
    --model best_model_final_v2.pt \
    --output results_v2/

# Compare validation metrics
python scripts/validate-yolo-predictions.py \
    yolo_dataset/val/images/ \
    --model best_model_final.pt \
    --labels-dir yolo_dataset/val/labels/ > metrics_v1.txt

python scripts/validate-yolo-predictions.py \
    yolo_dataset/val/images/ \
    --model best_model_final_v2.pt \
    --labels-dir yolo_dataset/val/labels/ > metrics_v2.txt
```

### 4. Confidence Threshold Tuning

```bash
# Test different confidence thresholds
for conf in 0.15 0.25 0.35 0.5; do
    echo "Testing confidence threshold: $conf"
    python scripts/validate-yolo-predictions.py \
        yolo_dataset/val/images/ \
        --model best_model_final_v2.pt \
        --labels-dir yolo_dataset/val/labels/ \
        --conf $conf
done
```

## Tips

1. **Start Small**: Use `--max 10` to test scripts before processing full dataset
2. **Check Output**: Review annotated images in `results/` directory
3. **Analyze JSON**: JSON reports contain detailed information for further analysis
4. **IoU Threshold**: Adjust `--iou` if you want stricter/looser matching (default 0.5)
5. **Confidence Tuning**: Lower confidence = more detections (may include false positives)
6. **Batch Processing**: Use for quick overview of model performance
7. **Validation**: Use for precise metrics and comparison with ground truth

## Integration

These scripts work seamlessly with:
- Your custom trained models (`best_model_final_v2.pt`)
- YOLO label format (`.txt` files)
- Your validation dataset structure
- Existing YOLO inference pipeline

## Files

- `scripts/batch-yolo-inference.py` - Batch processing script
- `scripts/validate-yolo-predictions.py` - Validation script
- `scripts/yolo26-inference.py` - Single image inference script
