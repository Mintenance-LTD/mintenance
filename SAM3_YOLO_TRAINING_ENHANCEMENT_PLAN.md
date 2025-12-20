# SAM3 + YOLO Training Enhancement Plan

## Executive Summary

Use SAM3 (Segment Anything Model 3) to **dramatically improve YOLO training accuracy** by:
1. **Auto-labeling** the 4,193 filtered Dataset 6 images with precise segmentation
2. **Correcting** existing low-quality bounding boxes with SAM3's superior masks
3. **Enriching** training data with instance-level segmentation for 15 defect classes
4. **Target**: 27.1% → **45-55% mAP@50** with SAM3-enhanced dataset

---

## Current Situation

### YOLO v2.0 Performance
- **mAP@50**: 27.1% (mediocre)
- **Training data**: 3,061 images
- **Problem**: Dataset 6 filtered out 91% (4,193 images) as "non-defects"
- **Root cause**: Many images had defects but WRONG class labels (e.g., "Normal wall" with cracks)

### SAM3 Integration (Already Implemented!)
✅ **SAM3Service** - Text-prompted segmentation ("cracks", "water damage", "mold")
✅ **SAM3TrainingDataService** - Pseudo-label generation + YOLO export
✅ **Python microservice** - FastAPI + SAM3 model on port 8001
✅ **30ms inference** - Fast enough for batch processing

---

## Solution: SAM3-Enhanced YOLO Training Pipeline

### Strategy Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1: SAM3 Auto-Labeling (4,193 filtered images)           │
│  ─────────────────────────────────────────────────────────────  │
│  1. Run SAM3 on all 4,193 "filtered" Dataset 6 images          │
│  2. Text prompts: "crack", "water damage", "mold", "rot", etc. │
│  3. Convert SAM3 masks → YOLO bounding boxes                    │
│  4. Filter by confidence > 0.6                                  │
│  5. Result: ~2,000-3,000 additional labeled images              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 2: Label Refinement (existing 3,061 images)             │
│  ─────────────────────────────────────────────────────────────  │
│  1. Run SAM3 on existing training images                        │
│  2. Compare SAM3 masks vs existing YOLO boxes                   │
│  3. Replace low-quality boxes (IoU < 0.5) with SAM3 boxes       │
│  4. Result: Higher quality bounding boxes                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 3: Dataset v4.0 Training                                 │
│  ─────────────────────────────────────────────────────────────  │
│  - Original: 3,061 images (refined)                             │
│  - SAM3 auto-labeled: 2,000-3,000 images (new)                  │
│  - Total: 5,061-6,061 images (+66-98% increase!)                │
│  - Expected mAP@50: 45-55% (production-grade)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### Phase 1: SAM3 Auto-Labeling Script

**Input**: 4,193 filtered Dataset 6 images
**Output**: YOLO-format labels with SAM3-derived bounding boxes

**Process**:

1. **Setup SAM3 microservice**
   ```bash
   cd apps/sam3-service
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   python app/main.py  # Starts on localhost:8001
   ```

2. **Text prompts for 15 defect classes**
   ```typescript
   const DEFECT_PROMPTS = {
     0: ['structural crack', 'crack in wall', 'crack in concrete'],
     1: ['water damage', 'water stain', 'water leak', 'damp'],
     2: ['mold', 'mould', 'fungus growth'],
     3: ['rot', 'rotten wood', 'wood decay'],
     4: ['electrical fault', 'exposed wire', 'bare wire'],
     5: ['spalling', 'concrete spalling', 'brick spalling'],
     6: ['broken window', 'cracked glass', 'damaged window'],
     7: ['roof damage', 'roof leak', 'missing tiles'],
     8: ['foundation issue', 'foundation crack', 'sunken foundation'],
     9: ['wall crack', 'wall damage', 'damaged wall'],
     10: ['floor damage', 'broken floor', 'floor crack'],
     11: ['ceiling damage', 'ceiling crack', 'damaged ceiling'],
     12: ['pest damage', 'termite damage', 'insect damage'],
     13: ['HVAC issue', 'radiator rust', 'HVAC damage'],
     14: ['plumbing issue', 'pipe leak', 'burst pipe']
   };
   ```

