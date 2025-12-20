# 🚀 Google Colab Training Setup - Step by Step

## ⏱️ Total Setup Time: 10-15 minutes
## 💰 Total Cost: $0 (FREE!)

---

## Step 1: Prepare Files for Upload (In Progress)

I'm creating ZIP files of your training data. These will be ready shortly:
- ✅ `train_images.zip` - Training images (799 images)
- ✅ `train_labels.zip` - Training labels
- ✅ `val_images.zip` - Validation images (199 images)
- ✅ `val_labels.zip` - Validation labels
- ✅ `last.pt` - Your checkpoint from epoch 56 (149 MB)

**Location**: `yolo_dataset_full/` folder

---

## Step 2: Upload to Google Drive (5 minutes)

### 2a. Go to Google Drive
1. Open https://drive.google.com/ in your browser
2. Sign in with your Google account

### 2b. Create Folder
1. Click "New" → "New folder"
2. Name it: `yolo-training`
3. Open the folder

### 2c. Upload Files
Drag and drop these files from `yolo_dataset_full/` into your Google Drive `yolo-training` folder:

✅ **Required files:**
- `train_images.zip`
- `train_labels.zip`
- `val_images.zip`
- `val_labels.zip`
- `maintenance_production/v1.02/weights/last.pt` (rename to `last.pt` when uploading)

**Upload progress**: This will take 5-10 minutes depending on your internet speed (~200 MB total)

---

## Step 3: Open Google Colab (2 minutes)

### 3a. Go to Colab
1. Open https://colab.research.google.com/
2. Sign in with the same Google account

### 3b. Upload Notebook
1. Click "File" → "Upload notebook"
2. Choose: `YOLO_Training_Resume_Colab.ipynb` (from your mintenance-clean folder)
3. The notebook will open

### 3c. Enable GPU
⚠️ **IMPORTANT**: You must enable GPU or training will be slow!

1. Click "Runtime" menu
2. Select "Change runtime type"
3. Under "Hardware accelerator", select **"T4 GPU"**
4. Click "Save"

You should see a green checkmark and "T4" in the top-right corner.

---

## Step 4: Run Training (1 click!)

### 4a. Run All Cells
1. Click "Runtime" → "Run all"
2. When prompted, click "Allow" to connect to Google Drive
3. Select your Google account and click "Allow"

### 4b. What Happens Next
The notebook will automatically:
1. ✅ Check GPU is available (should show "Tesla T4")
2. ✅ Install Ultralytics YOLO
3. ✅ Mount your Google Drive
4. ✅ Extract training data from ZIP files
5. ✅ Load checkpoint from epoch 56
6. ✅ Resume training to epoch 300
7. ✅ Save checkpoints every 10 epochs
8. ✅ Save final model to Google Drive

### 4c. Monitor Progress
You'll see live updates in the notebook:
```
Epoch   GPU_mem   box_loss   cls_loss   dfl_loss   Instances   Size
57/300    3.2G      1.234      0.567      1.123        45       640
58/300    3.2G      1.201      0.554      1.098        42       640
...
```

**Progress indicators:**
- **Epoch**: Current epoch (starts at 57, goes to 300)
- **box_loss**: Object localization loss (should decrease)
- **cls_loss**: Classification loss (should decrease)
- **mAP@50**: Main performance metric (target: >70%)

---

## Step 5: Training Time (8-10 hours)

### What to Expect:
- **Total epochs**: 244 (from 57 to 300)
- **Time per epoch**: ~2-2.5 minutes on T4 GPU
- **Total time**: 8-10 hours
- **Estimated completion**: Tonight or tomorrow morning

### Keep Colab Alive:
⚠️ **Important**: Colab may disconnect if inactive. Options:

**Option A - Keep Browser Tab Open**
- Leave the Colab tab open
- Don't close your laptop or let it sleep

