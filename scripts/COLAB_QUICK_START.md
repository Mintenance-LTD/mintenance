# 🚀 Google Colab Training - Quick Start Guide

## ⚡ 5-Minute Setup Checklist

### ✅ Step 1: Prepare Dataset (5 minutes)

```powershell
# In PowerShell (Windows)
cd C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean

# Create ZIP file
Compress-Archive -Path yolo_dataset_merged_final -DestinationPath yolo_dataset_merged_final.zip -Force

# Check it was created (should be ~400-500 MB)
Get-Item yolo_dataset_merged_final.zip
```

### ✅ Step 2: Upload to Google Drive (5-15 minutes)

1. Go to: https://drive.google.com
2. Click **"New"** → **"Folder"** → Name: `YOLO_Training`
3. Open `YOLO_Training` folder
4. Click **"New"** → **"File upload"**
5. Select `yolo_dataset_merged_final.zip`
6. Wait for upload (watch progress in bottom-right)

### ✅ Step 3: Open Colab (1 minute)

1. Go to: https://colab.research.google.com
2. Click **"File"** → **"Upload notebook"**
3. Upload: `scripts/COLAB_TRAINING_NOTEBOOK.ipynb`
   - OR create new notebook and copy cells from the guide

### ✅ Step 4: Enable GPU (30 seconds)

1. In Colab: **"Runtime"** → **"Change runtime type"**
2. Set **"Hardware accelerator"** to **"T4 GPU"**
3. Click **"Save"**

### ✅ Step 5: Run All Cells (2-4 hours)

1. Click **"Runtime"** → **"Run all"**
   - OR run each cell one by one (Shift+Enter)
2. When prompted, authorize Google Drive access
3. **Keep tab open** during training!

---

## 📝 Detailed Steps

### Step 1: Create ZIP File

**Windows PowerShell:**
```powershell
cd C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean
Compress-Archive -Path yolo_dataset_merged_final -DestinationPath yolo_dataset_merged_final.zip -Force
```

**Or Manual:**
1. Right-click `yolo_dataset_merged_final` folder
2. "Send to" → "Compressed (zipped) folder"
3. Wait 5-10 minutes for compression

### Step 2: Upload to Google Drive

1. **Open Google Drive:** https://drive.google.com
2. **Create folder:**
   - Click "New" → "Folder"
   - Name: `YOLO_Training`
   - Click "Create"
3. **Upload ZIP:**
   - Open `YOLO_Training` folder
   - Click "New" → "File upload"
   - Select `yolo_dataset_merged_final.zip`
   - Wait for upload (5-15 minutes)

### Step 3: Open Colab Notebook

**Option A: Upload Existing Notebook**
1. Go to: https://colab.research.google.com
2. Click "File" → "Upload notebook"
3. Upload `scripts/COLAB_TRAINING_NOTEBOOK.ipynb`

**Option B: Create New Notebook**
1. Go to: https://colab.research.google.com
2. Click "File" → "New notebook"
3. Copy cells from `scripts/GOOGLE_COLAB_TRAINING_GUIDE.md`

### Step 4: Enable GPU

1. In Colab notebook: **"Runtime"** → **"Change runtime type"**
2. **Hardware accelerator:** Select **"T4 GPU"**
3. Click **"Save"**

**Verify GPU:**
- Run the GPU check cell
- Should show: "CUDA available: True" and "GPU: Tesla T4"

### Step 5: Run Training

**Method 1: Run All (Easiest)**
1. Click **"Runtime"** → **"Run all"**
2. Follow prompts (authorize Drive, etc.)
3. Wait 2-4 hours

**Method 2: Run Step-by-Step**
1. Run each cell with **Shift+Enter**
2. Wait for each to complete before next
3. Follow any prompts

**During Training:**
- ⏱️ Takes 2-4 hours
- 💻 Keep browser tab open
- 📊 See progress updates
- 💾 Auto-saves every epoch

### Step 6: Download Model

**After training completes:**

1. **From Google Drive:**
   - Go to: https://drive.google.com
   - Navigate to `YOLO_Training` folder
   - Download `mintenance_ai_v3_model.pt`

2. **Or from Colab:**
   - Run the download cell
   - File will download automatically

### Step 7: Deploy to Mintenance AI

```bash
# On your local machine
cd C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean

# Backup current model
copy best_model_final_v2.pt best_model_final_v2_backup.pt

# Copy new model (from Downloads folder)
copy [path_to_downloaded_model]\mintenance_ai_v3_model.pt best_model_final_v3.pt

# Test new model
python scripts/validate-yolo-predictions.py \
    yolo_dataset_merged_final/val/images/ \
    --model best_model_final_v3.pt \
    --labels-dir yolo_dataset_merged_final/val/labels/

# If better, update .env.local
# YOLO_MODEL_PATH=./best_model_final_v3.pt
```

---

## 🎯 What to Expect

### During Training:
- Progress updates every epoch
- Loss values decreasing
- Metrics improving
- Plots generated automatically

### After Training:
- Model saved to: `runs/train/mintenance_ai_v3/weights/best.pt`
- Validation metrics displayed
- Model copied to Google Drive

### Expected Results:
- **mAP50:** 35-45% (up from 27.1%)
- **Training time:** 2-4 hours on GPU
- **Model size:** ~50-60 MB

---

## 🆘 Common Issues

### "GPU not available"
- **Solution:** Wait a few minutes, try again
- Free GPU has usage limits
- Can train on CPU (slower)

### "Dataset not found"
- **Solution:** Check Google Drive path
- Verify ZIP uploaded completely
- Check file permissions

### "Out of memory"
- **Solution:** Reduce batch size to 8
- Or use smaller model (yolov11n.pt)

### "Training interrupted"
- **Solution:** Keep browser tab active
- Progress is saved - can resume
- Colab disconnects after ~90 min inactivity

---

## ✅ Success Checklist

- [ ] ZIP file created (~400-500 MB)
- [ ] Uploaded to Google Drive
- [ ] Colab notebook opened
- [ ] GPU enabled (T4)
- [ ] Dependencies installed
- [ ] Drive mounted
- [ ] Dataset extracted
- [ ] Training started
- [ ] Training completed (2-4 hours)
- [ ] Model validated
- [ ] Model downloaded
- [ ] Model tested locally
- [ ] Model deployed

---

## 📚 Full Documentation

- `scripts/GOOGLE_COLAB_TRAINING_GUIDE.md` - Complete detailed guide
- `scripts/COLAB_TRAINING_NOTEBOOK.ipynb` - Ready-to-use notebook
- `scripts/TRAINING_STRATEGY_FOR_MINTENANCE_AI.md` - Training strategy

---

**Ready?** Start with Step 1 above! 🚀
