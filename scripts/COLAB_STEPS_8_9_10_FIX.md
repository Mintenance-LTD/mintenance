# 🔧 Fix for Steps 8, 9, and 10 - Copy-Paste Ready

The cells reference `TRAINING_CONFIG` which may not be defined. Use these updated versions:

---

## Step 8: Validate Model (Fixed)

Copy this into the Step 8 cell:

```python
# Validate trained model
from ultralytics import YOLO
import os

# Define paths (works even if TRAINING_CONFIG wasn't run)
project = 'runs/train'
name = 'mintenance_ai_v3'
data_yaml = '/content/dataset/yolo_dataset_merged_final/data.yaml'

best_model_path = f"{project}/{name}/weights/best.pt"

print(f"🔍 Looking for model at: {best_model_path}")

if os.path.exists(best_model_path):
    trained_model = YOLO(best_model_path)
    
    print("🔍 Validating model on validation set...")
    metrics = trained_model.val(
        data=data_yaml,
        split='val'
    )
    
    print("\n📊 Validation Results:")
    print(f"   mAP50: {metrics.box.map50:.2%}")
    print(f"   mAP50-95: {metrics.box.map:.2%}")
    print(f"   Precision: {metrics.box.mp:.2%}")
    print(f"   Recall: {metrics.box.mr:.2%}")
    
    # Compare with target
    print("\n🎯 Target vs Actual:")
    print(f"   mAP50 Target: 45-55%")
    print(f"   mAP50 Actual: {metrics.box.map50:.2%}")
    if metrics.box.map50 >= 0.35:
        print("   ✅ Improvement achieved!")
    else:
        print("   ⚠️  May need more training or data")
else:
    print("❌ Model not found")
    print(f"   Expected path: {best_model_path}")
    print("\n💡 Check training completed:")
    if os.path.exists(project):
        runs = os.listdir(project)
        print(f"   Found {len(runs)} training runs: {runs}")
    else:
        print(f"   Training directory not found: {project}")
```

---

## Step 9: Save to Google Drive (Fixed)

Copy this into the Step 9 cell:

```python
# Save model to Google Drive
import shutil
import os

# Define paths (works even if TRAINING_CONFIG wasn't run)
project = 'runs/train'
name = 'mintenance_ai_v3'
best_model_path = f"{project}/{name}/weights/best.pt"
drive_backup_path = "/content/drive/MyDrive/YOLO_Training/mintenance_ai_v3_model.pt"

print(f"🔍 Looking for model at: {best_model_path}")

if os.path.exists(best_model_path):
    shutil.copy(best_model_path, drive_backup_path)
    size_mb = os.path.getsize(best_model_path) / (1024 * 1024)
    print(f"✅ Model saved to Google Drive!")
    print(f"   Size: {size_mb:.2f} MB")
    print(f"   Path: {drive_backup_path}")
    print("\n📥 Next: Download from Google Drive to your local machine")
    print("   Location: MyDrive/YOLO_Training/mintenance_ai_v3_model.pt")
else:
    print("❌ Model not found")
    print(f"   Expected path: {best_model_path}")
    if os.path.exists(project):
        runs = os.listdir(project)
        print(f"   Found training runs: {runs}")
        # Try to find best.pt in any run
        for run in runs:
            alt_path = f"{project}/{run}/weights/best.pt"
            if os.path.exists(alt_path):
                print(f"   💡 Found model at: {alt_path}")
                print(f"   Copy this manually or update the path above")
```

---

## Step 10: Download Results (Fixed)

Copy this into the Step 10 cell:

```python
# Download training results
from google.colab import files
import zipfile
from pathlib import Path
import os

# Define paths (works even if TRAINING_CONFIG wasn't run)
project = 'runs/train'
name = 'mintenance_ai_v3'
results_dir = Path(f"{project}/{name}")
zip_path = "/content/training_results.zip"

print(f"🔍 Looking for results at: {results_dir}")

if results_dir.exists():
    print("📦 Creating ZIP file...")
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for file in results_dir.rglob('*'):
            if file.is_file():
                zipf.write(file, file.relative_to(results_dir.parent))
    
    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"✅ ZIP created ({size_mb:.2f} MB)")
    files.download(zip_path)
    print("✅ Training results downloaded!")
else:
    print("❌ Results not found")
    print(f"   Expected path: {results_dir}")
    if os.path.exists(project):
        runs = os.listdir(project)
        print(f"   Found training runs: {runs}")
        # Offer to download the first run found
        if runs:
            alt_dir = Path(project) / runs[0]
            print(f"   💡 Try downloading: {alt_dir}")
```

---

## Quick Fix Instructions

1. **In Colab:** Open each cell (Step 8, 9, 10)
2. **Replace** the code with the fixed version above
3. **Run** each cell

These versions work independently and don't require `TRAINING_CONFIG` to be defined!
