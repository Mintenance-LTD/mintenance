#!/usr/bin/env python3
"""
Fix YOLO Dataset Class ID Issues
=================================
This script fixes the class ID mismatch problem where some labels have
class IDs outside the valid range (0-14) for our 15-class dataset.

The issue: When merging datasets, some files kept their original class IDs
(e.g., COCO uses 0-79, but we only have 0-14).
"""

import os
import shutil
from pathlib import Path
import yaml

def fix_class_ids_in_dataset():
    """Fix all label files to only contain valid class IDs (0-14)."""

    # Configuration
    DATASET_DIR = Path(r"C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean\yolo_dataset_merged_final")
    MAX_CLASS_ID = 14  # For 15 classes (0-14)

    print("="*70)
    print(" FIXING DATASET CLASS ID ISSUES")
    print("="*70)

    # Load data.yaml to verify configuration
    data_yaml_path = DATASET_DIR / "data.yaml"
    with open(data_yaml_path, 'r') as f:
        data = yaml.safe_load(f)

    print(f"Dataset configuration:")
    print(f"  Classes: {data['nc']}")
    print(f"  Valid class IDs: 0 to {data['nc']-1}")
    print(f"  Class names: {data['names'][:5]}...")

    # Statistics
    stats = {
        'train': {'total': 0, 'fixed': 0, 'removed': 0, 'invalid_ids': set()},
        'val': {'total': 0, 'fixed': 0, 'removed': 0, 'invalid_ids': set()},
        'test': {'total': 0, 'fixed': 0, 'removed': 0, 'invalid_ids': set()}
    }

    # Process each split
    for split in ['train', 'val', 'test']:
        labels_dir = DATASET_DIR / split / 'labels'
        images_dir = DATASET_DIR / split / 'images'

        if not labels_dir.exists():
            print(f"\n[{split}] No labels directory found, skipping...")
            continue

        print(f"\n[{split.upper()}] Processing {split} set...")

        label_files = list(labels_dir.glob('*.txt'))
        stats[split]['total'] = len(label_files)

        for i, label_file in enumerate(label_files):
            if i % 500 == 0 and i > 0:
                print(f"  Processed {i}/{len(label_files)} files...")

            # Read all lines from the label file
            valid_lines = []
            invalid_lines = []
            has_valid = False
            has_invalid = False

            try:
                with open(label_file, 'r') as f:
                    for line_num, line in enumerate(f, 1):
                        line = line.strip()
                        if not line:
                            continue

                        parts = line.split()
                        if len(parts) >= 5:  # YOLO format: class_id x y w h [confidence]
                            try:
                                class_id = int(parts[0])

                                if 0 <= class_id <= MAX_CLASS_ID:
                                    # Valid class ID
                                    valid_lines.append(line + '\n')
                                    has_valid = True
                                else:
                                    # Invalid class ID - track it
                                    stats[split]['invalid_ids'].add(class_id)
                                    invalid_lines.append((line_num, class_id))
                                    has_invalid = True
                            except ValueError:
                                print(f"  Warning: Malformed line in {label_file.name} line {line_num}")
                                has_invalid = True
                        else:
                            print(f"  Warning: Incomplete annotation in {label_file.name} line {line_num}")
                            has_invalid = True

                # Decide what to do with the file
                if has_invalid:
                    if has_valid:
                        # File has some valid annotations - keep only valid ones
                        with open(label_file, 'w') as f:
                            f.writelines(valid_lines)
                        stats[split]['fixed'] += 1

                        if len(invalid_lines) <= 5:
                            # Show details for files with few errors
                            for line_num, class_id in invalid_lines:
                                print(f"  Fixed {label_file.name}: removed class ID {class_id} from line {line_num}")
                    else:
                        # File has NO valid annotations - remove it and its image
                        label_file.unlink()
                        stats[split]['removed'] += 1

                        # Also remove corresponding image
                        image_extensions = ['.jpg', '.jpeg', '.png']
                        image_removed = False
                        for ext in image_extensions:
                            image_file = images_dir / (label_file.stem + ext)
                            if image_file.exists():
                                image_file.unlink()
                                image_removed = True
                                break

                        if image_removed:
                            print(f"  Removed {label_file.name} and its image (all annotations invalid)")
                        else:
                            print(f"  Removed {label_file.name} (all annotations invalid, no image found)")

            except Exception as e:
                print(f"  Error processing {label_file.name}: {e}")
                stats[split]['removed'] += 1
                label_file.unlink()

    # Print summary
    print("\n" + "="*70)
    print(" CLEANING SUMMARY")
    print("="*70)

    total_fixed = 0
    total_removed = 0
    all_invalid_ids = set()

    for split in ['train', 'val', 'test']:
        if stats[split]['total'] > 0:
            total_fixed += stats[split]['fixed']
            total_removed += stats[split]['removed']
            all_invalid_ids.update(stats[split]['invalid_ids'])

            print(f"\n[{split.upper()}]")
            print(f"  Total files: {stats[split]['total']}")
            print(f"  Files fixed (kept with valid annotations): {stats[split]['fixed']}")
            print(f"  Files removed (no valid annotations): {stats[split]['removed']}")
            print(f"  Files unchanged: {stats[split]['total'] - stats[split]['fixed'] - stats[split]['removed']}")

            if stats[split]['invalid_ids']:
                print(f"  Invalid class IDs found: {sorted(stats[split]['invalid_ids'])}")

    # Final summary
    print("\n" + "="*70)
    print(" FINAL RESULTS")
    print("="*70)

    if all_invalid_ids:
        print(f"\nALL INVALID CLASS IDs FOUND: {sorted(all_invalid_ids)}")
        print(f"These were likely from other datasets like:")

        # Common class ID mappings for reference
        coco_classes = {
            0: "person", 1: "bicycle", 2: "car", 58: "oven",
            59: "toaster", 60: "sink", 79: "toothbrush"
        }
        for invalid_id in sorted(all_invalid_ids)[:10]:
            if invalid_id in coco_classes:
                print(f"  Class {invalid_id}: '{coco_classes[invalid_id]}' (from COCO dataset)")
            else:
                print(f"  Class {invalid_id}: Unknown origin")

    print(f"\nCLEANING COMPLETE:")
    print(f"  Files fixed: {total_fixed}")
    print(f"  Files removed: {total_removed}")

    # Count remaining files
    remaining_train = len(list((DATASET_DIR / 'train' / 'labels').glob('*.txt'))) if (DATASET_DIR / 'train' / 'labels').exists() else 0
    remaining_val = len(list((DATASET_DIR / 'val' / 'labels').glob('*.txt'))) if (DATASET_DIR / 'val' / 'labels').exists() else 0
    remaining_test = len(list((DATASET_DIR / 'test' / 'labels').glob('*.txt'))) if (DATASET_DIR / 'test' / 'labels').exists() else 0

    print(f"\nREMAINING DATASET SIZE:")
    print(f"  Train: {remaining_train} annotations")
    print(f"  Val: {remaining_val} annotations")
    print(f"  Test: {remaining_test} annotations")
    print(f"  Total: {remaining_train + remaining_val + remaining_test} annotations")

    if remaining_train + remaining_val > 100:
        print("\nOK Dataset still has sufficient data for training!")
        return True
    else:
        print("\nWarning: Dataset may be too small after cleaning!")
        return False

