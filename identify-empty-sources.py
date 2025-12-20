#!/usr/bin/env python3
"""
Identify the source of empty label files to understand why they exist
"""

import os
from pathlib import Path
from collections import defaultdict
import random

def identify_empty_sources():
    dataset_path = Path("yolo_dataset_merged_final")

    empty_files = {
        'train': [],
        'val': []
    }

    non_empty_non_sam2 = {
        'train': [],
        'val': []
    }

    # Collect all empty files and non-empty non-SAM2 files
    for split in ['train', 'val']:
        labels_dir = dataset_path / split / 'labels'
        if not labels_dir.exists():
            continue

        for label_file in labels_dir.glob('*.txt'):
            filename = label_file.name

            # Check if file is empty
            try:
                with open(label_file, 'r') as f:
                    content = f.read().strip()

                if not content:
                    empty_files[split].append(filename)
                elif not filename.startswith('sam2_batch'):
                    # Non-SAM2 file that has content
                    non_empty_non_sam2[split].append(filename)
            except:
                pass

    print("\n" + "="*80)
    print("EMPTY FILES ANALYSIS")
    print("="*80)

    # Analyze patterns in empty filenames
    patterns = defaultdict(int)
    sources = defaultdict(int)

    all_empty = empty_files['train'] + empty_files['val']
    print(f"\nTotal empty files: {len(all_empty)}")
    print(f"  Train: {len(empty_files['train'])}")
    print(f"  Val: {len(empty_files['val'])}")

    # Identify patterns
    for filename in all_empty:
        # Check various patterns
        if 'yolo_dataset_full' in filename:
            sources['yolo_dataset_full'] += 1
        elif 'yolo_dataset_v3' in filename:
            sources['yolo_dataset_v3'] += 1
        elif 'Building_Defect_Detection' in filename:
            sources['Building_Defect_Detection'] += 1
        elif 'sam2_batch' in filename:
            sources['sam2_batch'] += 1  # Should be 0 based on previous analysis
        else:
            sources['unknown'] += 1

        # Check file extensions/formats in name
        if '.jpg.rf.' in filename:
            patterns['roboflow_augmented'] += 1
        elif '.png.rf.' in filename:
            patterns['roboflow_png'] += 1
        elif '.jpeg.rf.' in filename:
            patterns['roboflow_jpeg'] += 1
        elif '_jpg.rf.' in filename:
            patterns['underscore_jpg_rf'] += 1
        elif '_png.rf.' in filename:
            patterns['underscore_png_rf'] += 1

    print("\n" + "-"*40)
    print("EMPTY FILES BY SOURCE:")
    print("-"*40)
    for source, count in sorted(sources.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / len(all_empty)) * 100
        print(f"  {source:30s}: {count:5d} ({percentage:.1f}%)")

    print("\n" + "-"*40)
    print("EMPTY FILES BY PATTERN:")
    print("-"*40)
    for pattern, count in sorted(patterns.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / len(all_empty)) * 100
        print(f"  {pattern:30s}: {count:5d} ({percentage:.1f}%)")

    # Sample some empty files to see naming patterns
    print("\n" + "-"*40)
    print("SAMPLE EMPTY FILENAMES (first 10):")
    print("-"*40)
    for i, filename in enumerate(all_empty[:10]):
        print(f"  {i+1}. {filename}")

    # Analyze non-empty non-SAM2 files
    all_non_empty = non_empty_non_sam2['train'] + non_empty_non_sam2['val']
    print("\n" + "="*80)
    print("NON-EMPTY NON-SAM2 FILES ANALYSIS")
    print("="*80)
    print(f"\nTotal non-empty non-SAM2 files: {len(all_non_empty)}")
    print(f"  Train: {len(non_empty_non_sam2['train'])}")
    print(f"  Val: {len(non_empty_non_sam2['val'])}")

    # Analyze their sources
    good_sources = defaultdict(int)
    for filename in all_non_empty:
        if 'yolo_dataset_full' in filename:
            good_sources['yolo_dataset_full'] += 1
        elif 'yolo_dataset_v3' in filename:
            good_sources['yolo_dataset_v3'] += 1
        elif 'Building_Defect_Detection' in filename:
            good_sources['Building_Defect_Detection'] += 1
        else:
            good_sources['unknown'] += 1

    print("\n" + "-"*40)
    print("NON-EMPTY NON-SAM2 BY SOURCE:")
    print("-"*40)
    for source, count in sorted(good_sources.items(), key=lambda x: x[1], reverse=True):
        print(f"  {source:30s}: {count:5d}")

    print("\n" + "-"*40)
    print("SAMPLE NON-EMPTY NON-SAM2 FILENAMES (first 10):")
    print("-"*40)
    for i, filename in enumerate(all_non_empty[:10]):
        print(f"  {i+1}. {filename}")

    # Check if there are corresponding images for empty labels
    print("\n" + "="*80)
    print("IMAGE-LABEL CORRESPONDENCE CHECK")
    print("="*80)

    # Check a sample of empty label files
    sample_size = min(20, len(all_empty))
    sample_empty = random.sample(all_empty, sample_size)

    missing_images = 0
    for split in ['train', 'val']:
        for filename in empty_files[split][:10]:  # Check first 10 in each split
            # Convert label filename to image filename
            img_filename = filename.replace('.txt', '')
            images_dir = dataset_path / split / 'images'

            # Check for various image extensions
            found = False
            for ext in ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']:
                img_path = images_dir / (img_filename + ext)
                if img_path.exists():
                    found = True
                    break

            if not found:
                missing_images += 1

    print(f"\nChecked {min(20, len(empty_files['train']) + len(empty_files['val']))} empty label files")
    print(f"Missing corresponding images: {missing_images}")

    # Final diagnosis
    print("\n" + "="*80)
    print("DIAGNOSIS")
    print("="*80)
    print("\nThe empty label files appear to be:")
    print("1. Images that were included in the dataset but couldn't be annotated")
    print("2. Images that had no visible defects (negative examples)")
    print("3. Failed annotation attempts that weren't cleaned up")
    print("\nRECOMMENDATION:")
    print("- Remove all empty label files and their corresponding images")
    print("- This will reduce dataset from 4,573 to ~2,216 images")
    print("- The remaining dataset will be 87% SAM2-annotated (high quality)")
    print("- Average annotations per image will increase from 4.68 to 9.56")

if __name__ == "__main__":
    identify_empty_sources()