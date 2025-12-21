# SAM3 Auto-Labeling Guide

Complete guide to recover 4,193 filtered Dataset 6 images using SAM3 auto-labeling.

---

## Quick Start

### 1. Setup SAM3 Microservice

**Option A: Windows Batch Script** (Recommended)
```bash
cd scripts
setup-sam3-service.bat
```

**Option B: Manual Setup**
```bash
cd apps/sam3-service

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126
pip install fastapi uvicorn pillow transformers huggingface_hub
pip install -e git+https://github.com/facebookresearch/sam3.git#egg=sam3

# Start service
python app/main.py
```

The service will start on **http://localhost:8001**

### 2. Verify SAM3 Health

Open a new terminal and test:
```bash
curl http://localhost:8001/health
```

Expected response:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "service": "sam3-segmentation"
}
```

### 3. Run Auto-Labeling

**Test Mode** (100 images, ~5 minutes):
```bash
npm run sam3:auto-label:test
```

**Full Mode** (4,193 images, ~2-4 hours):
```bash
npm run sam3:auto-label:full
```

**Custom Range**:
```bash
npm run sam3:auto-label -- --start 0 --end 1000
```

---

## How It Works

### Auto-Labeling Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  1. SAM3 Microservice (Python FastAPI)                         │
│     - Loads SAM3 model from Hugging Face                       │
│     - Text-prompted segmentation API on port 8001              │
│     - 30ms inference per image (GPU)                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. Auto-Labeling Script (TypeScript)                          │
│     - Reads filtered Dataset 6 images (4,193 total)            │
│     - Sends to SAM3 with text prompts for 15 defect classes    │
│     - Receives segmentation masks + bounding boxes             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. Label Conversion & Filtering                               │
│     - Convert SAM3 masks → YOLO bounding boxes                 │
│     - Filter by confidence (>60%), size (1-90% of image)       │
│     - Apply Non-Maximum Suppression (remove overlaps)          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. Output Dataset                                              │
│     - Save images + YOLO labels to yolo_dataset_sam3_labeled/  │
│     - Ready to merge with v3.0 dataset                         │
│     - Expected: 2,000-3,000 labeled images                      │
└─────────────────────────────────────────────────────────────────┘
```

### Text Prompts for 15 Defect Classes

The script uses multiple synonyms per class to maximize detection:

| Class | Prompts |
|-------|---------|
| **0: structural_crack** | "structural crack", "crack in wall", "crack in concrete", "crack", "wall crack" |
| **1: water_damage** | "water damage", "water stain", "water leak", "damp", "dampness", "moisture damage" |
| **2: mold** | "mold", "mould", "fungus", "mildew", "black mold" |
| **3: rot** | "rot", "rotten wood", "wood decay", "timber rot", "decay" |
| **4: electrical_fault** | "electrical fault", "exposed wire", "bare wire", "dangerous electrical socket" |
| **5: spalling** | "spalling", "concrete spalling", "brick spalling", "surface damage" |
| **6: window_broken** | "broken window", "cracked glass", "damaged window", "shattered glass" |
| **7: roof_damage** | "roof damage", "roof leak", "missing tiles", "damaged roof" |
| **8: foundation_issue** | "foundation issue", "foundation crack", "sunken foundation", "loose coping" |
| **9: wall_crack** | "wall crack", "wall damage", "damaged wall", "hole in wall" |
| **10: floor_damage** | "floor damage", "broken floor", "floor crack", "damaged floor", "broken timber floor" |
| **11: ceiling_damage** | "ceiling damage", "ceiling crack", "damaged ceiling", "damaged plaster board" |
| **12: pest_damage** | "pest damage", "termite damage", "insect damage", "wood damage" |
| **13: hvac_issue** | "HVAC issue", "radiator rust", "HVAC damage", "rust on radiator" |
| **14: plumbing_issue** | "plumbing issue", "pipe leak", "burst pipe", "leaking radiator", "loose pipes" |

---

## Configuration

### Quality Filters

**Confidence Threshold**: 0.6 (60%)
- Only detections with >60% confidence are kept
- Higher threshold = fewer labels but higher quality
- Adjustable in script: `MIN_CONFIDENCE`

**Bounding Box Size**:
- Min area: 1% of image (filters tiny detections)
- Max area: 90% of image (filters full-image detections)
- Adjustable: `MIN_BOX_AREA`, `MAX_BOX_AREA`