def verify_cleaned_dataset():
    """Verify that all class IDs are now valid."""

    DATASET_DIR = Path(r"C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean\yolo_dataset_merged_final")
    MAX_CLASS_ID = 14

    print("\n" + "="*70)
    print(" VERIFYING CLEANED DATASET")
    print("="*70)

    issues_found = False

    for split in ['train', 'val', 'test']:
        labels_dir = DATASET_DIR / split / 'labels'
        if not labels_dir.exists():
            continue

        print(f"\n[{split.upper()}] Verifying...")

        for label_file in labels_dir.glob('*.txt'):
            with open(label_file, 'r') as f:
                for line_num, line in enumerate(f, 1):
                    if line.strip():
                        try:
                            class_id = int(line.split()[0])
                            if class_id < 0 or class_id > MAX_CLASS_ID:
                                print(f"  ERROR: {label_file.name} line {line_num} has invalid class ID: {class_id}")
                                issues_found = True
                        except:
                            print(f"  ERROR: {label_file.name} line {line_num} is malformed")
                            issues_found = True

        if not issues_found:
            print(f"  OK All class IDs are valid (0-{MAX_CLASS_ID})")

    if not issues_found:
        print("\nOK VERIFICATION PASSED! Dataset is clean!")
        return True
    else:
        print("\nX VERIFICATION FAILED! Issues still present!")
        return False

if __name__ == "__main__":
    print(">> YOLO Dataset Class ID Fixer")
    print("   This will clean your dataset by removing invalid class IDs\n")

    # Step 1: Fix the dataset
    success = fix_class_ids_in_dataset()

    if success:
        # Step 2: Verify the fixes
        print("\nVerifying fixes...")
        verified = verify_cleaned_dataset()

        if verified:
            print("\n" + "="*70)
            print(" SUCCESS! Dataset is now clean and ready!")
            print("="*70)
            print("\nNext steps:")
            print("1. Run fix-and-create-colab-dataset.py to create new ZIP")
            print("2. Upload the new ZIP to Google Drive")
            print("3. Train your model in Colab!")
        else:
            print("\nSome issues remain. Please check the errors above.")
    else:
        print("\nDataset may be too small. Consider adding more data.")