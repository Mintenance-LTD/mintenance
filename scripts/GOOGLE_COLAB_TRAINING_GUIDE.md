# 🚀 Google Colab Training - Step-by-Step Guide

Complete guide to train your YOLO model on Google Colab with free GPU.

## 📋 Prerequisites

- Google account (free)
- `yolo_dataset_merged_final` dataset ready
- ~30 minutes setup time
- 2-4 hours training time

---

## Step 1: Prepare Dataset for Upload

### 1.1 Check Dataset Location

Open terminal/command prompt in your project directory:

```bash
cd C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean
```

### 1.2 Verify Dataset Exists

```bash
# Check dataset structure
dir yolo_dataset_merged_final
```

You should see:
- `data.yaml`
- `train/` folder
- `val/` folder
- `test/` folder

### 1.3 Create ZIP File (Optional but Recommended)

**Option A: Using PowerShell (Windows)**

```powershell
# Navigate to project directory
cd C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean

# Create ZIP file
Compress-Archive -Path yolo_dataset_merged_final -DestinationPath yolo_dataset_merged_final.zip -Force

# Check file size (should be ~400-500 MB)
Get-Item yolo_dataset_merged_final.zip | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB,2)}}
```

**Option B: Manual ZIP (If PowerShell doesn't work)**

1. Right-click on `yolo_dataset_merged_final` folder
2. Select "Send to" → "Compressed (zipped) folder"
3. Wait for compression (may take 5-10 minutes)
4. Rename to `yolo_dataset_merged_final.zip`

**Note:** ZIP file will be ~400-500 MB. This is normal.

---

## Step 2: Upload to Google Drive

### 2.1 Open Google Drive

1. Go to: https://drive.google.com
2. Sign in with your Google account

### 2.2 Create Training Folder

1. Click **"New"** → **"Folder"**
2. Name it: `YOLO_Training`
3. Click **"Create"**

### 2.3 Upload Dataset ZIP

1. Open the `YOLO_Training` folder
2. Click **"New"** → **"File upload"**
3. Select `yolo_dataset_merged_final.zip`
4. Wait for upload to complete (5-15 minutes depending on internet speed)

**Tip:** You can see upload progress in the bottom-right corner.

### 2.4 Verify Upload

1. Check that `yolo_dataset_merged_final.zip` appears in `YOLO_Training` folder
2. Right-click → **"Get link"** → Set to **"Anyone with the link"** (for Colab access)
3. Copy the link (you'll need it later)

---

## Step 3: Open Google Colab

### 3.1 Access Colab

1. Go to: https://colab.research.google.com
2. Sign in with the same Google account

### 3.2 Create New Notebook

1. Click **"File"** → **"New notebook"**
2. Name it: `Mintenance_AI_YOLO_Training`

---

## Step 4: Configure Colab for GPU

### 4.1 Enable GPU Runtime

1. Click **"Runtime"** → **"Change runtime type"**
2. Set **"Hardware accelerator"** to **"T4 GPU"** (free)
3. Click **"Save"**

**Note:** Free GPU has usage limits. If unavailable, try again later or use CPU (slower).

### 4.2 Verify GPU

Run this in the first cell:

```python
# Check GPU availability
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
else:
    print("⚠️ No GPU available - training will be slow on CPU")
```

**Expected output:**
```
CUDA available: True
GPU: Tesla T4
GPU Memory: 15.00 GB
```

---

## Step 5: Install Dependencies

### 5.1 Install Ultralytics

Create a new cell and run:

```python
# Install Ultralytics YOLO
!pip install ultralytics --quiet

# Verify installation
from ultralytics import YOLO
print("✅ Ultralytics installed successfully")
print(f"YOLO version: {YOLO.__version__}")
```

### 5.2 Install Additional Packages

```python
# Install other dependencies
!pip install pyyaml --quiet
print("✅ All dependencies installed")
```

---

## Step 6: Mount Google Drive

### 6.1 Mount Drive

Create a new cell:

```python
# Mount Google Drive
from google.colab import drive
drive.mount('/content/drive')

print("✅ Google Drive mounted")
print("📁 Access your files at: /content/drive/MyDrive/")
```

**Action Required:**
- A popup will ask for permission
- Click **"Connect to Google Drive"**
- Select your Google account
- Click **"Allow"**
- Copy the authorization code
- Paste it in the cell output
- Press Enter

### 6.2 Verify Drive Access

```python
# Check if dataset is accessible
import os
drive_path = "/content/drive/MyDrive/YOLO_Training"
if os.path.exists(drive_path):
    files = os.listdir(drive_path)
    print(f"✅ Found {len(files)} files in YOLO_Training:")
    for f in files:
        print(f"   - {f}")
else:
    print("❌ YOLO_Training folder not found")
    print("   Make sure you uploaded the dataset to Google Drive")
```

---

## Step 7: Extract Dataset

### 7.1 Extract ZIP File

```python
import zipfile
import os

# Paths
zip_path = "/content/drive/MyDrive/YOLO_Training/yolo_dataset_merged_final.zip"
extract_path = "/content/dataset"

# Create extraction directory
os.makedirs(extract_path, exist_ok=True)

# Extract dataset
print("📦 Extracting dataset...")
print("   This may take 2-5 minutes...")

with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall(extract_path)

print("✅ Dataset extracted successfully!")
```

### 7.2 Verify Dataset Structure

```python
# Check dataset structure
dataset_path = "/content/dataset/yolo_dataset_merged_final"

# Count images
train_images = len([f for f in os.listdir(f"{dataset_path}/train/images") if f.endswith('.jpg')])
val_images = len([f for f in os.listdir(f"{dataset_path}/val/images") if f.endswith('.jpg')])
test_images = len([f for f in os.listdir(f"{dataset_path}/test/images") if f.endswith('.jpg')])

print("📊 Dataset Statistics:")
print(f"   Train images: {train_images}")
print(f"   Val images: {val_images}")
print(f"   Test images: {test_images}")
print(f"   Total: {train_images + val_images + test_images}")

# Check data.yaml
data_yaml = f"{dataset_path}/data.yaml"
if os.path.exists(data_yaml):
    print(f"\n✅ data.yaml found: {data_yaml}")
    with open(data_yaml, 'r') as f:
        print("\n📋 Dataset configuration:")
        print(f.read())
else:
    print(f"\n❌ data.yaml not found!")
```

---

## Step 8: Configure Training

### 8.1 Set Training Parameters

```python
# Training configuration
TRAINING_CONFIG = {
    'data_yaml': '/content/dataset/yolo_dataset_merged_final/data.yaml',
    'model': 'yolov11m.pt',  # Medium model - good balance
    'epochs': 100,
    'imgsz': 640,
    'batch': 16,
    'name': 'mintenance_ai_v3',
    'project': 'runs/train'
}

print("⚙️  Training Configuration:")
for key, value in TRAINING_CONFIG.items():
    print(f"   {key}: {value}")
```

### 8.2 Verify Data Path

```python
# Verify data.yaml exists and is readable
import yaml

data_yaml_path = TRAINING_CONFIG['data_yaml']
if os.path.exists(data_yaml_path):
    with open(data_yaml_path, 'r') as f:
        data_config = yaml.safe_load(f)
    
    print("✅ data.yaml loaded successfully")
    print(f"   Classes: {data_config['nc']}")
    print(f"   Train: {data_config['train']}")
    print(f"   Val: {data_config['val']}")
    print(f"\n   Class names:")
    for i, name in enumerate(data_config['names']):
        print(f"     {i}: {name}")
else:
    print(f"❌ data.yaml not found at: {data_yaml_path}")
```

---

## Step 9: Start Training

### 9.1 Load Model

```python
from ultralytics import YOLO

# Load YOLO model
model_size = TRAINING_CONFIG['model']
print(f"🔄 Loading {model_size}...")

model = YOLO(model_size)
print(f"✅ Model loaded: {model_size}")
print(f"   Model will be downloaded automatically if not cached")
```

### 9.2 Begin Training

```python
# Start training
print("🚀 Starting training...")
print("   This will take 2-4 hours on GPU")
print("   Progress will be saved automatically")
print()

# Train the model
results = model.train(
    data=TRAINING_CONFIG['data_yaml'],
    epochs=TRAINING_CONFIG['epochs'],
    imgsz=TRAINING_CONFIG['imgsz'],
    batch=TRAINING_CONFIG['batch'],
    device=0,  # Use GPU
    project=TRAINING_CONFIG['project'],
    name=TRAINING_CONFIG['name'],
    patience=20,  # Early stopping
    save=True,
    plots=True,
    verbose=True,
    # Data augmentation
    hsv_h=0.015,
    hsv_s=0.7,
    hsv_v=0.4,
    degrees=10,
    translate=0.1,
    scale=0.5,
    # Optimization
    optimizer='AdamW',
    lr0=0.01,
    lrf=0.01,
    momentum=0.937,
    weight_decay=0.0005,
)

print("\n" + "="*70)
print("✅ TRAINING COMPLETE!")
print("="*70)
```

**Important:**
- ⏱️ Training takes 2-4 hours
- 💻 Keep Colab tab open (don't close browser)
- 📊 You'll see progress updates every epoch
- 💾 Model is saved automatically

---

## Step 10: Monitor Training Progress

### 10.1 View Training Metrics

While training, you can check progress:

```python
# View training results (run this in a new cell during training)
import matplotlib.pyplot as plt
from pathlib import Path

results_dir = Path(f"{TRAINING_CONFIG['project']}/{TRAINING_CONFIG['name']}")

# Check if results exist
if results_dir.exists():
    print("📊 Training results available at:")
    print(f"   {results_dir}")
    
    # List result files
    result_files = list(results_dir.rglob("*"))
    print(f"\n   Found {len(result_files)} result files")
    
    # Show key files
    key_files = ['results.png', 'confusion_matrix.png', 'F1_curve.png']
    for key_file in key_files:
        file_path = results_dir / key_file
        if file_path.exists():
            print(f"   ✅ {key_file}")
else:
    print("⏳ Training in progress... results will appear here")
```

### 10.2 Check Training Logs

```python
# View training log
log_file = Path(f"{TRAINING_CONFIG['project']}/{TRAINING_CONFIG['name']}/results.csv")
if log_file.exists():
    import pandas as pd
    df = pd.read_csv(log_file)
    print("📈 Latest training metrics:")
    print(df.tail(5))
else:
    print("⏳ Training log will appear here")
```

---

## Step 11: Evaluate Trained Model

### 11.1 Check Best Model

```python
# Check if training completed
best_model_path = f"{TRAINING_CONFIG['project']}/{TRAINING_CONFIG['name']}/weights/best.pt"

if os.path.exists(best_model_path):
    import os
    size_mb = os.path.getsize(best_model_path) / (1024 * 1024)
    print("✅ Best model saved!")
    print(f"   Path: {best_model_path}")
    print(f"   Size: {size_mb:.2f} MB")
else:
    print("⏳ Training still in progress...")
```

### 11.2 Validate Model

```python
# Validate model on validation set
if os.path.exists(best_model_path):
    from ultralytics import YOLO
    
    # Load trained model
    trained_model = YOLO(best_model_path)
    
    # Run validation
    print("🔍 Validating model on validation set...")
    metrics = trained_model.val(
        data=TRAINING_CONFIG['data_yaml'],
        split='val'
    )
    
    print("\n📊 Validation Results:")
    print(f"   mAP50: {metrics.box.map50:.2%}")
    print(f"   mAP50-95: {metrics.box.map:.2%}")
    print(f"   Precision: {metrics.box.mp:.2%}")
    print(f"   Recall: {metrics.box.mr:.2%}")
```

---

## Step 12: Download Trained Model

### 12.1 Download to Local Machine

**Option A: Direct Download from Colab**

```python
# Create download link
from google.colab import files
import shutil

best_model_path = f"{TRAINING_CONFIG['project']}/{TRAINING_CONFIG['name']}/weights/best.pt"

if os.path.exists(best_model_path):
    # Copy to a convenient location
    download_path = "/content/mintenance_ai_v3_model.pt"
    shutil.copy(best_model_path, download_path)
    
    # Download
    files.download(download_path)
    print("✅ Model download started!")
else:
    print("❌ Model not found. Training may still be in progress.")
```

**Option B: Save to Google Drive (Recommended)**

```python
# Save to Google Drive for backup
import shutil

best_model_path = f"{TRAINING_CONFIG['project']}/{TRAINING_CONFIG['name']}/weights/best.pt"
drive_backup_path = "/content/drive/MyDrive/YOLO_Training/mintenance_ai_v3_model.pt"

if os.path.exists(best_model_path):
    shutil.copy(best_model_path, drive_backup_path)
    print(f"✅ Model saved to Google Drive:")
    print(f"   {drive_backup_path}")
    print("\n   You can download it from Google Drive later")
else:
    print("❌ Model not found")
```

### 12.2 Download Training Results

```python
# Download training results (plots, metrics)
import shutil
import zipfile

results_dir = Path(f"{TRAINING_CONFIG['project']}/{TRAINING_CONFIG['name']}")
zip_path = "/content/training_results.zip"

if results_dir.exists():
    # Create ZIP of results
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for file in results_dir.rglob('*'):
            if file.is_file():
                zipf.write(file, file.relative_to(results_dir.parent))
    
    # Download
    files.download(zip_path)
    print("✅ Training results downloaded!")
```

---

## Step 13: Deploy to Mintenance AI

### 13.1 Download Model to Local Machine

1. Go to Google Drive: https://drive.google.com
2. Navigate to `YOLO_Training` folder
3. Download `mintenance_ai_v3_model.pt`

### 13.2 Replace Current Model

```bash
# On your local machine
cd C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean

# Backup current model
copy best_model_final_v2.pt best_model_final_v2_backup.pt

# Copy new model
copy [downloaded_model_path]\mintenance_ai_v3_model.pt best_model_final_v3.pt
```

### 13.3 Test New Model

```bash
# Validate new model
python scripts/validate-yolo-predictions.py \
    yolo_dataset_merged_final/val/images/ \
    --model best_model_final_v3.pt \
    --labels-dir yolo_dataset_merged_final/val/labels/

# Compare with old model
python scripts/validate-yolo-predictions.py \
    yolo_dataset_merged_final/val/images/ \
    --model best_model_final_v2.pt \
    --labels-dir yolo_dataset_merged_final/val/labels/
```

### 13.4 Update Environment

Edit `.env.local`:

```bash
# Update model path
YOLO_MODEL_PATH=./best_model_final_v3.pt
```

### 13.5 Restart Application

```bash
# Restart Next.js dev server
npm run dev
```

---

## 📊 Complete Colab Notebook

Here's the complete notebook code (copy-paste ready):

```python
# ============================================================================
# MINTENANCE AI - YOLO MODEL TRAINING ON GOOGLE COLAB
# ============================================================================

# Step 1: Install dependencies
!pip install ultralytics pyyaml --quiet

# Step 2: Mount Google Drive
from google.colab import drive
drive.mount('/content/drive')

# Step 3: Extract dataset
import zipfile
import os

zip_path = "/content/drive/MyDrive/YOLO_Training/yolo_dataset_merged_final.zip"
extract_path = "/content/dataset"

os.makedirs(extract_path, exist_ok=True)

print("📦 Extracting dataset...")
with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall(extract_path)
print("✅ Dataset extracted!")

# Step 4: Verify dataset
dataset_path = "/content/dataset/yolo_dataset_merged_final"
train_count = len([f for f in os.listdir(f"{dataset_path}/train/images") if f.endswith('.jpg')])
val_count = len([f for f in os.listdir(f"{dataset_path}/val/images") if f.endswith('.jpg')])

print(f"\n📊 Dataset: {train_count} train, {val_count} val images")

# Step 5: Train model
from ultralytics import YOLO

model = YOLO('yolov11m.pt')

results = model.train(
    data=f"{dataset_path}/data.yaml",
    epochs=100,
    imgsz=640,
    batch=16,
    device=0,
    project='runs/train',
    name='mintenance_ai_v3',
    patience=20,
    save=True,
    plots=True
)

# Step 6: Validate
best_model = f"runs/train/mintenance_ai_v3/weights/best.pt"
trained_model = YOLO(best_model)
metrics = trained_model.val(data=f"{dataset_path}/data.yaml")

print(f"\n✅ Training complete!")
print(f"   mAP50: {metrics.box.map50:.2%}")
print(f"   Model: {best_model}")

# Step 7: Save to Drive
import shutil
shutil.copy(best_model, "/content/drive/MyDrive/YOLO_Training/mintenance_ai_v3_model.pt")
print("✅ Model saved to Google Drive!")
```

---

## 🆘 Troubleshooting

### Issue: "GPU not available"
**Solution:** 
- Wait a few minutes and try again
- Free GPU has usage limits
- Can train on CPU (slower, 10-15 hours)

### Issue: "Dataset not found"
**Solution:**
- Check Google Drive path is correct
- Verify ZIP file uploaded completely
- Check file permissions (should be accessible)

### Issue: "Out of memory"
**Solution:**
- Reduce batch size: `batch=8` instead of `batch=16`
- Use smaller model: `yolov11n.pt` instead of `yolov11m.pt`

### Issue: "Training interrupted"
**Solution:**
- Colab disconnects after ~90 minutes of inactivity
- Keep browser tab active
- Training progress is saved - can resume

### Issue: "Can't download model"
**Solution:**
- Use Google Drive backup method
- Download from Drive instead of Colab
- File size limit: ~2GB for direct download

---

## ✅ Success Checklist

- [ ] Dataset uploaded to Google Drive
- [ ] Colab notebook created
- [ ] GPU enabled
- [ ] Dependencies installed
- [ ] Dataset extracted
- [ ] Training started
- [ ] Training completed (2-4 hours)
- [ ] Model validated
- [ ] Model downloaded
- [ ] Model tested locally
- [ ] Model deployed to Mintenance AI

---

## 📚 Next Steps After Training

1. **Evaluate Performance**
   - Compare new vs old model metrics
   - Test on validation set
   - Visual inspection of predictions

2. **Deploy if Better**
   - Backup current model
   - Update environment variables
   - Enable AB testing
   - Monitor production metrics

3. **Continuous Learning**
   - Collect user corrections
   - Plan next training cycle
   - Integrate with auto-retraining system

---

## 💡 Pro Tips

1. **Save Notebook Regularly**
   - File → Save (Ctrl+S)
   - Colab auto-saves to Drive

2. **Monitor Training**
   - Check every 30 minutes
   - Watch for errors
   - Review loss curves

3. **Backup Everything**
   - Save model to Google Drive
   - Download training results
   - Keep notebook for reference

4. **Use GPU Efficiently**
   - Train during off-peak hours
   - Complete training in one session
   - Free GPU resets daily

---

**Ready to start?** Follow steps 1-13 above! 🚀
