# Local YOLO Quick Start Guide

**Quick setup guide for local YOLO inference**

---

## Step 1: Convert Model to ONNX

### Option A: Using the provided script (Recommended)

```bash
python scripts/convert-yolo-to-onnx.py
```

This script will:
- Load `runs/detect/building-defect-v2-normalized-cpu/weights/best.pt`
- Convert to ONNX format
- Save to `apps/web/models/yolov11.onnx`

### Option B: Manual conversion

```python
from ultralytics import YOLO

# Load your trained model
model = YOLO('runs/detect/building-defect-v2-normalized-cpu/weights/best.pt')

# Export to ONNX
model.export(format='onnx', imgsz=640)
```

Then move the exported `.onnx` file to `apps/web/models/yolov11.onnx`

---

## Step 2: Configure Environment

### Windows (PowerShell)

Run the setup script:
```powershell
.\scripts\setup-local-yolo.ps1
```

Or manually edit `.env.local`:

```bash
# Local YOLO Inference
USE_LOCAL_YOLO=true
YOLO_MODEL_PATH=./models/yolov11.onnx
YOLO_DATA_YAML_PATH=./Building Defect Detection 7.v2i.yolov11/data.yaml
YOLO_CONFIDENCE_THRESHOLD=0.25
YOLO_IOU_THRESHOLD=0.45

# Roboflow API (fallback - optional)
ROBOFLOW_API_KEY=your_api_key_here
ROBOFLOW_MODEL_ID=your_model_id
ROBOFLOW_MODEL_VERSION=2
```

### Linux/Mac

```bash
# Create models directory
mkdir -p apps/web/models

# Add to .env.local
cat >> .env.local << EOF
USE_LOCAL_YOLO=true
YOLO_MODEL_PATH=./models/yolov11.onnx
YOLO_DATA_YAML_PATH=./Building Defect Detection 7.v2i.yolov11/data.yaml
YOLO_CONFIDENCE_THRESHOLD=0.25
YOLO_IOU_THRESHOLD=0.45
EOF
```

---

## Step 3: Install Dependencies

```bash
cd apps/web
npm install
```

This installs:
- `onnxruntime-node` - ONNX Runtime
- `sharp` - Image processing

---

## Step 4: Restart Server

```bash
npm run dev
```

The model will automatically load on startup. Check logs for:
```
✅ Local YOLO model initialized in RoboflowDetectionService
```

---

## Verification

### Check Model File

```bash
# Windows
dir apps\web\models\yolov11.onnx

# Linux/Mac
ls -lh apps/web/models/yolov11.onnx
```

### Check Environment Variables

```bash
# Windows PowerShell
Get-Content .env.local | Select-String "YOLO"

# Linux/Mac
grep YOLO .env.local
```

### Test Inference

The service will automatically use local inference when:
- `USE_LOCAL_YOLO=true`
- Model file exists at `YOLO_MODEL_PATH`
- Model loads successfully

If local inference fails, it automatically falls back to Roboflow API.

---

## Troubleshooting

### Model conversion fails

**Error:** `ultralytics not installed`
```bash
pip install ultralytics
```

**Error:** `Model file not found`
- Check path: `runs/detect/building-defect-v2-normalized-cpu/weights/best.pt`
- Or use `last.pt` if `best.pt` doesn't exist

### Model doesn't load

**Error:** `YOLO_MODEL_PATH is required`
- Check `.env.local` has `USE_LOCAL_YOLO=true`
- Verify `YOLO_MODEL_PATH` points to correct file

**Error:** `Failed to initialize local YOLO model`
- Check ONNX file is valid
- Verify file permissions
- Check server logs for detailed error

### Slow performance

- **GPU:** Install CUDA for GPU acceleration
- **CPU:** Consider using Roboflow API instead
- **Memory:** Ensure sufficient RAM (2GB+ recommended)

---

## File Structure

After setup, you should have:

```
mintenance-clean/
├── apps/
│   └── web/
│       ├── models/
│       │   └── yolov11.onnx          ← Converted model
│       └── lib/
│           └── services/
│               └── building-surveyor/
│                   └── RoboflowDetectionService.ts
├── Building Defect Detection 7.v2i.yolov11/
│   └── data.yaml                      ← Class names (71 classes)
├── .env.local                         ← Environment config
└── scripts/
    ├── convert-yolo-to-onnx.py        ← Conversion script
    └── setup-local-yolo.ps1          ← Setup script
```

---

## Next Steps

1. ✅ Model converted to ONNX
2. ✅ Environment configured
3. ✅ Dependencies installed
4. ✅ Server restarted
5. 🧪 Test with sample images
6. 📊 Monitor performance
7. 🔄 Optimize thresholds if needed

---

## Support

For detailed information, see:
- [Local YOLO Setup Guide](./LOCAL_YOLO_SETUP.md)
- [Integration Impact Analysis](./LOCAL_YOLO_INTEGRATION_IMPACT.md)
- [Integration Summary](./LOCAL_YOLO_INTEGRATION_SUMMARY.md)

