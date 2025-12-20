#!/usr/bin/env python3
"""
Dataset Merge Script with Class Mapping
Merges Building Defect Detection 7 v3 (81 classes) into Maintenance Model (15 classes)
"""

import os
import json
import shutil
from pathlib import Path
from typing import Dict, List, Tuple
import random

# Paths
CURRENT_DATASET = Path("yolo_dataset_full")
NEW_DATASET = Path(r"C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\Building Defect Detection 7.v3i.yolov12")
MAPPING_FILE = Path("class_mapping.json")
OUTPUT_DATASET = Path("yolo_dataset_merged")

# Statistics
stats = {
    "current_train": 0,
    "current_val": 0,
    "new_train_added": 0,
    "new_val_added": 0,
    "new_filtered": 0,
    "total_train": 0,
    "total_val": 0,
    "class_distribution": {}
}

def load_class_mapping() -> Dict:
    """Load the class mapping JSON file"""
    print(" Loading class mapping...")
    with open(MAPPING_FILE, 'r') as f:
        mapping_data = json.load(f)

    # Convert string keys to integers
    mapping = {int(k): int(v) for k, v in mapping_data['mapping'].items()}
    print(f"    Loaded mapping: {len(mapping)} source classes  {mapping_data['statistics']['total_target_classes']} target classes")
    print(f"    Filtering out: {mapping_data['statistics']['filtered_classes']} non-defect classes")
    return mapping

def remap_label_file(label_path: Path, class_mapping: Dict) -> List[str]:
    """
    Remap class IDs in a YOLO label file
    Returns list of remapped lines (empty if all boxes filtered out)
    """
    remapped_lines = []

    with open(label_path, 'r') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) < 5:
                continue

            old_class_id = int(parts[0])
            bbox = parts[1:]  # x_center, y_center, width, height

            # Check mapping
            if old_class_id not in class_mapping:
                continue  # Skip unknown classes

            new_class_id = class_mapping[old_class_id]

            # Filter out non-defects (mapped to -1)
            if new_class_id == -1:
                stats['new_filtered'] += 1
                continue

            # Create remapped line
            remapped_line = f"{new_class_id} {' '.join(bbox)}\n"
            remapped_lines.append(remapped_line)

            # Update class distribution
            class_name = str(new_class_id)
            stats['class_distribution'][class_name] = stats['class_distribution'].get(class_name, 0) + 1

    return remapped_lines

def copy_existing_dataset():
    """Copy current dataset to output directory"""
    print("\n Step 1: Copying existing dataset...")

    # Create output directories
    for split in ['train', 'val']:
        for data_type in ['images', 'labels']:
            output_dir = OUTPUT_DATASET / split / data_type
            output_dir.mkdir(parents=True, exist_ok=True)

    # Copy current train
    print("   Copying current training set...")
    current_train_imgs = list((CURRENT_DATASET / 'train' / 'images').glob('*.jpg'))
    for img_path in current_train_imgs:
        # Copy image
        shutil.copy2(img_path, OUTPUT_DATASET / 'train' / 'images' / img_path.name)

        # Copy label
        label_path = CURRENT_DATASET / 'train' / 'labels' / f"{img_path.stem}.txt"
        if label_path.exists():
            shutil.copy2(label_path, OUTPUT_DATASET / 'train' / 'labels' / label_path.name)

    stats['current_train'] = len(current_train_imgs)
    print(f"    Copied {stats['current_train']} training images")

    # Copy current val
    print("   Copying current validation set...")
    current_val_imgs = list((CURRENT_DATASET / 'val' / 'images').glob('*.jpg'))
    for img_path in current_val_imgs:
        # Copy image
        shutil.copy2(img_path, OUTPUT_DATASET / 'val' / 'images' / img_path.name)

        # Copy label
        label_path = CURRENT_DATASET / 'val' / 'labels' / f"{img_path.stem}.txt"
        if label_path.exists():
            shutil.copy2(label_path, OUTPUT_DATASET / 'val' / 'labels' / label_path.name)

    stats['current_val'] = len(current_val_imgs)
    print(f"    Copied {stats['current_val']} validation images")

    # Copy data.yaml
    if (CURRENT_DATASET / 'data.yaml').exists():
        shutil.copy2(CURRENT_DATASET / 'data.yaml', OUTPUT_DATASET / 'data.yaml')
        print("    Copied data.yaml")

