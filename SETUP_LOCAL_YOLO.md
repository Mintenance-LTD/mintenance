# Local YOLO Setup - Complete Instructions

**Follow these steps to set up local YOLO inference**

---

## Prerequisites Check

### 1. Python Environment

Verify Python and ultralytics are installed:

```bash
python --version  # Should be Python 3.8+
pip install ultralytics
```

### 2. Node.js Version

**Note:** Project requires Node 20.x, but Node 22.x should work for dependencies.

If you have Node 22.x, you can proceed (dependencies should install fine).

---

## Step 1: Convert Model to ONNX

### Using the Conversion Script

```bash
python scripts/convert-yolo-to-onnx.py
```

**What it does:**
- Loads `runs/detect/building-defect-v2-normalized-cpu/weights/best.pt`
- Converts to ONNX format (640x640 input size)
- Saves to `apps/web/models/yolov11.onnx`

### Manual Conversion (Alternative)

If the script doesn't work, convert manually:

```python
from ultralytics import YOLO

# Load model
model = YOLO('runs/detect/building-defect-v2-normalized-cpu/weights/best.pt')

# Export to ONNX
model.export(
    format='onnx',
    imgsz=640,
    simplify=True,
    opset=12
)

# The exported file will be in the same directory as the .pt file
# Move it to: apps/web/models/yolov11.onnx
```

**Expected output:**
- File: `apps/web/models/yolov11.onnx`
- Size: ~50-200 MB
- Format: ONNX

---

## Step 2: Configure Environment Variables

### Create/Update `.env.local`

Add these variables to your `.env.local` file (in project root):

```bash
# ============================================
# Local YOLO Inference Configuration
# ============================================
USE_LOCAL_YOLO=true
YOLO_MODEL_PATH=./models/yolov11.onnx
YOLO_DATA_YAML_PATH=./Building Defect Detection 7.v2i.yolov11/data.yaml
YOLO_CONFIDENCE_THRESHOLD=0.25
YOLO_IOU_THRESHOLD=0.45

# ============================================
# Roboflow API (Fallback - Optional)
# ============================================
# Uncomment these if you want API fallback
# ROBOFLOW_API_KEY=your_api_key_here
# ROBOFLOW_MODEL_ID=your_model_id
# ROBOFLOW_MODEL_VERSION=2
```

### Windows PowerShell Setup

Run the automated setup script:

```powershell
.\scripts\setup-local-yolo.ps1
```

This will:
- Create `apps/web/models/` directory
- Check/create `.env.local` with template
- Verify Python/ultralytics installation
- Check for model files

---

## Step 3: Install Dependencies

### Install npm packages

```bash
cd apps/web
npm install
```

**Expected packages:**
- `onnxruntime-node@^1.16.0` - ONNX Runtime
- `sharp@^0.33.0` - Image processing

**Note:** If you get Node version warnings, you can proceed (Node 22.x should work).

### Verify Installation

```bash
npm list onnxruntime-node sharp
```

Should show both packages installed.

---

## Step 4: Verify Setup

### Check Files Exist

```bash
# Windows
dir apps\web\models\yolov11.onnx
dir "Building Defect Detection 7.v2i.yolov11\data.yaml"

# Linux/Mac
ls -lh apps/web/models/yolov11.onnx
ls -lh "Building Defect Detection 7.v2i.yolov11/data.yaml"
```

### Check Environment Variables

```bash
# Windows PowerShell
Get-Content .env.local | Select-String "USE_LOCAL_YOLO|YOLO_MODEL_PATH"

# Linux/Mac
grep -E "USE_LOCAL_YOLO|YOLO_MODEL_PATH" .env.local
```

Should show:
```
USE_LOCAL_YOLO=true
YOLO_MODEL_PATH=./models/yolov11.onnx
```

---

## Step 5: Start Server

### Development Mode

```bash
cd apps/web
npm run dev
```

### Watch for Initialization

In the server logs, you should see:

```
✅ Local YOLO model initialized in RoboflowDetectionService
```

Or if there's an issue:

```
⚠️ Failed to initialize local YOLO model, will fallback to API
```

---

## Testing

### Test Inference

