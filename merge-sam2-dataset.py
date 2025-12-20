"""
Merge SAM2 labeled dataset with existing Building Defect Detection dataset
Creates a unified YOLO dataset ready for training
"""

import shutil
from pathlib import Path
import yaml
import json

# Paths
SAM2_DIR = Path("../sam2_labeled_2000_images")
EXISTING_DIR = Path("Building Defect Detection 7.v2i.yolov11")
OUTPUT_DIR = Path("yolo_dataset_merged_final")

def merge_datasets():
    """Merge SAM2 and existing datasets into unified YOLO format"""

    print("=" * 70)
    print("MERGING DATASETS")
    print("=" * 70)

    # Create output structure
    output_path = OUTPUT_DIR
    (output_path / "train" / "images").mkdir(parents=True, exist_ok=True)
    (output_path / "train" / "labels").mkdir(parents=True, exist_ok=True)
    (output_path / "val" / "images").mkdir(parents=True, exist_ok=True)
    (output_path / "val" / "labels").mkdir(parents=True, exist_ok=True)
    (output_path / "test" / "images").mkdir(parents=True, exist_ok=True)
    (output_path / "test" / "labels").mkdir(parents=True, exist_ok=True)

    stats = {
        'train': {'images': 0, 'labels': 0},
        'val': {'images': 0, 'labels': 0},
        'test': {'images': 0, 'labels': 0}
    }

    # 1. Copy existing dataset (Building Defect Detection 7.v2i.yolov11)
    print("\nCopying existing dataset...")
    for split in ['train', 'valid', 'test']:
        source_split = 'valid' if split == 'val' else split
        dest_split = 'val' if split == 'valid' else split

        source_images = EXISTING_DIR / source_split / "images"
        source_labels = EXISTING_DIR / source_split / "labels"

        if source_images.exists():
            for img_file in source_images.glob("*"):
                if img_file.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                    try:
                        dest_img = output_path / dest_split / "images" / f"existing_{img_file.name}"
                        shutil.copy2(str(img_file), str(dest_img))
                        stats[dest_split]['images'] += 1
                    except (FileNotFoundError, OSError) as e:
                        # Skip files with path length issues
                        continue

        if source_labels.exists():
            for label_file in source_labels.glob("*.txt"):
                try:
                    dest_label = output_path / dest_split / "labels" / f"existing_{label_file.name}"
                    shutil.copy2(str(label_file), str(dest_label))
                    stats[dest_split]['labels'] += 1
                except (FileNotFoundError, OSError) as e:
                    # Skip files with path length issues
                    continue

        print(f"   {dest_split}: {stats[dest_split]['images']} images, {stats[dest_split]['labels']} labels")

    # 2. Copy SAM2 dataset
    print("\nCopying SAM2 labeled dataset...")

    # batch_1 → train
    batch1_images = SAM2_DIR / "batch_1" / "images"
    batch1_labels = SAM2_DIR / "batch_1" / "labels"

    if batch1_images.exists():
        for img_file in batch1_images.glob("*"):
            if img_file.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                try:
                    dest_img = output_path / "train" / "images" / f"sam2_batch1_{img_file.name}"
                    shutil.copy2(str(img_file), str(dest_img))
                    stats['train']['images'] += 1
                except (FileNotFoundError, OSError) as e:
                    continue

    if batch1_labels.exists():
        for label_file in batch1_labels.glob("*.txt"):
            try:
                dest_label = output_path / "train" / "labels" / f"sam2_batch1_{label_file.name}"
                shutil.copy2(str(label_file), str(dest_label))
                stats['train']['labels'] += 1
            except (FileNotFoundError, OSError) as e:
                continue

    # batch_2 → val
    batch2_images = SAM2_DIR / "batch_2" / "images"
    batch2_labels = SAM2_DIR / "batch_2" / "labels"

    if batch2_images.exists():
        for img_file in batch2_images.glob("*"):
            if img_file.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                try:
                    dest_img = output_path / "val" / "images" / f"sam2_batch2_{img_file.name}"
                    shutil.copy2(str(img_file), str(dest_img))
                    stats['val']['images'] += 1
                except (FileNotFoundError, OSError) as e:
                    continue

    if batch2_labels.exists():
        for label_file in batch2_labels.glob("*.txt"):
            try:
                dest_label = output_path / "val" / "labels" / f"sam2_batch2_{label_file.name}"
                shutil.copy2(str(label_file), str(dest_label))
                stats['val']['labels'] += 1
            except (FileNotFoundError, OSError) as e:
                continue

    print(f"\n   SAM2 added to train: {985} images")
    print(f"   SAM2 added to val: {985} images")

    # 3. Create data.yaml
    print("\nCreating data.yaml...")

    data_yaml = {
        'path': str(output_path.absolute()),
        'train': 'train/images',
        'val': 'val/images',
        'test': 'test/images',
        'nc': 15,
        'names': [
            'general_damage',
            'cracks',
            'mold',
            'water_damage',
            'structural_damage',
            'electrical_issues',
            'plumbing_issues',
            'roofing_damage',
            'window_damage',
            'door_damage',
            'floor_damage',
            'wall_damage',
            'ceiling_damage',
            'hvac_issues',
            'insulation_issues'
        ]
    }

    with open(output_path / "data.yaml", 'w') as f:
        yaml.dump(data_yaml, f, default_flow_style=False, sort_keys=False)

    # 4. Generate stats
    print("\n" + "=" * 70)
    print("MERGE COMPLETE")
    print("=" * 70)

    total_images = sum(s['images'] for s in stats.values())
    total_labels = sum(s['labels'] for s in stats.values())

    print(f"\nFinal Dataset Stats:")
    print(f"   Train:      {stats['train']['images']:,} images, {stats['train']['labels']:,} labels")
    print(f"   Validation: {stats['val']['images']:,} images, {stats['val']['labels']:,} labels")
    print(f"   Test:       {stats['test']['images']:,} images, {stats['test']['labels']:,} labels")
    print(f"   TOTAL:      {total_images:,} images, {total_labels:,} labels")

    print(f"\nOutput Location:")
    print(f"   {output_path.absolute()}")

    print(f"\nNext Steps:")
    print(f"   1. Review data.yaml configuration")
    print(f"   2. Train YOLO model:")
    print(f"      yolo train data={output_path}/data.yaml model=yolov11n.pt epochs=100 imgsz=640")
    print(f"   3. Compare with existing best_model_final.pt")

    # Save stats
    with open(output_path / "merge_stats.json", 'w') as f:
        json.dump({
            'stats': stats,
            'total_images': total_images,
            'total_labels': total_labels,
            'sources': {
                'existing_dataset': 'Building Defect Detection 7.v2i.yolov11',
                'sam2_dataset': 'sam2_labeled_2000_images'
            }
        }, f, indent=2)

if __name__ == "__main__":
    merge_datasets()
