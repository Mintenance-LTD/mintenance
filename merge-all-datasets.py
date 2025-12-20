"""
Merge all building defect image datasets into one folder
"""
import os
import shutil
from pathlib import Path
import sys

# Fix encoding for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Source datasets
DATASETS = [
    "Building Defect Detection 7.v2i.yolov11",
    "yolo_dataset_merged",
    "yolo_dataset_full",
    "training_data"
]

# Output directory
OUTPUT_DIR = "all_images_merged"

def merge_datasets():
    """Merge all datasets into one folder"""
    print("="*70)
    print("🔄 MERGING ALL BUILDING DEFECT DATASETS")
    print("="*70)
    print()

    # Create output directory
    output_path = Path(OUTPUT_DIR)
    output_path.mkdir(exist_ok=True)

    images_dir = output_path / "images"
    images_dir.mkdir(exist_ok=True)

    print(f"📁 Output directory: {output_path.absolute()}")
    print()

    # Statistics
    total_copied = 0
    total_skipped = 0
    dataset_stats = {}

    # Process each dataset
    for dataset_name in DATASETS:
        dataset_path = Path(dataset_name)

        if not dataset_path.exists():
            print(f"⚠️  Skipping {dataset_name} (not found)")
            continue

        print(f"📦 Processing: {dataset_name}")

        # Find all image files in this dataset
        image_files = []
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']:
            image_files.extend(list(dataset_path.rglob(ext)))

        dataset_count = 0
        skipped_count = 0

        for image_file in image_files:
            # Create unique filename to avoid conflicts
            # Format: dataset_original-filename.ext
            dataset_prefix = dataset_name.replace(" ", "_").replace(".", "_")
            new_filename = f"{dataset_prefix}_{image_file.name}"
            dest_path = images_dir / new_filename

            # Skip if already exists (avoid duplicates)
            if dest_path.exists():
                skipped_count += 1
                continue

            # Copy the file
            try:
                shutil.copy2(str(image_file), str(dest_path))
                dataset_count += 1
                total_copied += 1
            except Exception as e:
                print(f"   ❌ Error copying {image_file.name}: {e}")
                skipped_count += 1

        dataset_stats[dataset_name] = {
            'copied': dataset_count,
            'skipped': skipped_count
        }

        total_skipped += skipped_count

        print(f"   ✅ Copied: {dataset_count:,} images")
        if skipped_count > 0:
            print(f"   ⚠️  Skipped: {skipped_count:,} (duplicates)")
        print()

    # Final summary
    print("="*70)
    print("✅ MERGE COMPLETE")
    print("="*70)
    print()
    print("📊 Summary by Dataset:")
    for dataset_name, stats in dataset_stats.items():
        print(f"   {dataset_name}:")
        print(f"      Copied: {stats['copied']:,}")
        if stats['skipped'] > 0:
            print(f"      Skipped: {stats['skipped']:,}")

    print()
    print(f"📁 Total images in merged folder: {total_copied:,}")
    if total_skipped > 0:
        print(f"⚠️  Total duplicates skipped: {total_skipped:,}")

    print()
    print(f"📂 Output location: {images_dir.absolute()}")

    # Verify count
    final_count = len(list(images_dir.glob("*.*")))
    print(f"✅ Verified: {final_count:,} images in output folder")

    return total_copied

if __name__ == "__main__":
    try:
        count = merge_datasets()
        print()
        print("🎉 Success! All datasets merged into one folder.")
        print()
        print("📋 Next Steps:")
        print("   1. Review merged images in: all_images_merged/images/")
        print("   2. Create ZIP for SAM2 notebook (coming next...)")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
