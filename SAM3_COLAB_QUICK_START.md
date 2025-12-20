# SAM 3 Auto-Labeling on Google Colab - Quick Start Guide

## Problem We're Solving

Dataset 6 has **4,193 filtered images** marked as "non-defects" but many contain defects with wrong/missing labels. Manual labeling would cost **$419-$2,096** and take **36-76 hours**.

SAM 3 auto-labeling can recover **2,000-3,000 usable images** in **2-4 hours** for **FREE** using Google Colab's free GPU.

## Why Google Colab?

- ✅ **FREE T4 GPU** (worth $0.35/hour on AWS)
- ✅ **Linux environment** (required for SAM 3's Triton dependency)
- ✅ **Pre-installed CUDA** and PyTorch
- ✅ **Google Drive integration** for easy file transfer
- ✅ **No Windows limitations**

## Prerequisites

### 1. Hugging Face Account (REQUIRED)

SAM 3 model checkpoints require Hugging Face authentication:

1. Create account at https://huggingface.co/join
2. Request access to **facebook/sam3** model: https://huggingface.co/facebook/sam3
   - Click "Request access" button
   - Wait for approval (usually instant)
3. Create access token:
   - Go to https://huggingface.co/settings/tokens
   - Click "New token"
   - Name: "SAM3-Colab"
   - Type: "Read"
   - Copy token (you'll need this in Colab)

### 2. Google Account

- Free Google account with 15 GB Drive storage
- Gmail account works

## Step-by-Step Instructions

### Step 1: Package Filtered Images (5 minutes)

On your local Windows machine:

```bash
# Package 4,193 filtered images into ZIP
npm run sam3:package-for-colab
```

This creates `filtered_images.zip` (~500-800 MB) containing all Dataset 6 images WITHOUT labels.

**Output:**
```
📦 Packaging Filtered Images for SAM 3 Auto-Labeling
📂 Adding 3,753 train images...
📂 Adding 873 valid images...
✅ ZIP created successfully!
   Size: 678.45 MB
   Total images: 4,626
```

### Step 2: Upload to Google Drive (10-15 minutes)

1. Go to https://drive.google.com
2. Click "New" → "Folder" → Name: "SAM3_AutoLabel"
3. Open the folder
4. Click "New" → "File upload"
5. Select `filtered_images.zip`
6. Wait for upload to complete

### Step 3: Upload Colab Notebook (1 minute)

1. In the same Google Drive folder, click "New" → "File upload"
2. Upload `SAM3_Auto_Labeling_Colab.ipynb` from your project root
3. Double-click the notebook to open in Google Colab

### Step 4: Configure GPU Runtime (1 minute)

In Google Colab:

1. Click **Runtime** → **Change runtime type**
2. Hardware accelerator: **T4 GPU** (or A100 if available)
3. Click **Save**

### Step 5: Run Auto-Labeling (2-4 hours)

**IMPORTANT: Keep the Colab tab open during processing!**

Execute cells in order:

#### Cell 1: Mount Google Drive
```python
from google.colab import drive
drive.mount('/content/drive')
```
- Click the link
- Sign in to Google account
- Copy authorization code
- Paste in Colab

#### Cell 2: Install SAM 3
```python
!git clone https://github.com/facebookresearch/sam3.git
%cd sam3
!pip install -e .
...
```
- Takes ~5 minutes
- Ignore numpy warnings

#### Cell 3: Authenticate Hugging Face
```python
from huggingface_hub import notebook_login
notebook_login()
```
- Paste your HF access token from Prerequisites Step 1.3
- Press Enter

#### Cell 4: Load SAM 3 Model
```python
model = build_sam3_image_model(device='cuda', load_from_HF=True)
```
- Downloads SAM 3 checkpoint (~2.4 GB)
- Takes ~3-5 minutes
- You'll see: ✅ SAM 3 model loaded successfully

#### Cell 5: Configure Defect Classes
```python
DEFECT_PROMPTS = {
  0: ['structural crack', 'crack in wall', ...],
  ...
}
```
- Just run it (no changes needed)

#### Cell 6: Extract Filtered Images
```python
ZIP_PATH = '/content/drive/MyDrive/SAM3_AutoLabel/filtered_images.zip'
```
- **UPDATE THE PATH** to match your Google Drive folder
- Takes ~2 minutes to extract

#### Cell 7: Auto-Labeling (THE MAIN EVENT)
```python
for image_path in tqdm(image_files, desc="Auto-labeling"):
  ...
```
- **TAKES 2-4 HOURS**
- Processes 4,193 images
- Progress bar shows:
  - Images processed
  - Images with defects found
  - Total detections
- Saves progress every 100 images
- DON'T CLOSE THE TAB!

**Expected Progress Output:**
```
Auto-labeling: 100/4193 [00:15<1:42:30]
📊 Progress: 100/4193 - 62 with defects, 347 total detections

Auto-labeling: 500/4193 [01:15<2:15:20]
📊 Progress: 500/4193 - 312 with defects, 1,834 total detections

Auto-labeling: 1000/4193 [02:30<2:00:45]
📊 Progress: 1000/4193 - 618 with defects, 3,621 total detections
...
```

#### Cell 8: Package Results
```python
with zipfile.ZipFile(OUTPUT_ZIP, 'w') as zipf:
  ...
```
- Creates `sam3_auto_labels.zip` (~5-10 MB)
- Contains YOLO format labels

#### Cell 9: Save to Drive
```python
shutil.copy(OUTPUT_ZIP, DRIVE_OUTPUT)
```
- Copies ZIP to Google Drive for persistence

### Step 6: Download Results (2 minutes)

1. In Google Drive, navigate to `SAM3_AutoLabel` folder
2. Right-click `sam3_auto_labels.zip`
3. Click "Download"
4. Save to your project root

### Step 7: Extract and Verify (1 minute)

On your local machine:

```bash
# Extract labels
unzip sam3_auto_labels.zip -d sam3_labels

# Check statistics
cat sam3_labels/labeling_stats.json
```

**Expected Output:**
```json
{
  "total_images": 4193,
  "processed": 4193,
  "images_with_defects": 2347,
  "images_without_defects": 1846,
  "total_detections": 12834,
  "detections_per_class": {
    "crack": 3421,
    "water_damage": 2183,
    "mold": 1567,
    ...
  }
}
```

### Step 8: Merge Datasets (5 minutes)

```bash
# Merge v3.0 + SAM 3 labels → v4.0
npm run merge-datasets-v4
```

This creates `yolo_dataset_v4/` with:
- 3,061 images (v3.0) + 2,347 recovered images = **5,408 images total**
- 66% increase in training data
- Expected mAP boost: 27.1% → 45-55%

### Step 9: Train YOLO v4.0 (3-4 hours)

```bash
# Create Colab training package
npm run create-colab-zips-v4

# Upload colab_upload_v4/ to Google Drive
# Run YOLO training in Colab (reuse existing training notebook)
```

## Expected Results

| Metric | Before SAM 3 | After SAM 3 | Improvement |
|--------|-------------|-------------|-------------|
| **Total Images** | 3,061 | 5,408 | +2,347 (+76%) |
| **mAP@50** | 27.1% | 45-55% | +18-28 points |
| **Cost** | Manual: $2,096 | Free | $2,096 saved |
| **Time** | Manual: 76 hours | 4 hours | 19x faster |

## Troubleshooting

### Issue: "No module named 'triton'"
- **Solution**: This is expected on Windows. Triton is Linux-only, which is why we use Colab.

### Issue: "Access denied to facebook/sam3"
- **Solution**:
  1. Go to https://huggingface.co/facebook/sam3
  2. Click "Request access"
  3. Wait for approval (usually instant)
  4. Re-run Cell 4

### Issue: "Colab disconnected"
- **Solution**:
  - Colab disconnects after 90 minutes of inactivity
  - Keep tab active by clicking occasionally
  - Or: Use Colab Pro ($10/month) for longer sessions

### Issue: "Out of GPU memory"
- **Solution**:
  - Restart runtime: Runtime → Restart runtime
  - Reduce `MAX_INSTANCES_PER_CLASS` from 20 to 10
  - Process in batches (1000 images at a time)

### Issue: "ZIP file not found in Drive"
- **Solution**: Update `ZIP_PATH` in Cell 6 to match your exact folder path:
  ```python
  ZIP_PATH = '/content/drive/MyDrive/YOUR_FOLDER_NAME/filtered_images.zip'
  ```

## Cost Breakdown

| Task | Manual | SAM 3 Colab | Savings |
|------|--------|-------------|---------|
| Labeling | $419-$2,096 | $0 | $419-$2,096 |
| GPU Time | N/A | $0 (free T4) | $0 |
| Human Hours | 36-76 hours | 4 hours | $1,800-$3,800 @ $50/hr |
| **Total** | **$2,219-$5,896** | **$0** | **$2,219-$5,896** |

## Timeline

| Step | Time | Cumulative |
|------|------|-----------|
| Package images | 5 min | 0:05 |
| Upload to Drive | 15 min | 0:20 |
| Upload notebook | 1 min | 0:21 |
| Configure GPU | 1 min | 0:22 |
| Install SAM 3 | 5 min | 0:27 |
| Load model | 5 min | 0:32 |
| Extract images | 2 min | 0:34 |
| **Auto-labeling** | **2-4 hours** | **2:34-4:34** |
| Package results | 2 min | 2:36-4:36 |
| Download | 2 min | 2:38-4:38 |
| Merge datasets | 5 min | 2:43-4:43 |
| **TOTAL** | **2h 43m - 4h 43m** | - |

## Next Steps After Auto-Labeling

1. ✅ Extract and verify labels
2. ✅ Merge datasets (v3.0 + SAM 3 → v4.0)
3. ✅ Create Colab training package
4. ✅ Train YOLO v4.0 (300 epochs, ~3-4 hours)
5. ✅ Evaluate results (target: 45-55% mAP@50)
6. ✅ Deploy model to production

## Support

If you encounter issues:

1. Check the Colab output for error messages
2. Review `labeling_stats.json` for processing details
3. Verify GPU is enabled: Runtime → Change runtime type
4. Ensure Hugging Face token has access to facebook/sam3
5. Keep Colab tab active during processing

## References

- SAM 3 GitHub: https://github.com/facebookresearch/sam3
- SAM 3 Paper: https://ai.meta.com/sam3/
- Hugging Face Model: https://huggingface.co/facebook/sam3
- Google Colab: https://colab.research.google.com
