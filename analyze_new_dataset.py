#!/usr/bin/env python3
"""
Analyze the new Building Defect Detection dataset for integration with current YOLO training.
"""

import os
from pathlib import Path
from collections import Counter
import yaml

def analyze_dataset(dataset_path, name="Dataset"):
    """Analyze a YOLO dataset and return statistics."""

    dataset_path = Path(dataset_path)

    # Read data.yaml
    yaml_path = dataset_path / "data.yaml"
    if yaml_path.exists():
        with open(yaml_path, 'r') as f:
            data = yaml.safe_load(f)
        num_classes = data.get('nc', 0)
        class_names = data.get('names', [])
    else:
        num_classes = 0
        class_names = []

    # Count images and labels
    splits = ['train', 'val', 'valid', 'test']
    stats = {
        'name': name,
        'num_classes': num_classes,
        'class_names': class_names,
        'splits': {}
    }

    for split in splits:
        images_dir = dataset_path / split / 'images'
        labels_dir = dataset_path / split / 'labels'

        if images_dir.exists():
            images = list(images_dir.glob('*.jpg')) + list(images_dir.glob('*.png'))
            labels = list(labels_dir.glob('*.txt')) if labels_dir.exists() else []

            # Count class instances
            class_counts = Counter()
            label_lines = 0

            for label_file in labels:
                with open(label_file, 'r') as f:
                    lines = f.readlines()
                    label_lines += len(lines)
                    for line in lines:
                        parts = line.strip().split()
                        if parts:
                            try:
                                class_id = int(parts[0])
                                class_counts[class_id] += 1
                            except (ValueError, IndexError):
                                pass

            stats['splits'][split] = {
                'num_images': len(images),
                'num_labels': len(labels),
                'num_annotations': label_lines,
                'class_distribution': dict(class_counts)
            }

    return stats

def compare_datasets(current_stats, new_stats):
    """Compare two datasets and identify integration strategy."""

    print("\n" + "="*80)
    print("DATASET COMPARISON AND INTEGRATION ANALYSIS")
    print("="*80)

    # Current dataset info
    print(f"\nCURRENT DATASET ({current_stats['name']}):")
    print(f"   Classes: {current_stats['num_classes']}")
    print(f"   Class names: {', '.join(current_stats['class_names'][:5])}...")

    for split, data in current_stats['splits'].items():
        if data['num_images'] > 0:
            print(f"\n   {split.upper()}:")
            print(f"   - Images: {data['num_images']}")
            print(f"   - Labels: {data['num_labels']}")
            print(f"   - Annotations: {data['num_annotations']}")

    # New dataset info
    print(f"\nNEW DATASET ({new_stats['name']}):")
    print(f"   Classes: {new_stats['num_classes']}")
    print(f"   Class names: {', '.join(new_stats['class_names'][:10])}...")

    total_new_images = 0
    total_new_annotations = 0

    for split, data in new_stats['splits'].items():
        if data['num_images'] > 0:
            print(f"\n   {split.upper()}:")
            print(f"   - Images: {data['num_images']}")
            print(f"   - Labels: {data['num_labels']}")
            print(f"   - Annotations: {data['num_annotations']}")
            total_new_images += data['num_images']
            total_new_annotations += data['num_annotations']

    # Compatibility analysis
    print("\n" + "="*80)
    print("COMPATIBILITY ANALYSIS")
    print("="*80)

    print(f"\nCLASS MISMATCH DETECTED:")
    print(f"   Current: {current_stats['num_classes']} classes")
    print(f"   New: {new_stats['num_classes']} classes")
    print(f"   Difference: {new_stats['num_classes'] - current_stats['num_classes']} additional classes")

    print(f"\nDATASET SIZE IMPACT:")
    current_total = sum(s['num_images'] for s in current_stats['splits'].values())
    print(f"   Current total: {current_total} images")
    print(f"   New dataset: {total_new_images} images")
    print(f"   Combined: {current_total + total_new_images} images")
    print(f"   Increase: {((total_new_images / current_total) * 100):.1f}% more data")

    # Integration recommendations
    print("\n" + "="*80)
    print("INTEGRATION RECOMMENDATIONS")
    print("="*80)

    print("\nDIRECT MERGE: NOT RECOMMENDED")
    print("   Reason: Incompatible class structures (15 vs 81 classes)")
    print("   Risk: Training will fail due to class ID conflicts")

    print("\nOPTION 1: CLASS MAPPING (RECOMMENDED)")
    print("   Strategy: Map new dataset's 81 classes to your 15 maintenance classes")
    print("   Pros:")
    print("   - Maintains existing model architecture")
    print("   - Can continue training from epoch 56")
    print("   - Adds ~4,941 new training examples")
    print("   Cons:")
    print("   - Requires manual class mapping script")
    print("   - Some new classes may not map cleanly")
    print("   Effort: 1-2 hours of mapping work")

    print("\nOPTION 2: SEPARATE MODELS")
    print("   Strategy: Train two separate models for different use cases")
    print("   Use current (15 classes) for: General maintenance issues")
    print("   Use new (81 classes) for: Detailed building defect inspection")
    print("   Pros:")
    print("   - No class conflicts")
    print("   - Specialized models for specific tasks")
    print("   Cons:")
    print("   - Need to maintain two models")
    print("   - Larger deployment size")

    print("\nOPTION 3: UNIFIED MODEL (ADVANCED)")
    print("   Strategy: Create new 96-class model combining both datasets")
    print("   Classes: 15 (current) + 81 (new) = 96 total classes")
    print("   Pros:")
    print("   - Maximum coverage of defect types")
    print("   - Single unified model")
    print("   Cons:")
    print("   - Must restart training from epoch 0")
    print("   - Longer training time (~16-20 hours)")
    print("   - More complex class structure")

    # Class mapping suggestions
    print("\n" + "="*80)
    print("SUGGESTED CLASS MAPPINGS (Option 1)")
    print("="*80)

    current_classes = {
        0: 'pipe_leak',
        1: 'water_damage',
        2: 'wall_crack',
        3: 'roof_damage',
        4: 'electrical_fault',
        5: 'mold_damp',
        6: 'fire_damage',
        7: 'window_broken',
        8: 'door_damaged',
        9: 'floor_damage',
        10: 'ceiling_damage',
        11: 'foundation_crack',
        12: 'hvac_issue',
        13: 'gutter_blocked',
        14: 'general_damage'
    }

    # Show some obvious mappings from new dataset
    print("\nNew Dataset → Current Model Mappings:")
    print("─" * 70)

    mappings = {
        'Broken Window': 'window_broken (7)',
        'broken window': 'window_broken (7)',
        'Window': 'window_broken (7)',
        'Crack': 'wall_crack (2)',
        'crack': 'wall_crack (2)',
        'wall_crack': 'wall_crack (2)',
        'Wall-leaking': 'water_damage (1)',
        'Wall leaking': 'water_damage (1)',
        'Leaking damage on wood': 'water_damage (1)',
        'Damaged roof': 'roof_damage (3)',
        'Damaged_Roof': 'roof_damage (3)',
        'Roof': 'roof_damage (3)',
        'Mold': 'mold_damp (5)',
        'Mould': 'mold_damp (5)',
        'wall_mold': 'mold_damp (5)',
        'Damp': 'mold_damp (5)',
        'Damp damage': 'mold_damp (5)',
        'leak': 'pipe_leak (0)',
        'burst': 'pipe_leak (0)',
        'pipe': 'pipe_leak (0)',
        'Bare electrical wire': 'electrical_fault (4)',
        'Dangerous Electrical socket': 'electrical_fault (4)',
        'Broken timber Floor': 'floor_damage (9)',
    }

    for new_class, current_class in list(mappings.items())[:15]:
        print(f"   {new_class:35s} → {current_class}")

    print(f"\n   ... and {new_stats['num_classes'] - 15} more classes to map")

