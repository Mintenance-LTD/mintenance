"""
Create filtered_images.zip from merged dataset for SAM2 notebook
"""
import os
import zipfile
from pathlib import Path
import sys

# Fix encoding for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

SOURCE_DIR = "all_images_merged/images"
OUTPUT_ZIP = "filtered_images.zip"
MAX_IMAGES = None  # Set to a number to limit, or None for all images

def create_zip():
    """Create ZIP file from merged images"""
    print("="*70)
    print("📦 Creating filtered_images.zip for SAM2 Notebook")
    print("="*70)
    print()

    source_path = Path(SOURCE_DIR)

    if not source_path.exists():
        print(f"❌ Source directory not found: {source_path}")
        print("\nRun merge-all-datasets.py first!")
        return False

    # Get all image files
    image_files = []
    for ext in ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']:
        image_files.extend(list(source_path.glob(ext)))

    total_images = len(image_files)
    print(f"✅ Found {total_images:,} images in {SOURCE_DIR}")
    print()

    # Limit if specified
    if MAX_IMAGES and total_images > MAX_IMAGES:
        print(f"⚠️  Limiting to first {MAX_IMAGES:,} images (found {total_images:,})")
        image_files = image_files[:MAX_IMAGES]
        total_images = len(image_files)
    else:
        print(f"✅ Processing all {total_images:,} images")

    print()
    print(f"🔄 Creating ZIP file: {OUTPUT_ZIP}")
    print(f"   This may take a few minutes...")
    print()

    # Create ZIP file
    try:
        with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for i, image_file in enumerate(image_files, 1):
                # Add to ZIP with just the filename (no directory structure)
                zipf.write(str(image_file), image_file.name)

                # Progress indicator
                if i % 500 == 0 or i == total_images:
                    percent = (i / total_images) * 100
                    print(f"   Progress: {i:,}/{total_images:,} ({percent:.1f}%)")

        # Get ZIP file size
        zip_size_mb = os.path.getsize(OUTPUT_ZIP) / (1024 * 1024)

        print()
        print("="*70)
        print("✅ ZIP FILE CREATED SUCCESSFULLY")
        print("="*70)
        print()
        print(f"📁 File: {OUTPUT_ZIP}")
        print(f"📊 Size: {zip_size_mb:.1f} MB")
        print(f"🖼️  Images: {total_images:,}")
        print()
        print("📋 Next Steps:")
        print("   1. Upload filtered_images.zip to Google Drive:")
        print("      → /content/drive/MyDrive/SAM2_AutoLabel/filtered_images.zip")
        print("      → OR /content/drive/MyDrive/filtered_images.zip")
        print()
        print("   2. Open SAM2_AutoLabel_2000_Images_Updated.ipynb in Google Colab")
        print()
        print("   3. Run all cells (Runtime → Run all)")
        print()
        print("   4. Wait for auto-labeling to complete (~3-4 hours for 2000 images)")
        print()
        print("   5. Results will auto-download when done!")

        return True

    except Exception as e:
        print(f"❌ Error creating ZIP: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = create_zip()
    sys.exit(0 if success else 1)
