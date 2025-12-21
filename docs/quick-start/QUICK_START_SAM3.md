# SAM3 Auto-Labeling - Quick Start

**Goal**: Recover 4,193 filtered images → Dataset v4.0 (5,061-6,061 images) → mAP@50 45-55%

---

## 1-Minute Start

```bash
# Terminal 1: Start SAM3 service (keep running)
cd scripts && setup-sam3-service.bat

# Terminal 2: Test (5 minutes)
npm run sam3:auto-label:test

# If test looks good, run full (2-4 hours)
npm run sam3:auto-label:full

# Merge datasets
npm run merge-datasets-v4

# Create Colab ZIPs
npm run create-colab-zips-v4
```

---

## Commands Reference

| Command | Purpose | Time |
|---------|---------|------|
| `setup-sam3-service.bat` | Start SAM3 microservice | 5 min |
| `npm run sam3:auto-label:test` | Test on 100 images | 5 min |
| `npm run sam3:auto-label:full` | Process all 4,193 images | 2-4 hrs |
| `npm run merge-datasets-v4` | Create dataset v4.0 | 5 min |
| `npm run create-colab-zips-v4` | Package for Colab | 10 min |

---

## Health Check

```bash
curl http://localhost:8001/health
```

Expected:
```json
{"status": "healthy", "model_loaded": true}
```

---

## Progress Monitoring

Check `sam3_progress.json`:
```json
{
  "processed": 1234,
  "successful": 987,
  "totalLabelsGenerated": 3456
}
```

---

## Expected Results

- **Recovery rate**: 2,000-3,000 images from 4,193 (48-72%)
- **Labels generated**: 10,000-15,000 instances
- **Dataset v4.0**: 5,061-6,061 total images
- **Target mAP@50**: 45-55% (vs current 27.1%)

---

## Troubleshooting

**SAM3 won't start**:
```bash
cd apps/sam3-service
venv\Scripts\activate
pip install -e git+https://github.com/facebookresearch/sam3.git#egg=sam3
```

**Slow processing**: Use GPU (15x faster than CPU)

**Too many "no defects"**: Expected, many images truly have no defects

---

## Full Documentation

- **Complete guide**: [SAM3_AUTO_LABELING_GUIDE.md](./SAM3_AUTO_LABELING_GUIDE.md)
- **Strategic plan**: [SAM3_YOLO_TRAINING_ENHANCEMENT_PLAN.md](./SAM3_YOLO_TRAINING_ENHANCEMENT_PLAN.md)
- **Implementation status**: [SAM3_COMPLETE_IMPLEMENTATION.md](./SAM3_COMPLETE_IMPLEMENTATION.md)

---

**Ready? Start Terminal 1 with `setup-sam3-service.bat` now!**
