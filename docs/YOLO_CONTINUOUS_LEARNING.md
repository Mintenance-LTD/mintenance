# YOLO Continuous Learning System

**Date:** March 1, 2025  
**Status:** ✅ Implemented

---

## Overview

The YOLO Continuous Learning system enables the model to improve over time by learning from user corrections. It uses your existing labeled dataset (3,729 training images) as a base and continuously adds user corrections to improve accuracy.

---

## How It Works

### 1. Base Model
- **Starting Point:** Trained on 3,729 labeled images
- **71 Classes:** Building defect types
- **Format:** ONNX (for inference)

### 2. User Feedback Collection
When users interact with the app:
- AI detects defects (YOLO)
- Users can correct detections:
  - Add missing boxes
  - Remove false positives
  - Adjust bounding boxes
  - Change class labels

### 3. Correction Storage
- Corrections stored in `yolo_corrections` table
- Converted to YOLO format automatically
- Workflow: `pending` → `approved` → `used_in_training`

### 4. Automatic Retraining
- Triggers when:
  - ≥100 approved corrections collected
  - ≥7 days since last retraining
- Merges base dataset + user corrections
- Fine-tunes model (50 epochs)
- Exports new ONNX model

### 5. Model Deployment
- New model versioned automatically
- A/B testing ready
- Rollback capability

---

## Setup

### Step 1: Run Migrations

```bash
npm run migrate apply
```

This creates:
- `yolo_corrections` table
- `yolo_retraining_jobs` table

### Step 2: Enable Continuous Learning

Add to `.env.local`:

```bash
# Enable continuous learning
YOLO_CONTINUOUS_LEARNING_ENABLED=true

# Retraining configuration (optional)
YOLO_MIN_CORRECTIONS=100
YOLO_RETRAINING_INTERVAL_DAYS=7
```

### Step 3: Configure Retraining Service

```typescript
import { YOLORetrainingService } from '@/lib/services/building-surveyor/YOLORetrainingService';

// Configure thresholds
YOLORetrainingService.configure({
  minCorrections: 100,        // Minimum corrections before retraining
  maxCorrections: 1000,       // Max corrections per training run
  retrainingIntervalDays: 7,  // Days between retraining
  autoApprove: false,         // Auto-approve corrections (testing only)
});
```

---

## API Endpoints

### Submit Correction

**POST** `/api/building-surveyor/corrections`

```json
{
  "assessmentId": "uuid",
  "imageUrl": "https://...",
  "imageIndex": 0,
  "originalDetections": [...],
  "correctedDetections": [
    {
      "class": "crack",
      "bbox": {"x": 100, "y": 200, "width": 50, "height": 30},
      "confidence": 0.85
    }
  ],
  "correctionsMade": {
    "added": [...],
    "removed": [...],
    "adjusted": [...]
  }
}
```

### Approve Correction

**POST** `/api/building-surveyor/corrections/[id]/approve`

```json
{
  "notes": "Expert reviewed - looks good"
}
```

### Get Corrections

**GET** `/api/building-surveyor/corrections?status=approved&limit=100`

### Trigger Retraining

**POST** `/api/building-surveyor/retrain?force=true`

### Get Retraining Status

**GET** `/api/building-surveyor/retrain`

---

## Workflow

### User Correction Flow

```
1. User uploads images
   ↓
2. AI detects defects (YOLO)
   ↓
3. User reviews and corrects
   ↓
4. Correction submitted (status: pending)
   ↓
5. Expert reviews (optional)
   ↓
6. Correction approved (status: approved)
   ↓
7. Ready for training
```

### Retraining Flow

```
1. Scheduled check (every 24 hours)
   ↓
2. Check conditions:
   - ≥100 approved corrections?
   - ≥7 days since last retraining?
   ↓
3. Export corrections to YOLO format
   ↓
4. Merge with base dataset
   ↓
5. Fine-tune model (Python script)
   ↓
6. Export to ONNX
   ↓
7. Mark corrections as used
   ↓
8. Deploy new model
```

---

## Data Format

### YOLO Label Format

Each line in `.txt` file:
```
class_id x_center y_center width height
```

All values normalized 0-1.

Example:
```
0 0.5 0.5 0.1 0.1
1 0.3 0.4 0.2 0.15
```

### Correction JSON Format

```json
{
  "originalDetections": [
    {
      "class": "crack",
      "confidence": 0.85,
      "bbox": {"x": 100, "y": 200, "width": 50, "height": 30}
    }
  ],
  "correctedLabels": "0 0.5 0.5 0.1 0.1\n1 0.3 0.4 0.2 0.15",
  "correctionsMade": {
    "added": [{"class": "mold", "bbox": {...}}],
    "removed": [{"class": "crack", "bbox": {...}}],
    "adjusted": [
      {
        "original": {"class": "crack", "bbox": {...}},
        "corrected": {"class": "crack", "bbox": {...}}
      }
    ]
  }
}
```

