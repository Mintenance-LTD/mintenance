"""
Analyze class distribution in yolo_dataset_merged_final dataset
Shows how many images/annotations per class
"""

import sys
from pathlib import Path
import yaml
from collections import defaultdict

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def analyze_class_distribution():
    """Analyze class distribution across train/val/test splits."""
    
    dataset_dir = Path("yolo_dataset_merged_final")
    data_yaml_path = dataset_dir / "data.yaml"
    
    # Load class names
    with open(data_yaml_path, 'r') as f:
        data = yaml.safe_load(f)
    
    class_names = data['names']
    num_classes = data['nc']
    
    print("=" * 70)
    print(" CLASS DISTRIBUTION ANALYSIS")
    print("=" * 70)
    print()
    
    # Count annotations per class
    class_counts = defaultdict(int)
    images_with_class = defaultdict(set)  # Track which images have each class
    
    splits = ['train', 'val', 'test']
    
    for split in splits:
        labels_dir = dataset_dir / split / 'labels'
        images_dir = dataset_dir / split / 'images'
        
        if not labels_dir.exists():
            continue
        
        print(f"📊 Analyzing {split} split...")
        
        for label_file in labels_dir.glob('*.txt'):
            image_name = label_file.stem
            image_path = images_dir / f"{image_name}.jpg"
            
            if not image_path.exists():
                continue
            
            with open(label_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    parts = line.split()
                    if len(parts) < 5:
                        continue
                    
                    try:
                        class_id = int(parts[0])
                        
                        # Only count valid class IDs (0-14)
                        if 0 <= class_id < num_classes:
                            class_counts[class_id] += 1
                            images_with_class[class_id].add(image_path)
                    except ValueError:
                        continue
        
        print(f"   Processed {len(list(labels_dir.glob('*.txt')))} label files")
    
    print()
    print("=" * 70)
    print(" CLASS DISTRIBUTION SUMMARY")
    print("=" * 70)
    print()
    
    # Calculate totals
    total_annotations = sum(class_counts.values())
    total_images = sum(len(images) for images in images_with_class.values())
    
    print(f"Total annotations: {total_annotations:,}")
    print(f"Total unique images with annotations: {total_images:,}")
    print()
    
    # Sort by count
    sorted_classes = sorted(class_counts.items(), key=lambda x: x[1], reverse=True)
    
    print(f"{'Class ID':<10} {'Class Name':<25} {'Annotations':<15} {'Images':<15} {'Status'}")
    print("-" * 70)
    
    # Recommended minimums
    MIN_ANNOTATIONS_PER_CLASS = 200  # Minimum for decent performance
    IDEAL_ANNOTATIONS_PER_CLASS = 500  # Ideal for good performance
    
    for class_id, count in sorted_classes:
        class_name = class_names[class_id] if class_id < len(class_names) else f"unknown_{class_id}"
        image_count = len(images_with_class[class_id])
        
        # Determine status
        if count >= IDEAL_ANNOTATIONS_PER_CLASS:
            status = "✅ Good"
        elif count >= MIN_ANNOTATIONS_PER_CLASS:
            status = "⚠️  Low"
        else:
            status = "❌ Very Low"
        
        print(f"{class_id:<10} {class_name:<25} {count:<15,} {image_count:<15,} {status}")
    
    print()
    print("=" * 70)
    print(" RECOMMENDATIONS")
    print("=" * 70)
    print()
    
    # Identify problematic classes
    low_classes = [cid for cid, count in class_counts.items() if count < MIN_ANNOTATIONS_PER_CLASS]
    very_low_classes = [cid for cid, count in class_counts.items() if count < 100]
    
    if very_low_classes:
        print("❌ Classes with VERY LOW annotations (< 100):")
        for cid in very_low_classes:
            name = class_names[cid] if cid < len(class_names) else f"unknown_{cid}"
            print(f"   - {name} (class {cid}): {class_counts[cid]} annotations")
        print()
        print("   These classes will have poor detection performance!")
        print("   Need to collect more training data for these classes.")
        print()
    
    if low_classes:
        print("⚠️  Classes with LOW annotations (< 200):")
        for cid in low_classes:
            if cid not in very_low_classes:
                name = class_names[cid] if cid < len(class_names) else f"unknown_{cid}"
                print(f"   - {name} (class {cid}): {class_counts[cid]} annotations")
        print()
    
    # Overall assessment
    avg_annotations = total_annotations / num_classes
    print(f"📊 Overall Statistics:")
    print(f"   Average annotations per class: {avg_annotations:.0f}")
    print(f"   Recommended minimum: {MIN_ANNOTATIONS_PER_CLASS} per class")
    print(f"   Ideal: {IDEAL_ANNOTATIONS_PER_CLASS} per class")
    print()
    
    if avg_annotations >= IDEAL_ANNOTATIONS_PER_CLASS:
        print("✅ Dataset size is GOOD for training!")
    elif avg_annotations >= MIN_ANNOTATIONS_PER_CLASS:
        print("⚠️  Dataset size is ACCEPTABLE but could be better")
        print("   Consider collecting more data for low-performing classes")
    else:
        print("❌ Dataset size is TOO SMALL")
        print("   Need to collect significantly more training data")
    
    print()
    print("=" * 70)
    print(" DATASET SIZE ASSESSMENT")
    print("=" * 70)
    print()
    
    total_images_count = 0
    for split in splits:
        images_dir = dataset_dir / split / 'images'
        if images_dir.exists():
            count = len(list(images_dir.glob('*.jpg')))
            total_images_count += count
            print(f"{split.capitalize():12s}: {count:>5,} images")
    
    print(f"{'Total':12s}: {total_images_count:>5,} images")
    print()
    
    # Context for YOLO training
    print("📚 Context for YOLO Object Detection:")
    print("   - Small dataset: 100-1,000 images")
    print("   - Medium dataset: 1,000-5,000 images")
    print("   - Large dataset: 5,000-10,000+ images")
    print()
    print(f"   Your dataset: {total_images_count:,} images = {'Medium' if 1000 <= total_images_count < 5000 else 'Large' if total_images_count >= 5000 else 'Small'} dataset")
    print()
    print("   However, with 15 classes:")
    print(f"   - Average: {total_images_count / num_classes:.0f} images per class")
    print(f"   - Ideal: 200-500 images per class minimum")
    print()
    
    if very_low_classes:
        print("💡 Recommendation:")
        print("   1. Fix invalid class IDs (Step 4.6) - this will help")
        print("   2. Collect more data for very low classes")
        print("   3. Use data augmentation (already in training config)")
        print("   4. Consider class weighting during training")
    else:
        print("💡 Recommendation:")
        print("   1. Fix invalid class IDs (Step 4.6) - critical!")
        print("   2. Use improved training config (already done)")
        print("   3. More data would help but current size is workable")

if __name__ == "__main__":
    analyze_class_distribution()