The service will automatically use local inference when:
- ✅ `USE_LOCAL_YOLO=true` in `.env.local`
- ✅ Model file exists at `YOLO_MODEL_PATH`
- ✅ Model loads successfully

### Verify It's Working

1. Make a request that uses `RoboflowDetectionService.detect()`
2. Check server logs for "Local YOLO" messages
3. Compare results with API (if configured)

---

## Troubleshooting

### Issue: Model Conversion Fails

**Error:** `ModuleNotFoundError: No module named 'ultralytics'`
```bash
pip install ultralytics
```

**Error:** `FileNotFoundError: best.pt`
- Check path: `runs/detect/building-defect-v2-normalized-cpu/weights/`
- Try using `last.pt` instead:
  ```python
  model = YOLO('runs/detect/building-defect-v2-normalized-cpu/weights/last.pt')
  ```

### Issue: Model Doesn't Load

**Error:** `YOLO_MODEL_PATH is required`
- Check `.env.local` exists and has `USE_LOCAL_YOLO=true`
- Verify `YOLO_MODEL_PATH` is correct (relative to project root)

**Error:** `Failed to initialize local YOLO model`
- Check ONNX file exists and is readable
- Verify file size (should be 50-200 MB)
- Check server logs for detailed error
- Try converting model again

### Issue: Node Version Mismatch

**Warning:** `Not compatible with your version of node/npm`
- Project requires Node 20.x, but Node 22.x should work
- Dependencies should still install
- If issues persist, use Node 20.x via nvm:
  ```bash
  nvm install 20
  nvm use 20
  ```

### Issue: Slow Performance

- **GPU:** Install CUDA for GPU acceleration (recommended)
- **CPU:** Local inference on CPU is slower than API
- **Solution:** Use Roboflow API if CPU-only and performance is critical

---

## File Structure After Setup

```
mintenance-clean/
├── apps/
│   └── web/
│       ├── models/
│       │   └── yolov11.onnx          ✅ ONNX model (50-200 MB)
│       └── lib/
│           └── services/
│               └── building-surveyor/
│                   ├── RoboflowDetectionService.ts
│                   ├── LocalYOLOInferenceService.ts
│                   ├── yolo-preprocessing.ts
│                   ├── yolo-postprocessing.ts
│                   └── yolo-class-names.ts
├── Building Defect Detection 7.v2i.yolov11/
│   └── data.yaml                      ✅ Class names (71 classes)
├── .env.local                         ✅ Environment config
├── scripts/
│   ├── convert-yolo-to-onnx.py        ✅ Conversion script
│   └── setup-local-yolo.ps1          ✅ Setup script
└── runs/
    └── detect/
        └── building-defect-v2-normalized-cpu/
            └── weights/
                ├── best.pt            ✅ Source PyTorch model
                └── last.pt
```

---

## Quick Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `USE_LOCAL_YOLO` | Yes | `false` | Enable local inference |
| `YOLO_MODEL_PATH` | Yes* | - | Path to ONNX model |
| `YOLO_DATA_YAML_PATH` | No | - | Path to data.yaml |
| `YOLO_CONFIDENCE_THRESHOLD` | No | `0.25` | Confidence threshold |
| `YOLO_IOU_THRESHOLD` | No | `0.45` | NMS IoU threshold |

*Required when `USE_LOCAL_YOLO=true`

### Commands

```bash
# Convert model
python scripts/convert-yolo-to-onnx.py

# Setup (Windows)
.\scripts\setup-local-yolo.ps1

# Install dependencies
cd apps/web && npm install

# Start server
npm run dev
```

---

## Next Steps

1. ✅ Convert model to ONNX
2. ✅ Configure `.env.local`
3. ✅ Install dependencies
4. ✅ Start server
5. 🧪 Test inference
6. 📊 Monitor performance
7. 🔧 Adjust thresholds if needed

---

## Support

For detailed information:
- [Quick Start Guide](./docs/LOCAL_YOLO_QUICK_START.md)
- [Full Setup Guide](./docs/LOCAL_YOLO_SETUP.md)
- [Integration Impact](./docs/LOCAL_YOLO_INTEGRATION_IMPACT.md)