**Non-Maximum Suppression (NMS)**:
- IoU threshold: 0.5 (50% overlap)
- Removes duplicate/overlapping detections
- Keeps highest confidence box

### Performance Settings

**Image Resolution**: 640×640 (YOLO standard)
**Timeout per image**: 30 seconds
**Concurrent requests**: 1 (sequential processing)

**Expected Processing Time**:
- GPU (Tesla T4): 30ms/image = 2 hours for 4,193 images
- CPU: 2-3s/image = 3-4 hours for 4,193 images

---

## Output

### Directory Structure

```
yolo_dataset_sam3_labeled/
├── train/
│   ├── images/
│   │   ├── sam3_image001.jpg
│   │   ├── sam3_image002.jpg
│   │   └── ...
│   └── labels/
│       ├── sam3_image001.txt
│       ├── sam3_image002.txt
│       └── ...
├── val/
│   ├── images/
│   └── labels/
├── data.yaml
└── sam3_progress.json (progress tracking)
```

### YOLO Label Format

Each label file contains one line per detection:
```
<class_id> <x_center> <y_center> <width> <height>
```

Example (`sam3_image001.txt`):
```
0 0.523456 0.345678 0.123456 0.234567
1 0.234567 0.567890 0.098765 0.123456
2 0.789012 0.123456 0.045678 0.067890
```

### Progress Tracking

The script saves progress to `sam3_progress.json` every 50 images:
```json
{
  "totalImages": 4193,
  "processed": 1234,
  "successful": 987,
  "failed": 12,
  "noDefects": 235,
  "totalLabelsGenerated": 3456,
  "labelsPerClass": {
    "0": 1234,
    "1": 876,
    ...
  }
}
```

**Resume after interruption**:
```bash
npm run sam3:auto-label:full
# Automatically resumes from last checkpoint
```

---

## Statistics & Reporting

### Real-Time Progress

Every 50 images, the script prints:
```
======================================================================
Progress: 1234/4193 (29.4%)
Success: 987 | Failed: 12 | No defects: 235
Labels generated: 3456
Rate: 0.85 images/sec
ETA: 14:23:45
======================================================================
```

### Final Report

After completion:
```
======================================================================
SAM3 AUTO-LABELING COMPLETE
======================================================================
Total images: 4193
Processed: 4193
Successful: 2456 (58.6%)
Failed: 45
No defects found: 1692
Total labels: 12345
Duration: 125.3 minutes
Rate: 33.45 images/min

Labels per class:
  0: structural_crack: 3456
  1: water_damage: 2345
  2: mold: 1234
  3: rot: 876
  ...

Errors (5):
  image123.jpg: Timeout after 30s
  image456.jpg: SAM3 service unavailable
  ...
======================================================================
```

---

## Merging with v3.0 Dataset

After auto-labeling completes, merge with existing dataset:

```bash
npm run merge-datasets
```

This will create **Dataset v4.0**:
```
yolo_dataset_v4/
├── train/
│   ├── images/ (2,434 from v3 + 2,000-3,000 from SAM3 = 4,434-5,434 total)
│   └── labels/
├── val/
│   ├── images/ (627 from v3 + new SAM3 labels)
│   └── labels/
└── data.yaml
```

---

## Troubleshooting

### SAM3 Service Not Starting

**Error**: `ModuleNotFoundError: No module named 'sam3'`

**Solution**:
```bash
cd apps/sam3-service
venv\Scripts\activate
pip install -e git+https://github.com/facebookresearch/sam3.git#egg=sam3
```

### Service Health Check Fails

**Error**: `Failed to connect to SAM3 service`

**Check**:
1. Is the service running? `curl http://localhost:8001/health`
2. Check Python logs for errors
3. Verify model downloaded: `apps/sam3-service/model_cache/`

### Out of Memory

**Error**: `CUDA out of memory`

**Solutions**:
- Reduce batch size (script processes 1 image at a time)
- Use CPU mode (slower but no memory limit)
- Close other GPU applications

### Slow Processing (CPU Mode)

**Issue**: Processing taking >10 hours

**Options**:
1. **Use GPU**: Install CUDA toolkit
2. **Process in batches**:
   ```bash
   npm run sam3:auto-label -- --start 0 --end 1000
   npm run sam3:auto-label -- --start 1000 --end 2000
   npm run sam3:auto-label -- --start 2000 --end 3000
   npm run sam3:auto-label -- --start 3000 --end 4193
   ```
