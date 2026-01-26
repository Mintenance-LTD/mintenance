"""
Analyze yolo_dataset_merged_final dataset
"""

import sys
from pathlib import Path
import yaml
import json

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def analyze_dataset():
    """Analyze the merged dataset."""
    dataset_dir = Path("yolo_dataset_merged_final")
    
    print("=" * 70)
    print("YOLO DATASET MERGED FINAL - ANALYSIS")
    print("=" * 70)
    print()
    
    # Load data.yaml
    data_yaml_path = dataset_dir / "data.yaml"
    if data_yaml_path.exists():
        with open(data_yaml_path, 'r') as f:
            data = yaml.safe_load(f)
        
        print("📋 Dataset Configuration")
        print("-" * 70)
        print(f"Classes: {data['nc']}")
        print(f"Train path: {data['train']}")
        print(f"Val path: {data['val']}")
        print(f"Test path: {data['test']}")
        print()
        print("Class Names:")
        for i, name in enumerate(data['names']):
            print(f"  {i:2d}: {name}")
        print()
    
    # Count files
    splits = ['train', 'val', 'test']
    file_counts = {}
    
    for split in splits:
        images_dir = dataset_dir / split / "images"
        labels_dir = dataset_dir / split / "labels"
        
        if images_dir.exists():
            image_count = len(list(images_dir.glob("*.jpg")))
            label_count = len(list(labels_dir.glob("*.txt"))) if labels_dir.exists() else 0
            file_counts[split] = {
                'images': image_count,
                'labels': label_count
            }
    
    print("📊 File Counts")
    print("-" * 70)
    total_images = 0
    total_labels = 0
    
    for split in splits:
        if split in file_counts:
            counts = file_counts[split]
            total_images += counts['images']
            total_labels += counts['labels']
            print(f"{split.capitalize():12s}: {counts['images']:5d} images, {counts['labels']:5d} labels")
    
    print(f"{'Total':12s}: {total_images:5d} images, {total_labels:5d} labels")
    print()
    
    # Load merge stats
    merge_stats_path = dataset_dir / "merge_stats.json"
    if merge_stats_path.exists():
        with open(merge_stats_path, 'r') as f:
            merge_stats = json.load(f)
        
        print("📈 Expected Statistics (from merge_stats.json)")
        print("-" * 70)
        stats = merge_stats['stats']
        print(f"Train: {stats['train']['images']:5d} images")
        print(f"Val:   {stats['val']['images']:5d} images")
        print(f"Test:  {stats['test']['images']:5d} images")
        print(f"Total: {merge_stats['total_images']:5d} images")
        print()
        
        print("📦 Sources")
        print("-" * 70)
        for source, name in merge_stats['sources'].items():
            print(f"  {source}: {name}")
        print()
    
    # Check for mismatches
    print("🔍 Validation")
    print("-" * 70)
    mismatches = []
    for split in splits:
        if split in file_counts:
            counts = file_counts[split]
            if counts['images'] != counts['labels']:
                mismatches.append(f"{split}: {counts['images']} images vs {counts['labels']} labels")
    
    if mismatches:
        print("⚠️  Mismatches found:")
        for mismatch in mismatches:
            print(f"  - {mismatch}")
    else:
        print("✅ All images have corresponding labels")
    print()
    
    # Sample label analysis
    print("📝 Sample Label Analysis")
    print("-" * 70)
    train_labels_dir = dataset_dir / "train" / "labels"
    if train_labels_dir.exists():
        sample_files = list(train_labels_dir.glob("*.txt"))[:5]
        class_counts = {}
        
        for label_file in sample_files:
            with open(label_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        parts = line.split()
                        if len(parts) >= 5:
                            class_id = int(parts[0])
                            class_counts[class_id] = class_counts.get(class_id, 0) + 1
        
        print(f"Sample from {len(sample_files)} label files:")
        for class_id in sorted(class_counts.keys()):
            count = class_counts[class_id]
            class_name = data['names'][class_id] if class_id < len(data['names']) else f"unknown_{class_id}"
            print(f"  Class {class_id} ({class_name}): {count} detections")
    print()
    
    print("=" * 70)
    print("✅ Analysis complete!")
    print("=" * 70)

if __name__ == "__main__":
    analyze_dataset()