**Option B - Auto-Clicker Extension** (Recommended)
1. Install "Colab Keep Alive" Chrome extension
2. It will auto-click to prevent disconnection

**Option C - Premium Colab** ($10/month)
- Longer sessions
- Faster GPUs
- Priority access

### If Disconnected:
Don't worry! Progress is saved every 10 epochs to Google Drive.

To resume:
1. Open the notebook again
2. Change cell 6 to load the latest checkpoint:
   ```python
   checkpoint_path = '/content/drive/MyDrive/yolo-training/runs/colab_gpu_run/weights/last.pt'
   ```
3. Run all cells again

---

## Step 6: Download Results (After Training)

When training completes (8-10 hours), download:

### 6a. Best Model
1. Go to Google Drive: `yolo-training/best_model_final.pt`
2. Right-click → Download
3. This is your final trained model!

### 6b. Training Results
Download the entire `runs/colab_gpu_run/` folder to see:
- `confusion_matrix.png` - How well each class performs
- `results.png` - Training curves
- `val_batch*_pred.jpg` - Sample predictions
- `weights/best.pt` - Best model
- `weights/last.pt` - Final checkpoint

---

## Expected Results

After training completes, you should see:

| Metric | Start (Epoch 56) | Target (Epoch 300) |
|--------|------------------|---------------------|
| mAP@50 | 22.9% | **>70%** ✅ |
| Precision | 69.9% | **>80%** ✅ |
| Recall | 20.9% | **>60%** ✅ |

---

## Cost Comparison

| Method | Time | Cost | Status |
|--------|------|------|--------|
| Google Colab T4 | 8-10h | **$0** | ✅ **Active** |
| AWS g4dn.xlarge | 8-10h | $1.44 | ❌ Quota denied |
| AWS p3.2xlarge | 4-5h | $4.60 | ❌ Quota denied |
| Local CPU | 33-37h | $0 | ⏸️ Paused at epoch 56 |

**Winner: Google Colab - FREE and ready now!** 🎉

---

## Troubleshooting

### "GPU not available"
- Go to Runtime → Change runtime type → Select T4 GPU
- Restart runtime and try again

### "Google Drive mount failed"
- Click the link and authorize access
- Make sure you're signed in to the correct Google account

### "Checkpoint not found"
- Check that you uploaded `last.pt` to `yolo-training/` folder
- Check filename is exactly `last.pt` (not `last.pt.pt`)

### "Out of memory"
- Reduce batch size in cell 7: Change `batch=16` to `batch=8`

### "Training very slow"
- Verify GPU is enabled (should show T4 in top-right)
- Check GPU usage: `!nvidia-smi` in a new cell

### "Session disconnected"
- Resume from latest checkpoint (see "If Disconnected" above)
- Consider using Colab Keep Alive extension

---

## After Training Complete

### Test Your Model Locally
```bash
cd yolo_dataset_full
python -c "
from ultralytics import YOLO
model = YOLO('best_model_final.pt')
results = model.val()
print(f'mAP@50: {results.box.map50:.3f}')
"
```

### Deploy to Production
1. Upload to Supabase storage
2. Update environment variables
3. Test inference API

---

## Quick Checklist

- [ ] Create `yolo-training` folder in Google Drive
- [ ] Upload 5 files (4 ZIPs + last.pt) to Google Drive
- [ ] Open Colab: https://colab.research.google.com/
- [ ] Upload `YOLO_Training_Resume_Colab.ipynb` notebook
- [ ] Enable T4 GPU (Runtime → Change runtime type)
- [ ] Run all cells (Runtime → Run all)
- [ ] Authorize Google Drive access
- [ ] Keep tab open for 8-10 hours
- [ ] Download `best_model_final.pt` when complete

---

## Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Read error messages carefully
3. Try restarting the runtime (Runtime → Restart runtime)
4. Make sure GPU is enabled

**You're all set!** The training will resume from epoch 56 and complete in 8-10 hours on FREE Google Colab GPU! 🚀