3. **Use Google Colab** with GPU (free)

### No Defects Found for Most Images

**Issue**: `noDefects: 3500+` (too high)

**Possible causes**:
- Confidence threshold too high → Lower `MIN_CONFIDENCE` to 0.5
- Text prompts not matching → Review/improve prompts
- Images actually have no defects → Expected behavior

**Validation**:
- Manually review 10-20 "no defects" images
- Check if they have visible defects
- Adjust prompts if needed

---

## Quality Validation

### Manual Review (Recommended)

After auto-labeling, review a random sample:

1. **Select 50 random images**:
   ```bash
   ls yolo_dataset_sam3_labeled/train/images | shuf -n 50
   ```

2. **Visualize labels**: Use YOLO visualization tool or custom script

3. **Check quality**:
   - Are bounding boxes accurate?
   - Are classes correct?
   - Any false positives?
   - Any missed defects?

4. **Calculate accuracy**:
   - Target: >90% usable labels
   - If <90%, adjust confidence threshold and rerun

### Automated Validation

The script includes built-in quality checks:
- ✅ Confidence filtering (>60%)
- ✅ Size filtering (1-90% of image)
- ✅ NMS (remove overlaps)
- ✅ Coordinate validation (within [0,1])

---

## Expected Results

### Dataset Growth

| Version | Images | mAP@50 | Status |
|---------|--------|--------|--------|
| v2.0 (current) | 3,061 | 27.1% | Mediocre |
| v3.0 (Dataset 6 filtered) | 3,061 | 27.1% | No change |
| **v4.0 (SAM3 auto-labeled)** | **5,061-6,061** | **45-55%** | **Production ✅** |

### Recovery Rate

From 4,193 filtered images, expect:
- **Successful**: 2,000-3,000 images (48-72%)
- **No defects**: 1,200-2,000 images (28-48%)
- **Failed**: <100 images (<2%)

### Label Distribution

Expected labels per class (total ~10,000-15,000):
- **Structural crack** (0): ~30% (most common)
- **Water damage** (1): ~25%
- **Wall crack** (9): ~15%
- **Mold** (2): ~10%
- **Floor damage** (10): ~8%
- **Others**: ~12%

---

## Next Steps After Auto-Labeling

1. ✅ **Validate quality** (manual review of 50-100 samples)
2. ✅ **Merge with v3.0** to create v4.0 dataset
3. ✅ **Create Colab ZIPs** for training
4. ✅ **Train YOLOv8m** for 300 epochs
5. ✅ **Evaluate** on test set (target: mAP@50 > 45%)
6. ✅ **Deploy** if performance meets threshold

---

## Cost Analysis

### SAM3 Auto-Labeling
- **Cost**: $0 (free, open-source)
- **Time**: 2-4 hours (GPU) or 10-12 hours (CPU)
- **Hardware**: Local GPU or Google Colab (free)

### Manual Labeling Alternative
- **Cost**: $419-$2,096 (4,193 images × $0.10-0.50)
- **Time**: 40-80 hours (manual work)
- **Quality**: Higher precision, but slower

### Cost Savings
- **Saved**: $419-$2,096
- **Time saved**: 36-76 hours
- **Quality trade-off**: 90-95% vs 99% (acceptable for training)

---

## Support & Issues

**Script location**: `scripts/sam3-auto-label.ts`

**Logs**: Progress saved to `sam3_progress.json`

**Issues**: Check errors array in progress file

**Need help?**: Review SAM3 service logs in `apps/sam3-service/`

---

## Summary

**Goal**: Recover 4,193 filtered Dataset 6 images using SAM3 auto-labeling

**Process**:
1. Start SAM3 microservice (5 minutes)
2. Run auto-labeling script (2-4 hours)
3. Validate quality (30 minutes)
4. Merge with v3.0 → v4.0 (5 minutes)
5. Train YOLO v4.0 (12-16 hours on Colab)

**Expected outcome**:
- Dataset: 3,061 → 5,061-6,061 images (+66-98%)
- mAP@50: 27.1% → 45-55% (+66-103%)
- Status: Production-ready ✅

**Ready to start? Run**:
```bash
# Terminal 1: Start SAM3 service
cd scripts
setup-sam3-service.bat

# Terminal 2: Run auto-labeling (test first!)
npm run sam3:auto-label:test
```
