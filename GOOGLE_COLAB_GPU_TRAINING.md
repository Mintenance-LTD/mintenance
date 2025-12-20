# 🆓 Free GPU Training with Google Colab

## Why Google Colab?

- **FREE Tesla T4 GPU** (same as AWS g4dn.xlarge that costs $1.44)
- **No quota requests** needed
- **No credit card** required
- **~8-10 hours** to complete your remaining 244 epochs
- **Zero cost** vs $1.44-$4.60 on AWS

## Quick Start (5 minutes setup)

### Step 1: Upload Your Checkpoint to Google Drive

1. Go to https://drive.google.com/
2. Create a folder: `yolo-training`
3. Upload these files from `yolo_dataset_full/`:
   - `maintenance_production/v1.02/weights/last.pt` (149 MB)
   - `data.yaml`
   - Entire `train/` folder (zipped)
   - Entire `val/` folder (zipped)

### Step 2: Create Colab Notebook

1. Go to https://colab.research.google.com/
2. Click "New Notebook"
3. Copy and paste the code below

### Step 3: Enable GPU

1. In Colab menu: **Runtime → Change runtime type**
2. Select **T4 GPU**
3. Click Save

### Step 4: Run Training

Paste this code in the notebook:

\`\`\`python
# Install dependencies
!pip install ultralytics torch torchvision

# Mount Google Drive
from google.colab import drive
drive.mount('/content/drive')

# Download and extract dataset
!cd /content/drive/MyDrive/yolo-training && unzip -q train.zip
!cd /content/drive/MyDrive/yolo-training && unzip -q val.zip

# Copy checkpoint
!cp /content/drive/MyDrive/yolo-training/last.pt ./

# Resume training from epoch 56
from ultralytics import YOLO
import torch

print(f"GPU Available: {torch.cuda.is_available()}")
print(f"GPU Name: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None'}")

model = YOLO('last.pt')  # Load checkpoint

results = model.train(
    data='/content/drive/MyDrive/yolo-training/data.yaml',
    epochs=300,
    imgsz=640,
    batch=16,
    device=0,  # GPU
    patience=50,
    save=True,
    save_period=10,
    cache=True,
    amp=True,
    project='/content/drive/MyDrive/yolo-training/results',
    name='colab_run'
)

# Save final model
!cp runs/detect/colab_run/weights/best.pt /content/drive/MyDrive/yolo-training/best_model.pt

print("✅ Training complete! Model saved to Google Drive")
\`\`\`

### Step 5: Monitor Progress

The notebook will show:
- Current epoch
- Loss values
- mAP metrics
- Estimated time remaining

### Step 6: Download Final Model

After training completes (~8-10 hours):
1. Go to Google Drive: `yolo-training/results/colab_run/weights/`
2. Download `best.pt`
3. This is your trained model!

## Important Notes

⚠️ **Session Limits**: Free Colab sessions last 12 hours max. Your training should complete in 8-10 hours.

⚠️ **Save Regularly**: The code above saves checkpoints every 10 epochs to Google Drive

⚠️ **Keep Browser Open**: Colab may disconnect if you close the browser. Use "Keep Colab alive" extensions if needed.

## If Session Disconnects

The training saves checkpoints every 10 epochs to Google Drive. If disconnected:

1. Create new notebook
2. Change the checkpoint line to the latest:
   \`\`\`python
   model = YOLO('/content/drive/MyDrive/yolo-training/results/colab_run/weights/last.pt')
   \`\`\`
3. Resume training

## Advantages vs AWS

| Feature | Google Colab | AWS |
|---------|-------------|-----|
| Cost | **FREE** | $1.44-$4.60 |
| Setup Time | 5 minutes | 30+ minutes |
| Quota Needed | No | Yes (DENIED) |
| GPU | Tesla T4 | T4 or V100 |
| Speed | 8-10 hours | 8-10 hours (T4) |
| Auto-save | Yes (Drive) | Yes (S3) |

## Alternative: Kaggle Notebooks

Kaggle also offers free GPU (30 hours/week):

1. Go to https://www.kaggle.com/
2. Create account
3. New Notebook → GPU T4 x2
4. Same code as above

## Expected Results

After training completes:
- **mAP@50**: >70% (current: 22.9%)
- **Precision**: >80% (current: 69.9%)
- **Recall**: >60% (current: 20.9%)
- **Model Size**: ~50 MB (optimized)

## Next Steps After Training

1. Download `best.pt` from Google Drive
2. Test the model locally:
   \`\`\`bash
   cd yolo_dataset_full
   python test_model.py --model best.pt
   \`\`\`
3. Deploy to production (Supabase storage)

## Cost Comparison

| Method | Time | Cost | Result |
|--------|------|------|--------|
| Local CPU | 33-37 hours | $0 | ✓ Works |
| Google Colab | 8-10 hours | **$0** | ✓ **Best option** |
| AWS g4dn.xlarge | 8-10 hours | $1.44 | ✗ Quota denied |
| AWS p3.2xlarge | 4-5 hours | $4.60 | ✗ Quota denied |

**Recommendation: Use Google Colab - it's free and ready now!**