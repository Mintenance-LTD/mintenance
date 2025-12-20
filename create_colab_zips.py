#!/usr/bin/env python3
"""
Create ZIP files for Google Colab upload from merged dataset
"""

import zipfile
from pathlib import Path
import os

# Paths
MERGED_DATASET = Path("yolo_dataset_merged")
OUTPUT_DIR = Path("colab_upload")
CHECKPOINT_DIR = Path("yolo_dataset_full/maintenance_production/v1.02/weights")

def create_zip(source_dir: Path, output_file: Path, description: str):
    """Create a ZIP file from a directory"""
    print(f"\n{description}")
    print(f"   Source: {source_dir}")
    print(f"   Output: {output_file}")

    file_count = 0
    total_size = 0

    with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        for file_path in source_dir.rglob('*'):
            if file_path.is_file():
                arcname = file_path.relative_to(source_dir)
                zipf.write(file_path, arcname)
                file_count += 1
                total_size += file_path.stat().st_size

                if file_count % 100 == 0:
                    print(f"      Compressed {file_count} files...")

    zip_size = output_file.stat().st_size
    compression_ratio = (1 - zip_size / total_size) * 100 if total_size > 0 else 0

    print(f"   Files: {file_count:,}")
    print(f"   Original size: {total_size / 1024 / 1024:.1f} MB")
    print(f"   Compressed size: {zip_size / 1024 / 1024:.1f} MB")
    print(f"   Compression: {compression_ratio:.1f}%")

    return file_count, zip_size

def main():
    print("="*70)
    print("       CREATE COLAB UPLOAD ZIP FILES")
    print("  Merged Dataset -> Google Drive Upload")
    print("="*70)

    # Validate paths
    if not MERGED_DATASET.exists():
        print(f"\nERROR: Merged dataset not found at {MERGED_DATASET}")
        print("Run merge_datasets.py first!")
        return

    # Create output directory
    OUTPUT_DIR.mkdir(exist_ok=True)
    print(f"\nOutput directory: {OUTPUT_DIR.absolute()}")

    total_files = 0
    total_size = 0

    # 1. Train images
    train_img_dir = MERGED_DATASET / "train" / "images"
    if train_img_dir.exists():
        count, size = create_zip(
            train_img_dir,
            OUTPUT_DIR / "train_images.zip",
            "[1/5] Creating train_images.zip..."
        )
        total_files += count
        total_size += size

    # 2. Train labels
    train_label_dir = MERGED_DATASET / "train" / "labels"
    if train_label_dir.exists():
        count, size = create_zip(
            train_label_dir,
            OUTPUT_DIR / "train_labels.zip",
            "[2/5] Creating train_labels.zip..."
        )
        total_files += count
        total_size += size

    # 3. Val images
    val_img_dir = MERGED_DATASET / "val" / "images"
    if val_img_dir.exists():
        count, size = create_zip(
            val_img_dir,
            OUTPUT_DIR / "val_images.zip",
            "[3/5] Creating val_images.zip..."
        )
        total_files += count
        total_size += size

    # 4. Val labels
    val_label_dir = MERGED_DATASET / "val" / "labels"
    if val_label_dir.exists():
        count, size = create_zip(
            val_label_dir,
            OUTPUT_DIR / "val_labels.zip",
            "[4/5] Creating val_labels.zip..."
        )
        total_files += count
        total_size += size

    # 5. Copy checkpoint and data.yaml
    print("\n[5/5] Copying checkpoint and data.yaml...")

    # Copy checkpoint
    checkpoint_file = CHECKPOINT_DIR / "last.pt"
    if checkpoint_file.exists():
        import shutil
        shutil.copy2(checkpoint_file, OUTPUT_DIR / "last.pt")
        checkpoint_size = (OUTPUT_DIR / "last.pt").stat().st_size
        total_size += checkpoint_size
        print(f"   Copied: last.pt ({checkpoint_size / 1024 / 1024:.1f} MB)")
    else:
        print(f"   WARNING: Checkpoint not found at {checkpoint_file}")

    # Copy data.yaml
    data_yaml = MERGED_DATASET / "data.yaml"
    if data_yaml.exists():
        import shutil
        shutil.copy2(data_yaml, OUTPUT_DIR / "data.yaml")
        print(f"   Copied: data.yaml")

    # Summary
    print("\n" + "="*70)
    print(" SUMMARY")
    print("="*70)
    print(f"\nTotal files packaged: {total_files:,}")
    print(f"Total upload size: {total_size / 1024 / 1024:.1f} MB")
    print(f"Total upload time (estimated): {total_size / 1024 / 1024 / 5:.1f} minutes (at 5 MB/s)")

    print(f"\nFiles ready in: {OUTPUT_DIR.absolute()}")
    print("\nFiles to upload to Google Drive:")
    print("   1. train_images.zip")
    print("   2. train_labels.zip")
    print("   3. val_images.zip")
    print("   4. val_labels.zip")
    print("   5. last.pt (checkpoint)")
    print("   6. data.yaml (configuration)")

    print("\n" + "="*70)
    print(" NEXT STEPS")
    print("="*70)
    print("\n1. Go to: https://drive.google.com/")
    print("2. Open your 'yolo-training' folder")
    print("3. DELETE old files (if any)")
    print("4. Upload ALL 6 files from colab_upload/ folder")
    print("5. Wait for upload to complete")
    print("6. Update and run Colab notebook")
    print("\n" + "="*70)

if __name__ == "__main__":
    main()