---

## Monitoring

### Correction Statistics

```typescript
const stats = await YOLOCorrectionService.getCorrectionStats();
// Returns: { pending, approved, rejected, usedInTraining }
```

### Dataset Statistics

```typescript
const datasetStats = await YOLOTrainingDataService.getDatasetStats();
// Returns: { baseDataset, corrections, merged }
```

### Retraining Status

```typescript
const status = YOLORetrainingService.getStatus();
// Returns: { isRetraining, config }
```

---

## Manual Retraining

### Trigger via API

```bash
curl -X POST http://localhost:3000/api/building-surveyor/retrain?force=true
```

### Trigger via Code

```typescript
import { YOLORetrainingService } from '@/lib/services/building-surveyor/YOLORetrainingService';

// Check and retrain (respects conditions)
const job = await YOLORetrainingService.checkAndRetrain();

// Force retraining (ignores conditions)
const job = await YOLORetrainingService.triggerRetraining();
```

### Run Python Script Directly

```bash
python scripts/retrain-yolo-continuous.py \
  --output-dir training-data/continuous-learning \
  --epochs 50 \
  --batch 16 \
  --device cpu
```

---

## Model Versioning

Each retraining creates a new model version:
- Format: `continuous-learning-v20250301_120000`
- Stored in: `apps/web/models/yolov11-continuous-{version}.onnx`
- Metadata: `apps/web/models/model-metadata-{version}.json`

### Metadata Format

```json
{
  "version": "continuous-learning-v20250301_120000",
  "base_model": "runs/detect/.../best.pt",
  "training_data": "training-data/continuous-learning/data.yaml",
  "epochs": 50,
  "batch_size": 16,
  "learning_rate": 0.001,
  "device": "cpu",
  "trained_at": "2025-03-01T12:00:00Z",
  "metrics": {
    "mAP50": 0.85,
    "mAP50-95": 0.72,
    "precision": 0.88,
    "recall": 0.82
  }
}
```

---

## Configuration

### Environment Variables

```bash
# Enable continuous learning
YOLO_CONTINUOUS_LEARNING_ENABLED=true

# Minimum corrections before retraining
YOLO_MIN_CORRECTIONS=100

# Days between retraining checks
YOLO_RETRAINING_INTERVAL_DAYS=7

# YOLO model paths
YOLO_MODEL_PATH=./models/yolov11.onnx
YOLO_DATA_YAML_PATH=./Building Defect Detection 7.v2i.yolov11/data.yaml
```

### Service Configuration

```typescript
YOLORetrainingService.configure({
  minCorrections: 100,
  maxCorrections: 1000,
  retrainingIntervalDays: 7,
  autoApprove: false,
});
```

---

## Benefits

✅ **Starts Strong:** 3,729 labeled images as base  
✅ **Improves Over Time:** Learns from real user data  
✅ **Adapts to Real World:** Handles edge cases better  
✅ **Scales Automatically:** More users = more data = better model  
✅ **Reduces Manual Work:** Users provide corrections naturally  

---

## Next Steps

1. ✅ Run migrations
2. ✅ Enable continuous learning
3. ✅ Build UI for corrections
4. ✅ Collect user feedback
5. ✅ Monitor retraining jobs
6. ✅ A/B test new models

---

## Troubleshooting

### Retraining Not Triggering

**Check:**
- Enough approved corrections? (`≥100`)
- Enough time passed? (`≥7 days`)
- Already retraining? (check status)

**Solution:**
```bash
# Force retraining
curl -X POST http://localhost:3000/api/building-surveyor/retrain?force=true
```

### Python Script Fails

**Check:**
- Python installed? (`python --version`)
- ultralytics installed? (`pip install ultralytics`)
- Training data exists? (`training-data/continuous-learning/data.yaml`)

**Solution:**
```bash
# Install dependencies
pip install ultralytics pyyaml

# Check data
ls training-data/continuous-learning/
```

### Model Not Loading

**Check:**
- ONNX file exists?
- Path correct in `.env.local`?
- File permissions?

**Solution:**
```bash
# Check model file
ls -lh apps/web/models/yolov11-continuous-*.onnx

# Update .env.local
YOLO_MODEL_PATH=./models/yolov11-continuous-v{version}.onnx
```

---

## See Also

- [Local YOLO Setup](./LOCAL_YOLO_SETUP.md)
- [YOLO Database Storage](./YOLO_DATABASE_SETUP.md)
- [Storage Options](./YOLO_MODEL_STORAGE_OPTIONS.md)

