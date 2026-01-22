# 🔧 Colab Training Troubleshooting Guide

## Issue: FileNotFoundError - Model Not Found

### Problem
```
FileNotFoundError: [Errno 2] No such file or directory: 'yolov11m.pt'
```

### Solution 1: Use Correct Model Name (Recommended)

The model name format changed. Try these alternatives:

**Updated Cell 12 (Configuration):**
```python
# Change from:
'model': 'yolov11m.pt',

# To one of these:
'model': 'yolo11m.pt',      # ✅ Recommended (YOLOv11)
'model': 'yolov8m.pt',      # Alternative (YOLOv8)
'model': 'yolov10m.pt',     # Alternative (YOLOv10)
```

### Solution 2: Download Model Explicitly

Add this cell **before** the training cell:

```python
# Download model explicitly
from ultralytics import YOLO
from ultralytics.utils.downloads import download

model_name = 'yolo11m.pt'  # or 'yolov8m.pt'
print(f"📥 Downloading {model_name}...")

try:
    model_path = download(model_name)
    print(f"✅ Model downloaded: {model_path}")
except Exception as e:
    print(f"❌ Download failed: {e}")
    print("💡 Try: 'yolov8m.pt' instead")
```

### Solution 3: Use YOLOv8 (Most Stable)

If YOLOv11 doesn't work, use YOLOv8 which is more stable:

**Update Cell 12:**
```python
TRAINING_CONFIG = {
    'data_yaml': '/content/dataset/yolo_dataset_merged_final/data.yaml',
    'model': 'yolov8m.pt',  # YOLOv8 Medium - most stable
    'epochs': 100,
    'imgsz': 640,
    'batch': 16,
    'name': 'mintenance_ai_v3',
    'project': 'runs/train'
}
```

### Solution 4: Check Internet Connection

The model needs to be downloaded from the internet. Make sure:

1. Colab has internet access (should work by default)
2. No firewall blocking downloads
3. Try running this test cell:

```python
# Test internet connection
import urllib.request
try:
    urllib.request.urlopen('https://github.com', timeout=5)
    print("✅ Internet connection OK")
except:
    print("❌ No internet connection")
```

---

## Issue: Out of Memory (OOM)

### Problem
```
RuntimeError: CUDA out of memory
```

### Solution: Reduce Batch Size

**Update Cell 12:**
```python
TRAINING_CONFIG = {
    # ... other config ...
    'batch': 8,  # Reduce from 16 to 8
    # Or even smaller:
    # 'batch': 4,
}
```

### Alternative: Use Smaller Model

```python
TRAINING_CONFIG = {
    # ... other config ...
    'model': 'yolo11n.pt',  # Nano instead of Medium
    'batch': 16,  # Can use larger batch with smaller model
}
```

---

## Issue: Dataset Not Found

### Problem
```
FileNotFoundError: data.yaml not found
```

### Solution: Verify Dataset Path

**Add this check cell before training:**
```python
import os
dataset_path = "/content/dataset/yolo_dataset_merged_final"
data_yaml = f"{dataset_path}/data.yaml"

print(f"Checking dataset...")
print(f"Dataset path exists: {os.path.exists(dataset_path)}")
print(f"data.yaml exists: {os.path.exists(data_yaml)}")

if os.path.exists(data_yaml):
    print("✅ Dataset ready!")
else:
    print("❌ Dataset not found!")
    print("   Make sure Step 4 (Extract Dataset) completed successfully")
    print(f"   Expected path: {data_yaml}")
```

---

## Issue: Google Drive Mount Failed

### Problem
```
ValueError: mount failed
```

### Solution 1: Re-run the Mount Cell (Most Common Fix)

1. **Stop the cell** if it's still running (click the stop button)
2. **Re-run the mount cell** (click the play button again)
3. **When the authorization link appears:**
   - Click the link that appears
   - Sign in with your Google account
   - Click "Allow" to grant permissions
   - **Copy the authorization code**
   - **Paste it in the cell output** where it says "Enter your authorization code:"
   - Press Enter

**Important:** Complete the authorization within 2-3 minutes, or it will timeout.

### Solution 2: Clear Browser Cache

1. In Colab: **Runtime** → **Disconnect and delete runtime**
2. **Runtime** → **Change runtime type** → Select **"T4 GPU"** → **Save**
3. Re-run the mount cell

### Solution 3: Use Alternative Mount Method

Replace the mount cell code with this:

```python
# Alternative mount method
from google.colab import drive
import time

print("🔄 Mounting Google Drive...")
print("   Click the authorization link when it appears")

try:
    drive.mount('/content/drive', force_remount=True)
    print("✅ Google Drive mounted successfully!")
except Exception as e:
    print(f"❌ Mount failed: {e}")
    print("\n💡 Try:")
    print("   1. Re-run this cell")
    print("   2. Complete authorization quickly (within 2 minutes)")
    print("   3. Check your internet connection")
    raise
```

