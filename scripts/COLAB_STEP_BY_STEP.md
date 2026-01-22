# 📋 Google Colab Training - Step-by-Step Visual Guide

## 🎯 Overview

**Goal:** Train improved YOLO model on Google Colab (free GPU)  
**Time:** ~30 min setup + 2-4 hours training  
**Result:** Better model for Mintenance AI

---

## 📦 STEP 1: Create ZIP File (5 minutes)

### Windows PowerShell:

```powershell
# Open PowerShell in your project folder
cd C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean

# Create ZIP
Compress-Archive -Path yolo_dataset_merged_final -DestinationPath yolo_dataset_merged_final.zip -Force

# Verify (should show ~400-500 MB)
Get-Item yolo_dataset_merged_final.zip | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB,2)}}
```

**✅ Success:** You should see `yolo_dataset_merged_final.zip` (~400-500 MB)

---

## ☁️ STEP 2: Upload to Google Drive (5-15 minutes)

### 2.1 Open Google Drive
1. Go to: **https://drive.google.com**
2. Sign in with your Google account

### 2.2 Create Folder
1. Click **"New"** button (top left)
2. Select **"Folder"**
3. Name it: `YOLO_Training`
4. Click **"Create"**

### 2.3 Upload ZIP File
1. **Open** the `YOLO_Training` folder
2. Click **"New"** → **"File upload"**
3. **Select** `yolo_dataset_merged_final.zip` from your Downloads
4. **Wait** for upload (watch progress in bottom-right corner)

**✅ Success:** You should see `yolo_dataset_merged_final.zip` in `YOLO_Training` folder

---

## 🚀 STEP 3: Open Google Colab (1 minute)

### 3.1 Access Colab
1. Go to: **https://colab.research.google.com**
2. Sign in with same Google account

### 3.2 Upload Notebook
**Option A (Recommended):**
1. Click **"File"** → **"Upload notebook"**
2. Select: `scripts/COLAB_TRAINING_NOTEBOOK.ipynb`
3. Click **"Upload"**

**Option B (Create New):**
1. Click **"File"** → **"New notebook"**
2. Copy cells from `scripts/GOOGLE_COLAB_TRAINING_GUIDE.md`

**✅ Success:** Notebook opens with cells ready to run

---

## ⚙️ STEP 4: Enable GPU (30 seconds)

### 4.1 Change Runtime
1. In Colab: Click **"Runtime"** (top menu)
2. Select **"Change runtime type"**
3. **Hardware accelerator:** Change from "None" to **"T4 GPU"**
4. Click **"Save"**

### 4.2 Verify GPU
Run the GPU check cell (Cell 4 in notebook):

**Expected Output:**
```
CUDA available: True
GPU: Tesla T4
GPU Memory: 15.00 GB
```

**✅ Success:** GPU is enabled and ready

---

## 📥 STEP 5: Mount Google Drive (1 minute)

### 5.1 Run Mount Cell
Run the "Mount Google Drive" cell (Cell 6):

**Action Required:**
1. A popup appears asking for permission
2. Click **"Connect to Google Drive"**
3. Select your Google account
4. Click **"Allow"**
5. **Copy** the authorization code
6. **Paste** it in the cell output
7. Press **Enter**

**✅ Success:** You see "✅ Google Drive mounted"

---

## 📦 STEP 6: Extract Dataset (2-5 minutes)

### 6.1 Run Extract Cell
Run the "Extract Dataset" cell (Cell 8):

**What Happens:**
- Extracts ZIP file from Google Drive
- Creates `/content/dataset/yolo_dataset_merged_final/`
- Takes 2-5 minutes

**✅ Success:** You see "✅ Dataset extracted!"

### 6.2 Verify Dataset
Run the "Verify Dataset" cell (Cell 10):

**Expected Output:**
```
📊 Dataset Statistics:
   Train: 3119 images
   Val: 1454 images
   Test: 204 images
   Total: 4777 images

✅ data.yaml found
   Classes: 15
```

**✅ Success:** Dataset verified and ready

---

## 🎯 STEP 7: Configure Training (30 seconds)

### 7.1 Run Config Cell
Run the "Configure Training" cell (Cell 12):

**Expected Output:**
```
⚙️ Training Configuration:
   data_yaml: /content/dataset/yolo_dataset_merged_final/data.yaml
   model: yolov11m.pt
   epochs: 100
   imgsz: 640
   batch: 16
   name: mintenance_ai_v3
   project: runs/train
```

**✅ Success:** Configuration displayed

---

## 🚀 STEP 8: Start Training (2-4 hours)

### 8.1 Run Training Cell
Run the "Start Training" cell (Cell 14):

**What Happens:**
- Model downloads (first time only)
- Training begins
- Progress updates every epoch
- **Keep browser tab open!**

### 8.2 Monitor Progress

**You'll See:**
```
Epoch    GPU_mem   box_loss   obj_loss   cls_loss   Instances       Size
  1/100      15.0G     0.12345    0.05678    0.01234        1234        640
  2/100      15.0G     0.11234    0.05123    0.01123        1234        640
  ...
```

**Progress Indicators:**
- Loss values decreasing ✅
- Metrics improving ✅
- Plots generated ✅

**⏱️ Time:** 2-4 hours (keep tab open!)

**✅ Success:** Training completes, you see "✅ Training complete!"

---

## ✅ STEP 9: Validate Model (2 minutes)