def merge_new_dataset(class_mapping: Dict):
    """Merge new dataset with class remapping"""
    print("\n Step 2: Merging new dataset with class remapping...")

    # Process training set
    print("   Processing new training images...")
    new_train_imgs = list((NEW_DATASET / 'train' / 'images').glob('*.jpg'))
    added_train = 0

    for img_path in new_train_imgs:
        label_path = NEW_DATASET / 'train' / 'labels' / f"{img_path.stem}.txt"

        if not label_path.exists():
            continue

        # Remap labels
        remapped_labels = remap_label_file(label_path, class_mapping)

        # Skip if all boxes were filtered out
        if not remapped_labels:
            continue

        # Generate unique filename
        new_name = f"new_{img_path.stem}.jpg"
        output_img = OUTPUT_DATASET / 'train' / 'images' / new_name
        output_label = OUTPUT_DATASET / 'train' / 'labels' / f"new_{img_path.stem}.txt"

        # Copy image
        shutil.copy2(img_path, output_img)

        # Write remapped labels
        with open(output_label, 'w') as f:
            f.writelines(remapped_labels)

        added_train += 1

        if added_train % 500 == 0:
            print(f"      Processed {added_train} images...")

    stats['new_train_added'] = added_train
    print(f"    Added {added_train} training images")

    # Process validation set
    print("   Processing new validation images...")
    new_val_imgs = list((NEW_DATASET / 'valid' / 'images').glob('*.jpg'))
    added_val = 0

    for img_path in new_val_imgs:
        label_path = NEW_DATASET / 'valid' / 'labels' / f"{img_path.stem}.txt"

        if not label_path.exists():
            continue

        # Remap labels
        remapped_labels = remap_label_file(label_path, class_mapping)

        # Skip if all boxes were filtered out
        if not remapped_labels:
            continue

        # Generate unique filename
        new_name = f"new_{img_path.stem}.jpg"
        output_img = OUTPUT_DATASET / 'val' / 'images' / new_name
        output_label = OUTPUT_DATASET / 'val' / 'labels' / f"new_{img_path.stem}.txt"

        # Copy image
        shutil.copy2(img_path, output_img)

        # Write remapped labels
        with open(output_label, 'w') as f:
            f.writelines(remapped_labels)

        added_val += 1

        if added_val % 200 == 0:
            print(f"      Processed {added_val} images...")

    stats['new_val_added'] = added_val
    print(f"    Added {added_val} validation images")

def update_data_yaml():
    """Update data.yaml with new statistics"""
    print("\n Step 3: Updating data.yaml...")

    stats['total_train'] = stats['current_train'] + stats['new_train_added']
    stats['total_val'] = stats['current_val'] + stats['new_val_added']

    data_yaml_content = f"""# Merged Dataset Configuration
# Generated by merge_datasets.py

path: {OUTPUT_DATASET.absolute()}
train: train/images
val: val/images

# Classes
names:
  0: pipe_leak
  1: water_damage
  2: wall_crack
  3: roof_damage
  4: electrical_fault
  5: mold_damp
  6: fire_damage
  7: window_broken
  8: door_damaged
  9: floor_damage
  10: ceiling_damage
  11: foundation_crack
  12: hvac_issue
  13: gutter_blocked
  14: general_damage

# Dataset Statistics
nc: 15  # number of classes
train_images: {stats['total_train']}
val_images: {stats['total_val']}
total_images: {stats['total_train'] + stats['total_val']}

# Source Information
sources:
  - Maintenance Model Original Dataset ({stats['current_train'] + stats['current_val']} images)
  - Building Defect Detection 7 v3 ({stats['new_train_added'] + stats['new_val_added']} images, remapped from 81 classes)

filtered_boxes: {stats['new_filtered']}  # Non-defect boxes filtered out
"""

    with open(OUTPUT_DATASET / 'data.yaml', 'w') as f:
        f.write(data_yaml_content)

    print(f"    Updated data.yaml")