3. **Auto-labeling logic**
   ```typescript
   async function autoLabelWithSAM3(imageUrl: string): Promise<YOLOLabel[]> {
     const labels: YOLOLabel[] = [];

     // Run SAM3 for each defect type
     for (const [classId, prompts] of Object.entries(DEFECT_PROMPTS)) {
       const result = await SAM3Service.segmentDamageTypes(imageUrl, prompts);

       // Convert SAM3 masks to YOLO boxes
       for (let i = 0; i < result.num_instances; i++) {
         if (result.scores[i] >= 0.6) {  // Min confidence threshold
           const box = result.boxes[i];  // [x, y, w, h]
           labels.push({
             classId: parseInt(classId),
             x_center: (box[0] + box[2] / 2) / imageWidth,
             y_center: (box[1] + box[3] / 2) / imageHeight,
             width: box[2] / imageWidth,
             height: box[3] / imageHeight,
             confidence: result.scores[i]
           });
         }
       }
     }

     return labels;
   }
   ```

4. **Quality filters**
   - Min confidence: 0.6 (60%)
   - Min box area: 0.01 (1% of image)
   - Max box area: 0.9 (90% of image)
   - Non-overlapping suppression (NMS)

### Phase 2: Label Refinement

**Goal**: Fix existing poor-quality bounding boxes using SAM3

**Algorithm**:
```python
for image in existing_training_images:
    yolo_boxes = read_yolo_label(image)
    sam3_boxes = run_sam3_on_image(image)

    for yolo_box in yolo_boxes:
        # Find best matching SAM3 box
        best_sam3_box = find_best_match(yolo_box, sam3_boxes)

        # Calculate IoU (Intersection over Union)
        iou = calculate_iou(yolo_box, best_sam3_box)

        if iou < 0.5:  # Poor overlap = bad label
            # Replace with SAM3 box (more accurate)
            yolo_box = best_sam3_box
            logger.info(f"Refined box for {image}")
```

**Expected refinements**: ~30-40% of existing boxes improved

### Phase 3: Dataset v4.0 Training

**New dataset composition**:
```
yolo_dataset_v4/
├── train/
│   ├── images/
│   │   ├── [3,061 existing images (refined)]
│   │   ├── [2,000-3,000 SAM3 auto-labeled images]
│   │   └── Total: 5,061-6,061 images
│   └── labels/
│       └── [All labels with SAM3 quality]
└── val/
    └── [627 images with refined labels]
```

**Training configuration**:
- **Model**: YOLOv8m (same as v2.0)
- **Epochs**: 300
- **Transfer learning**: Start from v2.0 weights (27.1% mAP)
- **Data augmentation**: Enabled (mosaic, mixup, etc.)
- **Expected result**: 45-55% mAP@50

---

## Benefits of SAM3 Integration

### 1. **Data Recovery** (Most Important!)
- **Problem**: 4,193 images discarded as "non-defects"
- **Reality**: Many had defects but wrong/missing labels
- **Solution**: SAM3 finds defects regardless of original labels
- **Impact**: +66-98% more training data

### 2. **Label Quality**
- **YOLO boxes**: Often too loose or miss small defects
- **SAM3 masks**: Pixel-perfect segmentation
- **Result**: Better bounding box accuracy

### 3. **Instance Completeness**
- **Original labels**: Often miss multiple instances
- **SAM3**: Finds ALL instances of a defect type
- **Example**: Image labeled "1 crack" → SAM3 finds 5 cracks

### 4. **Class Correction**
- **Problem**: Mislabeled classes (e.g., "wall crack" labeled as "structural crack")
- **SAM3**: Text prompts are more specific
- **Result**: Better class precision

### 5. **Cost Savings**
- **Manual labeling**: $0.10-0.50 per image × 4,193 = $419-$2,096
- **SAM3 auto-labeling**: Free (30ms per image = 2 hours total)
- **Human verification**: Only needed for low-confidence detections

---

## Expected Performance Improvements

### Current (v2.0)
- **Dataset**: 3,061 images
- **mAP@50**: 27.1%
- **Precision**: 44.2%
- **Recall**: 25.2%
- **Status**: Mediocre, not production-ready

### Predicted (v4.0 with SAM3)
- **Dataset**: 5,061-6,061 images (+66-98%)
- **mAP@50**: 45-55% (+66-103% improvement!)
- **Precision**: 60-70%
- **Recall**: 50-60%
- **Status**: Production-grade ✅