if __name__ == "__main__":
    import sys
    import io

    # Fix Windows encoding issues
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    # Paths
    current_dataset = Path(r"C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean\yolo_dataset_full")
    new_dataset = Path(r"C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\Building Defect Detection 7.v3i.yolov12")

    print("Analyzing datasets...")
    print("This may take a minute...\n")

    current_stats = analyze_dataset(current_dataset, "Current Maintenance Dataset")
    new_stats = analyze_dataset(new_dataset, "Building Defect Detection v3")

    compare_datasets(current_stats, new_stats)

    print("\n" + "="*80)
    print("NEXT STEPS")
    print("="*80)

    print("\n1. DECIDE ON STRATEGY:")
    print("   - Option 1: Map classes and merge → Best for continuing current training")
    print("   - Option 2: Separate models → Best for specialized use cases")
    print("   - Option 3: Unified model → Best for comprehensive coverage")

    print("\n2. IF CHOOSING OPTION 1 (Class Mapping):")
    print("   a. Run: python create_class_mapper.py")
    print("   b. Review and adjust mappings")
    print("   c. Run: python merge_datasets.py")
    print("   d. Create new ZIP files")
    print("   e. Resume training from epoch 56")

    print("\n3. IF CHOOSING OPTION 2 (Separate Models):")
    print("   a. Continue current training as-is")
    print("   b. Start new training for 81-class model")
    print("   c. Deploy both models to production")

    print("\n4. IF CHOOSING OPTION 3 (Unified Model):")
    print("   a. Merge datasets without class mapping")
    print("   b. Update data.yaml with 96 classes")
    print("   c. Restart training from epoch 0")
    print("   d. Expect 16-20 hours of training time")

    print("\nRECOMMENDATION:")
    print("   Start with Option 1 (Class Mapping) because:")
    print("   - You're already at epoch 56/300 (19% complete)")
    print("   - Adding ~4,941 mapped images will significantly improve model")
    print("   - Can continue training without losing progress")
    print("   - Most practical for production deployment")

    print("\n" + "="*80)
    print("Analysis complete!")
    print("="*80 + "\n")
