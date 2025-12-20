#!/usr/bin/env python3
"""
Create final clean YOLO dataset for Colab training
- Removes all empty label files and their images
- Keeps only properly annotated data
- Creates clean ZIP for upload
"""

import os
import shutil
import yaml
import zipfile
from pathlib import Path
from collections import defaultdict

def create_final_clean_dataset():
    source_dir = Path("yolo_dataset_merged_final")
    clean_dir = Path("yolo_dataset_clean_final")

    # Remove existing clean directory if it exists
    if clean_dir.exists():
        shutil.rmtree(clean_dir)

    # Create directory structure
    for split in ['train', 'val']:
        (clean_dir / split / 'images').mkdir(parents=True, exist_ok=True)
        (clean_dir / split / 'labels').mkdir(parents=True, exist_ok=True)

    # Statistics
    stats = {
        'train': {'kept': 0, 'removed': 0, 'total_boxes': 0, 'class_dist': defaultdict(int)},
        'val': {'kept': 0, 'removed': 0, 'total_boxes': 0, 'class_dist': defaultdict(int)}
    }

    # Process each split
    for split in ['train', 'val']:
        labels_dir = source_dir / split / 'labels'
        images_dir = source_dir / split / 'images'

        if not labels_dir.exists():
            continue

        print(f"\nProcessing {split} split...")

        for label_file in labels_dir.glob('*.txt'):
            # Read label file
            try:
                with open(label_file, 'r') as f:
                    lines = f.readlines()

                # Check if file has valid annotations
                valid_lines = []
                for line in lines:
                    parts = line.strip().split()
                    if len(parts) == 5:
                        try:
                            class_id = int(parts[0])
                            if 0 <= class_id <= 14:  # Valid class ID
                                valid_lines.append(line.strip())
                                stats[split]['class_dist'][class_id] += 1
                        except:
                            pass

                # Only keep files with at least one valid annotation
                if valid_lines:
                    # Write clean label file
                    clean_label_path = clean_dir / split / 'labels' / label_file.name
                    with open(clean_label_path, 'w') as f:
                        f.write('\n'.join(valid_lines) + '\n')

                    # Copy corresponding image
                    base_name = label_file.stem
                    copied = False

                    for ext in ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']:
                        img_file = images_dir / (base_name + ext)
                        if img_file.exists():
                            clean_img_path = clean_dir / split / 'images' / img_file.name
                            shutil.copy2(img_file, clean_img_path)
                            copied = True
                            break

                    if copied:
                        stats[split]['kept'] += 1
                        stats[split]['total_boxes'] += len(valid_lines)
                    else:
                        # Remove label if no image found
                        clean_label_path.unlink()
                        print(f"  Warning: No image found for {label_file.name}")
                else:
                    stats[split]['removed'] += 1

            except Exception as e:
                print(f"  Error processing {label_file.name}: {e}")
                stats[split]['removed'] += 1

    # Create data.yaml with relative paths for Colab
    class_names = [
        'general_damage', 'cracks', 'mold', 'water_damage', 'structural_damage',
        'electrical_issues', 'plumbing_issues', 'roofing_damage', 'window_damage',
        'door_damage', 'floor_damage', 'wall_damage', 'ceiling_damage',
        'hvac_issues', 'insulation_issues'
    ]

    data_yaml = {
        'path': '.',  # Current directory in Colab
        'train': 'train/images',
        'val': 'val/images',
        'test': 'val/images',
        'nc': 15,
        'names': class_names
    }

    with open(clean_dir / 'data.yaml', 'w') as f:
        yaml.dump(data_yaml, f, default_flow_style=False, sort_keys=False)

    # Print statistics
    print("\n" + "="*80)
    print("DATASET CLEANING COMPLETE")
    print("="*80)

    total_kept = stats['train']['kept'] + stats['val']['kept']
    total_removed = stats['train']['removed'] + stats['val']['removed']
    total_boxes = stats['train']['total_boxes'] + stats['val']['total_boxes']

    print(f"\nOVERALL STATISTICS:")
    print(f"  Files kept: {total_kept}")
    print(f"  Files removed: {total_removed}")
    print(f"  Removal rate: {total_removed/(total_kept+total_removed)*100:.1f}%")
    print(f"  Total annotations: {total_boxes:,}")
    print(f"  Avg boxes/image: {total_boxes/max(1,total_kept):.2f}")

    print(f"\nTRAIN SPLIT:")
    print(f"  Files kept: {stats['train']['kept']}")
    print(f"  Files removed: {stats['train']['removed']}")
    print(f"  Total boxes: {stats['train']['total_boxes']:,}")

    print(f"\nVAL SPLIT:")
    print(f"  Files kept: {stats['val']['kept']}")
    print(f"  Files removed: {stats['val']['removed']}")
    print(f"  Total boxes: {stats['val']['total_boxes']:,}")

    # Class distribution
    print(f"\nCLASS DISTRIBUTION (all splits):")
    all_classes = defaultdict(int)
    for split in ['train', 'val']:
        for class_id, count in stats[split]['class_dist'].items():
            all_classes[class_id] += count

    for class_id in range(15):
        count = all_classes[class_id]
        if count > 0:
            percentage = (count / total_boxes) * 100
            print(f"  {class_id:2d} ({class_names[class_id]:20s}): {count:5d} ({percentage:5.1f}%)")

    # Check class balance
    print("\nCLASS BALANCE ANALYSIS:")
    if all_classes:
        min_class = min(all_classes.values())
        max_class = max(all_classes.values())
        imbalance_ratio = max_class / max(1, min_class)
        print(f"  Most common: Class {max(all_classes, key=all_classes.get)} with {max_class} annotations")
        print(f"  Least common: Class {min(all_classes, key=all_classes.get)} with {min_class} annotations")
        print(f"  Imbalance ratio: {imbalance_ratio:.1f}:1")

        if imbalance_ratio > 10:
            print("  >> Warning: High class imbalance detected!")

    # Create ZIP file for Colab
    print(f"\nCreating ZIP file for Colab upload...")
    zip_filename = 'yolo_dataset_clean_final.zip'

    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(clean_dir):
            for file in files:
                file_path = Path(root) / file
                arcname = file_path.relative_to(clean_dir.parent)
                zipf.write(file_path, arcname)

    # Check ZIP file size
    zip_size = os.path.getsize(zip_filename) / (1024 * 1024)  # MB
    print(f"\n" + "="*80)
    print(f"SUCCESS: Created {zip_filename} ({zip_size:.1f} MB)")
    print(f"Dataset is ready for upload to Google Drive!")
    print("="*80)

    print("\nNEXT STEPS:")
    print("1. Upload yolo_dataset_clean_final.zip to Google Drive")
    print("2. In Colab, extract with:")
    print("   !unzip /content/drive/MyDrive/yolo_dataset_clean_final.zip -d /content/dataset")
    print("3. Train with:")
    print("   model.train(data='/content/dataset/yolo_dataset_clean_final/data.yaml', ...)")

if __name__ == "__main__":
    create_final_clean_dataset()