### Solution 4: Manual Authorization

If automatic mount keeps failing:

1. **Go to:** https://colab.research.google.com/drive
2. **Sign in** with your Google account
3. **Authorize** Colab to access Drive
4. **Then** re-run the mount cell in your notebook

### Solution 5: Check Runtime Connection

Make sure your Colab runtime is connected:

1. Look at the top-right corner
2. Should say **"Connected"** (green)
3. If it says **"Not connected"**, click it to connect
4. Then re-run the mount cell

### Common Causes:

- ⏱️ **Timeout:** Authorization took too long (>3 minutes)
- 🌐 **Network:** Slow or unstable internet connection
- 🔒 **Permissions:** Browser blocked the popup/redirect
- 🔄 **Runtime:** Colab runtime disconnected during mount

### Quick Fix Checklist:

- [ ] Runtime is connected (top-right shows "Connected")
- [ ] Re-run the mount cell
- [ ] Click authorization link immediately
- [ ] Complete authorization within 2 minutes
- [ ] Paste code in the cell output (not in code cell)
- [ ] Press Enter after pasting code

---

## Issue: GPU Not Available

### Problem
```
CUDA available: False
```

### Solution: Enable GPU Runtime

1. **Runtime** → **Change runtime type**
2. **Hardware accelerator:** Select **"T4 GPU"**
3. Click **"Save"**
4. Re-run GPU check cell

**Note:** Free GPU has usage limits. If unavailable:
- Wait 10-15 minutes and try again
- Train on CPU (much slower, 10-15 hours)

---

## Issue: Training Interrupted

### Problem
Training stops unexpectedly

### Solution: Resume Training

YOLO automatically saves checkpoints. Resume with:

```python
# Resume from last checkpoint
from ultralytics import YOLO

# Load the last checkpoint
checkpoint_path = "runs/train/mintenance_ai_v3/weights/last.pt"
model = YOLO(checkpoint_path)

# Resume training
model.train(resume=True)
```

---

## Issue: Slow Training

### Problem
Training is very slow

### Solutions:

1. **Verify GPU is being used:**
```python
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None'}")
```

2. **Reduce batch size** (if GPU memory limited)
3. **Use smaller model** (nano instead of medium)
4. **Reduce image size:**
```python
'imgsz': 416,  # Instead of 640
```

---

## Quick Fixes Summary

### Model Download Issues
```python
# Try these model names in order:
1. 'yolo11m.pt'      # YOLOv11 Medium
2. 'yolov8m.pt'      # YOLOv8 Medium (most stable)
3. 'yolov10m.pt'     # YOLOv10 Medium
```

### Memory Issues
```python
# Reduce batch size:
'batch': 8,  # or 4

# Or use smaller model:
'model': 'yolo11n.pt',  # Nano instead of Medium
```

### Dataset Issues
```python
# Verify path:
dataset_path = "/content/dataset/yolo_dataset_merged_final"
# Should exist after Step 4 (Extract Dataset)
```

---

## Still Having Issues?

1. **Check all previous cells ran successfully**
2. **Verify GPU is enabled** (Runtime → Change runtime type)
3. **Check dataset extracted** (Step 4 output)
4. **Try YOLOv8** instead of YOLOv11 (more stable)
5. **Reduce batch size** if memory issues

---

## Updated Training Cell (Copy-Paste Ready)

If the notebook cell doesn't work, use this:

```python
# Load model with error handling
from ultralytics import YOLO
import os

model_name = TRAINING_CONFIG['model']
print(f"🔄 Loading model: {model_name}")

# Try loading model (will auto-download)
try:
    model = YOLO(model_name)
    print(f"✅ Model loaded: {model_name}")
except Exception as e:
    print(f"❌ Error: {e}")
    print("\n💡 Trying YOLOv8 instead...")
    model = YOLO('yolov8m.pt')  # Fallback to YOLOv8
    print("✅ Using YOLOv8 Medium instead")

# Start training
print("\n🚀 Starting training...")
results = model.train(
    data=TRAINING_CONFIG['data_yaml'],
    epochs=TRAINING_CONFIG['epochs'],
    imgsz=TRAINING_CONFIG['imgsz'],
    batch=TRAINING_CONFIG['batch'],
    device=0,
    project=TRAINING_CONFIG['project'],
    name=TRAINING_CONFIG['name'],
    patience=20,
    save=True,
    plots=True,
    verbose=True,
)

print("\n✅ Training complete!")
```

---

**Most Common Fix:** Change `'yolov11m.pt'` to `'yolo11m.pt'` or `'yolov8m.pt'` ✅