### 9.1 Run Validation Cell
Run the "Validate Model" cell (Cell 16):

**Expected Output:**
```
🔍 Validating model on validation set...

📊 Validation Results:
   mAP50: 38.5%
   mAP50-95: 25.2%
   Precision: 52.3%
   Recall: 41.2%

🎯 Target vs Actual:
   mAP50 Target: 45-55%
   mAP50 Actual: 38.5%
   ✅ Improvement achieved!
```

**✅ Success:** Metrics displayed (should be better than 27.1%)

---

## 💾 STEP 10: Save to Google Drive (1 minute)

### 10.1 Run Save Cell
Run the "Save to Google Drive" cell (Cell 18):

**Expected Output:**
```
✅ Model saved to Google Drive!
   Size: 52.34 MB
   Path: /content/drive/MyDrive/YOLO_Training/mintenance_ai_v3_model.pt

📥 Next: Download from Google Drive to your local machine
   Location: MyDrive/YOLO_Training/mintenance_ai_v3_model.pt
```

**✅ Success:** Model saved to Google Drive

---

## 📥 STEP 11: Download Model (2 minutes)

### 11.1 From Google Drive
1. Go to: **https://drive.google.com**
2. Navigate to: **MyDrive → YOLO_Training**
3. Find: `mintenance_ai_v3_model.pt`
4. **Right-click** → **"Download"**
5. Wait for download (~50-60 MB)

**✅ Success:** Model downloaded to your Downloads folder

---

## 🧪 STEP 12: Test Locally (5 minutes)

### 12.1 Copy to Project
```powershell
# In PowerShell
cd C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean

# Backup current model
copy best_model_final_v2.pt best_model_final_v2_backup.pt

# Copy new model (adjust path to your Downloads folder)
copy C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance_ai_v3_model.pt best_model_final_v3.pt
```

### 12.2 Validate New Model
```bash
python scripts/validate-yolo-predictions.py \
    yolo_dataset_merged_final/val/images/ \
    --model best_model_final_v3.pt \
    --labels-dir yolo_dataset_merged_final/val/labels/
```

**✅ Success:** Metrics show improvement over old model

---

## 🚀 STEP 13: Deploy to Mintenance AI (5 minutes)

### 13.1 Update Environment
Edit `.env.local`:

```bash
# Change from:
YOLO_MODEL_PATH=./best_model_final_v2.pt

# To:
YOLO_MODEL_PATH=./best_model_final_v3.pt
```

### 13.2 Restart Application
```bash
# Stop current dev server (Ctrl+C)
# Then restart
npm run dev
```

### 13.3 Test in App
1. Upload a test image
2. Check predictions
3. Compare with old model (if AB testing enabled)

**✅ Success:** New model running in production!

---

## 📊 Complete Checklist

### Before Training:
- [ ] ZIP file created (~400-500 MB)
- [ ] Uploaded to Google Drive
- [ ] Colab notebook opened
- [ ] GPU enabled (T4)

### During Training:
- [ ] Dependencies installed
- [ ] Drive mounted
- [ ] Dataset extracted
- [ ] Training started
- [ ] Browser tab kept open
- [ ] Training completed (2-4 hours)

### After Training:
- [ ] Model validated
- [ ] Metrics checked
- [ ] Model saved to Drive
- [ ] Model downloaded locally
- [ ] Model tested
- [ ] Model deployed

---

## 🎯 Expected Timeline

| Step | Time | Action |
|------|------|--------|
| 1. Create ZIP | 5 min | Local |
| 2. Upload to Drive | 5-15 min | Upload |
| 3. Open Colab | 1 min | Setup |
| 4. Enable GPU | 30 sec | Setup |
| 5. Mount Drive | 1 min | Setup |
| 6. Extract Dataset | 2-5 min | Colab |
| 7. Configure | 30 sec | Colab |
| 8. **Training** | **2-4 hours** | **Colab** |
| 9. Validate | 2 min | Colab |
| 10. Save to Drive | 1 min | Colab |
| 11. Download | 2 min | Local |
| 12. Test | 5 min | Local |
| 13. Deploy | 5 min | Local |

**Total:** ~30 min setup + 2-4 hours training

---

## 🆘 Troubleshooting

### Problem: "GPU not available"
**Fix:**
- Wait 5-10 minutes, try again
- Free GPU has usage limits
- Can train on CPU (slower, 10-15 hours)

### Problem: "Dataset not found"
**Fix:**
- Check Google Drive path is correct
- Verify ZIP uploaded completely
- Check file is in `YOLO_Training` folder

### Problem: "Out of memory"
**Fix:**
- Reduce batch size: Change `batch=16` to `batch=8`
- Or use smaller model: `yolov11n.pt` instead of `yolov11m.pt`

### Problem: "Training interrupted"
**Fix:**
- Keep browser tab active
- Training progress is saved
- Can resume from last checkpoint

---

## 📚 Reference Files

- **Quick Start:** `scripts/COLAB_QUICK_START.md`
- **Detailed Guide:** `scripts/GOOGLE_COLAB_TRAINING_GUIDE.md`
- **Notebook:** `scripts/COLAB_TRAINING_NOTEBOOK.ipynb`
- **Training Strategy:** `scripts/TRAINING_STRATEGY_FOR_MINTENANCE_AI.md`

---

## ✅ You're Ready!

Start with **STEP 1** above and follow each step. The notebook has all the code ready - just run the cells! 🚀