### Benchmark Comparison
| Model | Dataset Size | mAP@50 | Quality |
|-------|-------------|--------|---------|
| v1.0 (original) | 998 images | 22.9% | Poor |
| v2.0 (merged) | 3,061 images | 27.1% | Mediocre |
| **v4.0 (SAM3-enhanced)** | **5,061-6,061 images** | **45-55%** | **Production ✅** |

---

## Implementation Timeline

### Week 1: SAM3 Setup & Testing
- [ ] Start SAM3 microservice
- [ ] Test SAM3 on 100 sample images from Dataset 6
- [ ] Validate auto-labeling quality (manual review)
- [ ] Tune confidence thresholds

### Week 2: Auto-Labeling Pipeline
- [ ] Process all 4,193 filtered Dataset 6 images
- [ ] Generate YOLO labels from SAM3 masks
- [ ] Apply quality filters (confidence, size, NMS)
- [ ] Export new labels

### Week 3: Label Refinement
- [ ] Run SAM3 on existing 3,061 training images
- [ ] Compare existing vs SAM3 labels
- [ ] Replace poor-quality boxes
- [ ] Validate improvements

### Week 4: Dataset v4.0 Training
- [ ] Merge all data → yolo_dataset_v4
- [ ] Create Colab upload ZIPs
- [ ] Train YOLOv8m for 300 epochs
- [ ] Evaluate on test set
- [ ] Deploy if mAP@50 > 45%

---

## Technical Requirements

### SAM3 Microservice
- **Hardware**: GPU with 8GB VRAM (or CPU with patience)
- **Model size**: 2.4 GB checkpoint
- **Inference speed**: 30ms per image (GPU) / 2-3s (CPU)
- **Memory**: 4GB RAM
- **Disk**: 10GB for model cache + images

### Auto-Labeling Script
- **Language**: TypeScript (Node.js)
- **Dependencies**:
  - `@mintenance/shared` (logger)
  - `SAM3Service` (existing)
  - `SAM3TrainingDataService` (existing)
- **Input**: Dataset 6 filtered images (4,193 × ~150KB = 629 MB)
- **Output**: YOLO label files (.txt)
- **Runtime**: 2-4 hours (GPU) / 24-36 hours (CPU)

### Storage
- **Original images**: 629 MB (Dataset 6 filtered)
- **New labels**: ~2 MB (text files)
- **Dataset v4.0**: ~800 MB total
- **Colab ZIPs**: ~250 MB

---

## Risk Mitigation

### Risk 1: SAM3 False Positives
- **Mitigation**: Min confidence 0.6, human verification of low-confidence labels
- **Impact**: 5-10% noise acceptable for training

### Risk 2: Text Prompt Quality
- **Mitigation**: Use multiple synonyms per defect type, test on samples first
- **Impact**: Prompt engineering iteration

### Risk 3: Compute Resources
- **Mitigation**: Use Google Colab free GPU (12 hours/day limit)
- **Fallback**: Local CPU overnight processing

### Risk 4: Class Imbalance
- **Mitigation**: SAM3 may find too many common defects (cracks), undersample if needed
- **Impact**: Monitor class distribution, apply class weights

---

## Success Metrics

### Primary
- ✅ **mAP@50 > 45%** (production threshold)
- ✅ **Precision > 60%** (reduce false positives)
- ✅ **Recall > 50%** (find most defects)

### Secondary
- Dataset size: 5,000-6,000 images
- Auto-labeling time: < 12 hours
- Label quality: 90% usable (manual review sample)
- Cost savings: $400-$2,000 vs manual labeling

---

## Next Steps

**Immediate Actions**:
1. ✅ Review existing SAM3 implementation (DONE)
2. 📝 Create auto-labeling script
3. 🚀 Start SAM3 microservice
4. 🧪 Test on 100 sample images
5. 📊 Validate results & tune thresholds

**Want me to proceed with implementing the auto-labeling script?**

This will:
- Process Dataset 6's 4,193 filtered images
- Use SAM3 to find defects with text prompts
- Generate YOLO labels automatically
- Create Dataset v4.0 with 5,000-6,000 images
- Target 45-55% mAP@50 (production-ready!)
