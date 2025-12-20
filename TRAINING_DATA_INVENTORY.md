# Training Data Inventory - Mintenance AI System

## Overview
This document provides a comprehensive inventory of all training data available in the Mintenance codebase for AI model training and fine-tuning.

---

## 1. YOLO Building Defect Detection Dataset

### Location
`Building Defect Detection 7.v2i.yolov11/`

### Dataset Statistics
- **Total Images**: 4,941
  - Training Set: 3,729 images (75.5%)
  - Validation Set: 814 images (16.5%)
  - Test Set: 398 images (8%)

### Dataset Format
- **Image Format**: JPEG/JPG
- **Annotation Format**: YOLO v11 (normalized bounding box with class labels)
- **Label Files**: One `.txt` file per image with polygon segmentation coordinates

### Classes (71 defect types)
From `data.yaml`:
- water-damage
- crack
- rot
- mold
- missing-parts
- hole
- discoloration
- structural-damage
- rust
- damp
- stain
- peeling-paint
- weathering
- scratch
- moss
- damage
- broken
- dirt
- corrosion
- chipped-paint
- exposed-brick
- deterioration
- water-stain
- leak
- graffiti
- efflorescence
- wear
- algae
- foundation-crack
- sagging
- spalling
- vegetation
- debris
- warping
- erosion
- broken-glass
- broken-window
- exposed-rebar
- deformation
- missing-tiles
- electrical-damage
- missing-shingles
- fading
- loose-material
- clogged
- pest-damage
- settlement
- fire-damage
- biological-growth
- blistering
- impact-damage
- exposed-insulation
- cracked-glass
- loose-shingles
- gutter-damage
- ice-dam
- ponding-water
- loose-siding
- heat-damage
- chemical-damage
- buckling
- termite-damage
- cracked-tile
- exposed-wood
- flaking
- hail-damage
- soot
- mineral-deposits
- crumbling
- UV-damage
- broken-tile
- smoke-damage

### Source
- **Provider**: Roboflow
- **Workspace**: mintenance
- **Version**: 7.v2i
- **Augmentation**: Yes (Roboflow preprocessing applied)

### Pre-trained Models
- **Base Model**: `yolo11n.pt` (YOLOv11 nano)
- **Fine-tuned Model**: `runs/detect/building-defect-v2-normalized-cpu/weights/best.pt`
  - Trained for 100 epochs
  - CPU training (no GPU)
  - Image size: 640x640
  - Batch size: Auto (-1)

---

## 2. SAM 3 Training Configuration

### Location
`apps/sam3-service/venv/src/sam3/sam3/train/configs/odinw13/`

### Available Configurations
- `odinw_text_only_train.yaml` - Text-prompted training configuration for ODINW dataset

### Training Pipeline
The SAM 3 training configuration includes:
- **Data Transforms**:
  - FilterCrowds (remove crowded annotations)
  - RandomizeInputBbox (add noise to bounding boxes)
  - DecodeRle (decode run-length encoded masks)
  - RandomResize (multi-scale training)
  - PadToSize (consistent input dimensions)
  - Normalization

### Required Setup for SAM 3 Training
To train SAM 3 on custom data, you need:
1. BPE tokenizer: `assets/bpe_simple_vocab_16e6.txt.gz`
2. ODINW data format conversion
3. Few-shot training setup (default: 10-shot learning)

---

## 3. Model Checkpoints

### YOLO Models
- **Pre-trained**: `yolo11n.pt` (11.0 MB)
- **Fine-tuned on Building Defects**:
  - Best: `runs/detect/building-defect-v2-normalized-cpu/weights/best.pt`
  - Last: `runs/detect/building-defect-v2-normalized-cpu/weights/last.pt`

### SAM 3 Models
- **Location**: Downloaded from Hugging Face on demand
- **Cache**: `~/.cache/huggingface/hub/`
- **Model**: facebook/sam2.1-hiera-large (via Hugging Face)

---

## 4. Data Preparation Scripts

### YOLO Label Normalization
- **Script**: `Building Defect Detection 7.v2i.yolov11/normalize_labels.py`
- **Purpose**: Normalizes YOLO labels to ensure consistency
- **Backup**: Original labels saved in `_backup_before_normalize/`

---

## 5. Training Data Quality

### YOLO Dataset Quality
- **Annotations**: Polygon segmentation masks (not just bounding boxes)
- **Label Format**: Class ID followed by normalized polygon coordinates
- **Coverage**: Comprehensive coverage of 71 building defect types
- **Balance**: Dataset may have class imbalance (common in defect detection)

### Example Label Format (YOLO)
```
58 1 0.403159615625 0.496789453125 0.200252775 0.38854744218750004 ...
```
- First number: Class ID (58)
- Following numbers: Normalized polygon coordinates (x,y pairs)

---

## 6. Recommendations for Model Training

### For YOLO Fine-tuning
1. **Use existing dataset**: 4,941 images with 71 defect classes
2. **Consider GPU training**: Current model trained on CPU (slow)
3. **Data augmentation**: Already applied by Roboflow
4. **Class weights**: May need balancing for rare defect types

### For SAM 3 Fine-tuning
1. **Convert YOLO dataset**: Need to convert polygon annotations to RLE masks
2. **Create text prompts**: Map 71 class names to natural language descriptions
3. **Few-shot learning**: Start with 10-shot per class as configured
4. **Use continuum learning**: Build on pre-trained SAM 3 weights

### For Hybrid System
1. **Use both models**: YOLO for detection, SAM 3 for segmentation
2. **Bayesian fusion**: Combine predictions using fusion weights
3. **Calibration data**: Collect validation predictions for weight optimization

---

## 7. Data Pipeline Integration

### Current Integration Points
- **YOLO**: Direct inference via `yolo` command or Python API
- **SAM 3**: REST API via FastAPI service (port 8001)
- **Fusion**: Bayesian combination in BuildingSurveyorService

### Training Data Flow
```
Images → YOLO Training → Detection Model
      ↓
Images + Text → SAM 3 Training → Segmentation Model
      ↓
Both Models → Bayesian Fusion → Final Predictions
```

---

## 8. Missing Data & Opportunities

### Currently Missing
1. **SAM 3 training data**: No custom SAM 3 dataset (uses pre-trained only)
2. **Calibration data**: No stored calibration/validation predictions
3. **Synthetic data**: No synthetic damage generation pipeline
4. **Human feedback**: No RLHF or human annotation pipeline
5. **Continuum memory**: No stored learning memories from production

### Opportunities for Data Collection
1. **Production feedback loop**: Collect user corrections
2. **Synthetic generation**: Use GPT-4V to generate training descriptions
3. **Active learning**: Identify low-confidence predictions for labeling
4. **Transfer learning**: Use YOLO dataset for SAM 3 fine-tuning

---

## Summary

The Mintenance codebase contains:
- **4,941 labeled building defect images** (YOLO format)
- **71 defect classes** with polygon segmentation
- **Pre-trained and fine-tuned models** ready for inference
- **Training configurations** for both YOLO and SAM 3

This training data provides a solid foundation for building damage detection, with opportunities to enhance the system through SAM 3 fine-tuning and continuum learning implementation.