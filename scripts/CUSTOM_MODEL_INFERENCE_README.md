# Custom Model Inference Support

## ✅ Enhanced YOLO Inference Script

The `yolo26-inference.py` script has been enhanced to support your custom trained models, specifically `best_model_final_v2.pt` for building defect detection.

## Quick Usage

```bash
# Use your custom trained model
python scripts/yolo26-inference.py image.jpg --model best_model_final_v2.pt

# With data.yaml (optional - model has class names built-in)
python scripts/yolo26-inference.py image.jpg --model best_model_final_v2.pt --data-yaml yolo_dataset/data.yaml
```

## What Was Added

### 1. Custom Model Support
- ✅ Automatic detection of custom vs pretrained models
- ✅ Model file validation and path resolution
- ✅ Detailed model information display (size, type, classes)

### 2. Class Name Loading
- ✅ Optional `--data-yaml` parameter to load class names from data.yaml
- ✅ Automatic class name display from model metadata
- ✅ Support for models with 15 building defect classes

### 3. Enhanced Output
- ✅ Shows model type (Custom Trained vs Pretrained)
- ✅ Displays all class names for custom models
- ✅ File size and path information

## Your Custom Model

**Model:** `best_model_final_v2.pt`
- **Size:** 49.65 MB
- **Type:** YOLOv11 Building Defect Detection
- **Classes:** 15 building defect types
- **Location:** Project root directory

### Detected Classes

1. `pipe_leak` - Pipe leaks
2. `water_damage` - Water stains and damage  
3. `wall_crack` - Cracks in walls
4. `roof_damage` - Roof damage
5. `electrical_fault` - Electrical problems
6. `mold_damp` - Mold and dampness
7. `fire_damage` - Fire damage
8. `window_broken` - Broken windows
9. `door_damaged` - Damaged doors
10. `floor_damage` - Floor damage
11. `ceiling_damage` - Ceiling damage
12. `foundation_crack` - Foundation cracks
13. `hvac_issue` - HVAC system issues
14. `gutter_blocked` - Blocked gutters
15. `general_damage` - General building damage

## Example Output

When running with your custom model, you'll see:

```
============================================================
YOLO INFERENCE SCRIPT
============================================================

✅ Input image: yolo_dataset/images/sample.jpg
   Size: 245.32 KB

📁 Output directory: yolo_dataset/images

🔄 Loading model: best_model_final_v2.pt
✅ Model loaded successfully
   Model type: Building Defect Detection (Custom)
   File size: 49.65 MB
   Path: C:\...\best_model_final_v2.pt
   Classes: 15
   Class names:
     0: pipe_leak
     1: water_damage
     2: wall_crack
     ... (all 15 classes)

🔍 Running inference...
   Confidence threshold: 0.25

✅ Inference completed successfully!

📊 Results for image 1:
   Detections: 3
   Classes detected:
     - wall_crack: 87.5% confidence
     - water_damage: 72.3% confidence
     - general_damage: 45.1% confidence
```

## Testing Your Model

Test on your validation images:

```bash
# Single image test
python scripts/yolo26-inference.py yolo_dataset/val/images/0358620_jpg.rf.cca6e2fbfd6a147204000046c1140bc1.jpg --model best_model_final_v2.pt

# Batch test (no display, save to results/)
for img in yolo_dataset/val/images/*.jpg; do
    python scripts/yolo26-inference.py "$img" --model best_model_final_v2.pt --output results/ --no-show
done
```

## Integration

This script works seamlessly with:
- Your existing YOLO training pipeline
- Local YOLO deployment (`LOCAL_YOLO_DEPLOYMENT_COMPLETE.md`)
- Building Surveyor AI services
- SAM2/SAM3 segmentation services

## Files Modified

- ✅ `scripts/yolo26-inference.py` - Enhanced with custom model support
- ✅ `scripts/YOLO26_INFERENCE_GUIDE.md` - Updated documentation
- ✅ `scripts/CUSTOM_MODEL_INFERENCE_README.md` - This file

## Additional Scripts

### Batch Processing Script

Process multiple images at once and generate summary reports:

```bash
# Process all validation images
python scripts/batch-yolo-inference.py yolo_dataset/val/images/ --model best_model_final_v2.pt

# Process first 10 images (for testing)
python scripts/batch-yolo-inference.py yolo_dataset/val/images/ --model best_model_final_v2.pt --max 10

# Custom output directory and confidence threshold
python scripts/batch-yolo-inference.py yolo_dataset/val/images/ --model best_model_final_v2.pt --output batch_results/ --conf 0.5
```

**Output:**
- Annotated images saved to `batch_results/results/`
- JSON report with statistics: `batch_results/batch_results_TIMESTAMP.json`
- Summary showing detections by class

### Validation Script

Compare predictions with ground truth labels:

```bash
# Validate single image
python scripts/validate-yolo-predictions.py image.jpg --model best_model_final_v2.pt --labels labels/image.txt

# Validate entire validation set
python scripts/validate-yolo-predictions.py yolo_dataset/val/images/ --model best_model_final_v2.pt --labels-dir yolo_dataset/val/labels/
```

**Metrics Calculated:**
- Precision, Recall, F1 Score
- True Positives, False Positives, False Negatives
- Per-image and overall statistics

## Next Steps

1. ✅ Test the script with your custom model
2. ✅ Use batch processing for validation set
3. ✅ Compare results with ground truth labels
4. Integrate into your Building Surveyor AI pipeline
5. Use for continuous model validation