def print_statistics():
    """Print detailed merge statistics"""
    print("\n" + "="*70)
    print(" MERGE STATISTICS")
    print("="*70)

    print("\n Dataset Sizes:")
    print(f"   Current dataset (original):")
    print(f"      Train: {stats['current_train']:,} images")
    print(f"      Val:   {stats['current_val']:,} images")
    print(f"      Total: {stats['current_train'] + stats['current_val']:,} images")

    print(f"\n   New dataset (added after mapping):")
    print(f"      Train: {stats['new_train_added']:,} images")
    print(f"      Val:   {stats['new_val_added']:,} images")
    print(f"      Total: {stats['new_train_added'] + stats['new_val_added']:,} images")
    print(f"      Filtered: {stats['new_filtered']:,} boxes (non-defects)")

    print(f"\n   Merged dataset (final):")
    print(f"      Train: {stats['total_train']:,} images ({((stats['total_train']/(stats['current_train']+0.01)-1)*100):.1f}% increase)")
    print(f"      Val:   {stats['total_val']:,} images ({((stats['total_val']/(stats['current_val']+0.01)-1)*100):.1f}% increase)")
    print(f"      Total: {stats['total_train'] + stats['total_val']:,} images ({(((stats['total_train'] + stats['total_val'])/(stats['current_train'] + stats['current_val'])-1)*100):.1f}% increase)")

    print(f"\n Output Location:")
    print(f"   {OUTPUT_DATASET.absolute()}")

    print("\n" + "="*70)
    print("MERGE COMPLETE!")
    print("="*70)

def main():
    """Main merge process"""
    print("="*70)
    print("       DATASET MERGE WITH CLASS MAPPING")
    print("  Building Defect Detection 7 v3 -> Maintenance Model")
    print("="*70)

    # Validate paths
    if not CURRENT_DATASET.exists():
        print(f"ERROR: Current dataset not found at {CURRENT_DATASET}")
        return

    if not NEW_DATASET.exists():
        print(f"ERROR: New dataset not found at {NEW_DATASET}")
        return

    if not MAPPING_FILE.exists():
        print(f"ERROR: Class mapping not found at {MAPPING_FILE}")
        return

    # Load mapping
    class_mapping = load_class_mapping()

    # Create output directory
    if OUTPUT_DATASET.exists():
        print(f"\nWARNING: Output directory {OUTPUT_DATASET} already exists.")
        print("   Deleting and recreating...")
        shutil.rmtree(OUTPUT_DATASET)

    OUTPUT_DATASET.mkdir(parents=True, exist_ok=True)

    # Execute merge
    copy_existing_dataset()
    merge_new_dataset(class_mapping)
    update_data_yaml()

    # Print results
    print_statistics()

    print("\n Next Steps:")
    print("   1. Review merged dataset: yolo_dataset_merged/")
    print("   2. Create ZIP files: python create_colab_zips.py")
    print("   3. Upload to Google Drive")
    print("   4. Resume training from epoch 56")

    print("\n Expected Performance:")
    print(f"   Dataset size: {stats['current_train'] + stats['current_val']:,}  {stats['total_train'] + stats['total_val']:,} images")
    print("   mAP@50: 22.9%  45-55% (estimated)")
    print("   Training time: +2-4 hours")

if __name__ == "__main__":
    main()
