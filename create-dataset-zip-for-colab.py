"""
Create ZIP of merged dataset for Google Colab training
"""

import zipfile
from pathlib import Path

SOURCE_DIR = "yolo_dataset_merged_final"
OUTPUT_ZIP = "yolo_dataset_merged_final.zip"

def create_dataset_zip():
    """Create ZIP of merged dataset"""

    print("=" * 70)
    print("CREATING DATASET ZIP FOR GOOGLE COLAB")
    print("=" * 70)

    source_path = Path(SOURCE_DIR)

    if not source_path.exists():
        print(f"\nERROR: {SOURCE_DIR} not found!")
        return

    # Count files
    total_files = sum(1 for _ in source_path.rglob('*') if _.is_file())

    print(f"\nSource: {source_path.absolute()}")
    print(f"Total files: {total_files:,}")
    print(f"\nCreating ZIP: {OUTPUT_ZIP}")
    print("This may take several minutes...\n")

    with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED) as zipf:
        file_count = 0

        for file_path in source_path.rglob('*'):
            if file_path.is_file():
                # Get relative path
                arcname = file_path.relative_to(source_path.parent)

                try:
                    zipf.write(str(file_path), str(arcname))
                    file_count += 1

                    if file_count % 500 == 0:
                        progress = (file_count / total_files) * 100
                        print(f"   Progress: {file_count:,}/{total_files:,} ({progress:.1f}%)")

                except Exception as e:
                    print(f"   Skipped {file_path.name}: {e}")
                    continue

    final_size = Path(OUTPUT_ZIP).stat().st_size / (1024 ** 2)

    print(f"\n" + "=" * 70)
    print("ZIP CREATED SUCCESSFULLY")
    print("=" * 70)

    print(f"\nFile: {OUTPUT_ZIP}")
    print(f"Size: {final_size:.1f} MB")
    print(f"Files: {file_count:,}")

    print(f"\nNext Steps:")
    print(f"   1. Upload {OUTPUT_ZIP} to Google Drive")
    print(f"      Location: /MyDrive/yolo_dataset_merged_final.zip")
    print(f"   2. Open YOLO_Training_Colab.ipynb in Google Colab")
    print(f"   3. Change runtime to GPU (T4)")
    print(f"   4. Run all cells")
    print(f"   5. Wait 2-4 hours for training to complete")
    print(f"   6. Download trained model")

if __name__ == "__main__":
    create_dataset_zip()
