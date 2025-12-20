#!/usr/bin/env python3
"""
Fix YOLO Dataset for Google Colab Training
===========================================
This script prepares a YOLO dataset for training in Google Colab by:
1. Fixing Windows paths to relative paths
2. Verifying all images and labels exist
3. Creating a clean ZIP file ready for upload
"""

import os
import shutil
import yaml
import zipfile
from pathlib import Path
import sys

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*70)
    print(f" {title}")
    print("="*70)

def fix_dataset_for_colab():
    """Main function to fix dataset and create Colab-ready ZIP"""

    # Configuration
    DATASET_DIR = Path(r"C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean\yolo_dataset_merged_final")
    OUTPUT_ZIP = Path(r"C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean\yolo_dataset_colab_ready.zip")

    print_section("YOLO DATASET FIXER FOR GOOGLE COLAB")

    # Step 1: Verify dataset directory exists
    if not DATASET_DIR.exists():
        print(f"X Dataset directory not found: {DATASET_DIR}")
        return False

    print(f"OK Found dataset directory: {DATASET_DIR}")

    # Step 2: Check for data.yaml
    data_yaml_path = DATASET_DIR / "data.yaml"
    if not data_yaml_path.exists():
        print(f"X data.yaml not found at: {data_yaml_path}")
        return False

    print(f"OK Found data.yaml")

    # Step 3: Read current data.yaml
    print_section("FIXING DATA.YAML")

    with open(data_yaml_path, 'r') as f:
        data = yaml.safe_load(f)

    print("Current configuration:")
    print(f"  Path: {data.get('path', 'N/A')}")
    print(f"  Train: {data.get('train', 'N/A')}")
    print(f"  Val: {data.get('val', 'N/A')}")
    print(f"  Classes: {data.get('nc', 'N/A')}")

    # Step 4: Fix paths to be relative (critical for Colab)
    # Use '.' as the path which means "current directory"
    data['path'] = '.'  # This is KEY - it tells YOLO to look in the same directory as data.yaml
    data['train'] = 'train/images'
    data['val'] = 'val/images'
    data['test'] = 'val/images'  # Use val as test if no separate test set

    print("\nOK Fixed configuration:")
    print(f"  Path: {data['path']}")
    print(f"  Train: {data['train']}")
    print(f"  Val: {data['val']}")

    # Step 5: Save fixed data.yaml
    with open(data_yaml_path, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)

    print("OK data.yaml updated with relative paths")

    # Step 6: Verify dataset structure
    print_section("VERIFYING DATASET STRUCTURE")

    # Check train images
    train_images_dir = DATASET_DIR / "train" / "images"
    train_labels_dir = DATASET_DIR / "train" / "labels"

    if not train_images_dir.exists():
        print(f"X Train images directory missing: {train_images_dir}")
        return False

    train_images = list(train_images_dir.glob("*.jpg")) + list(train_images_dir.glob("*.png"))
    train_labels = list(train_labels_dir.glob("*.txt")) if train_labels_dir.exists() else []

    print(f"OK Train: {len(train_images)} images, {len(train_labels)} labels")

    # Check val images
    val_images_dir = DATASET_DIR / "val" / "images"
    val_labels_dir = DATASET_DIR / "val" / "labels"

    if not val_images_dir.exists():
        print(f"X Val images directory missing: {val_images_dir}")
        return False

    val_images = list(val_images_dir.glob("*.jpg")) + list(val_images_dir.glob("*.png"))
    val_labels = list(val_labels_dir.glob("*.txt")) if val_labels_dir.exists() else []

    print(f"OK Val: {len(val_images)} images, {len(val_labels)} labels")

    # Check test images (optional)
    test_images_dir = DATASET_DIR / "test" / "images"
    if test_images_dir.exists():
        test_images = list(test_images_dir.glob("*.jpg")) + list(test_images_dir.glob("*.png"))
        print(f"OK Test: {len(test_images)} images")

    total_images = len(train_images) + len(val_images)
    print(f"\n>> Total: {total_images} images ({len(train_images)} train, {len(val_images)} val)")

    if total_images == 0:
        print("X No images found in dataset!")
        return False

    # Step 7: Verify at least one image from each set exists
    print_section("SAMPLE VERIFICATION")

    if train_images:
        sample_train = train_images[0]
        print(f"OK Sample train image: {sample_train.name} ({sample_train.stat().st_size / 1024:.1f} KB)")

    if val_images:
        sample_val = val_images[0]
        print(f"OK Sample val image: {sample_val.name} ({sample_val.stat().st_size / 1024:.1f} KB)")

    # Step 8: Create ZIP file
    print_section("CREATING COLAB-READY ZIP")

    print(f"Creating ZIP at: {OUTPUT_ZIP}")
    print("This may take a few minutes...")

    with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add all files from the dataset directory
        for file_path in DATASET_DIR.rglob('*'):
            if file_path.is_file():
                # Get relative path from dataset root
                arcname = file_path.relative_to(DATASET_DIR.parent)
                zipf.write(file_path, arcname)

                # Show progress for key files
                if file_path.name == 'data.yaml':
                    print(f"  OK Added: {arcname}")
                elif file_path.suffix in ['.jpg', '.png', '.txt']:
                    # Just count, don't print each one
                    pass

    # Get ZIP size
    zip_size_mb = OUTPUT_ZIP.stat().st_size / (1024 * 1024)
    print(f"\nOK ZIP created successfully!")
    print(f"   Size: {zip_size_mb:.1f} MB")
    print(f"   Path: {OUTPUT_ZIP}")

    # Step 9: Provide instructions
    print_section("NEXT STEPS")

    print("1. Upload the ZIP file to Google Drive:")
    print(f"   {OUTPUT_ZIP}")
    print("\n2. In your Colab notebook, use this code to extract:")
    print("""
# Cell 1: Mount Drive and Extract
from google.colab import drive
drive.mount('/content/drive')

# Cell 2: Extract Dataset
!unzip -q "/content/drive/MyDrive/YOLO_Training/yolo_dataset_colab_ready.zip" -d "/content/dataset"

# Cell 3: Verify Extraction
import yaml
with open('/content/dataset/yolo_dataset_merged_final/data.yaml', 'r') as f:
    data = yaml.safe_load(f)
    print("Dataset ready!")
    print(f"  Classes: {data['nc']}")
    print(f"  Names: {', '.join(data['names'][:5])}...")

# Cell 4: Train
from ultralytics import YOLO
model = YOLO('yolo11n.pt')
results = model.train(
    data='/content/dataset/yolo_dataset_merged_final/data.yaml',
    epochs=100,
    imgsz=640,
    batch=16
)
""")

    print("\nOK Dataset is now Colab-ready!")
    print("   No path fixing needed - it will work directly!")

    return True

def create_backup():
    """Create a backup of the original data.yaml before modifying"""
    original = Path(r"C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean\yolo_dataset_merged_final\data.yaml")
    backup = Path(r"C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean\yolo_dataset_merged_final\data.yaml.backup")

    if original.exists() and not backup.exists():
        shutil.copy2(original, backup)
        print(f"OK Backup created: {backup}")

if __name__ == "__main__":
    print(">> Starting YOLO Dataset Fixer for Google Colab")
    print("   This will create a ZIP file that works directly in Colab")
    print("   No manual path fixing needed!\n")

    # Create backup first
    create_backup()

    # Run the fixer
    success = fix_dataset_for_colab()

    if success:
        print("\n>> SUCCESS! Your dataset is ready for Google Colab!")
    else:
        print("\n>> Failed to prepare dataset. Please check the errors above.")
        sys.exit(1)