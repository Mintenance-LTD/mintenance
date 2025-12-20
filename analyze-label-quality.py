#!/usr/bin/env python3
"""
Analyze YOLO Dataset Label Quality
===================================
This script checks the quality of annotations in the cleaned dataset.
"""

import os
from pathlib import Path
import yaml
import random
from collections import defaultdict

def analyze_label_quality():
    """Analyze the quality of labels in the dataset."""

    DATASET_DIR = Path(r"C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean\yolo_dataset_merged_final")

    print("="*70)
    print(" LABEL QUALITY ANALYSIS")
    print("="*70)

    # Load data.yaml
    with open(DATASET_DIR / "data.yaml", 'r') as f:
        data = yaml.safe_load(f)

    class_names = data['names']
    print(f"Classes: {class_names}\n")

    # Statistics
    stats = {
        'empty_labels': [],
        'single_box_files': [],
        'multi_box_files': [],
        'suspicious_boxes': [],
        'class_distribution': defaultdict(int),
        'box_sizes': [],
        'files_per_class': defaultdict(list)
    }

    # Analyze all label files
    for split in ['train', 'val']:
        labels_dir = DATASET_DIR / split / 'labels'
        images_dir = DATASET_DIR / split / 'images'

        if not labels_dir.exists():
            continue

        print(f"Analyzing {split} set...")

        for label_file in labels_dir.glob('*.txt'):
            boxes = []

            with open(label_file, 'r') as f:
                lines = f.readlines()

            if not lines or all(not line.strip() for line in lines):
                stats['empty_labels'].append(label_file.name)
                continue

            for line_num, line in enumerate(lines, 1):
                if not line.strip():
                    continue

                parts = line.strip().split()
                if len(parts) >= 5:
                    class_id = int(parts[0])
                    x_center = float(parts[1])
                    y_center = float(parts[2])
                    width = float(parts[3])
                    height = float(parts[4])

                    boxes.append({
                        'class_id': class_id,
                        'x': x_center,
                        'y': y_center,
                        'w': width,
                        'h': height
                    })

                    # Track statistics
                    stats['class_distribution'][class_id] += 1
                    stats['box_sizes'].append(width * height)
                    stats['files_per_class'][class_id].append(label_file.name)

                    # Check for suspicious boxes
                    if width < 0.01 or height < 0.01:
                        stats['suspicious_boxes'].append(f"{label_file.name}: Tiny box ({width:.3f} x {height:.3f})")
                    elif width > 0.95 or height > 0.95:
                        stats['suspicious_boxes'].append(f"{label_file.name}: Huge box ({width:.3f} x {height:.3f})")
                    elif x_center < 0.05 or x_center > 0.95 or y_center < 0.05 or y_center > 0.95:
                        stats['suspicious_boxes'].append(f"{label_file.name}: Box near edge")

            if len(boxes) == 1:
                stats['single_box_files'].append(label_file.name)
            elif len(boxes) > 1:
                stats['multi_box_files'].append(label_file.name)

    # Print analysis results
    print("\n" + "="*70)
    print(" QUALITY ANALYSIS RESULTS")
    print("="*70)

    # Files analysis
    total_files = len(stats['empty_labels']) + len(stats['single_box_files']) + len(stats['multi_box_files'])
    print(f"\nFILE STATISTICS:")
    print(f"  Total label files: {total_files}")
    print(f"  Empty files: {len(stats['empty_labels'])} ({len(stats['empty_labels'])*100/total_files:.1f}%)")
    print(f"  Single-box files: {len(stats['single_box_files'])} ({len(stats['single_box_files'])*100/total_files:.1f}%)")
    print(f"  Multi-box files: {len(stats['multi_box_files'])} ({len(stats['multi_box_files'])*100/total_files:.1f}%)")

    # Class distribution
    print(f"\nCLASS DISTRIBUTION:")
    total_boxes = sum(stats['class_distribution'].values())
    for class_id in range(len(class_names)):
        count = stats['class_distribution'][class_id]
        percentage = (count / total_boxes * 100) if total_boxes > 0 else 0
        bar = "#" * int(percentage / 2)
        print(f"  {class_id:2d}. {class_names[class_id]:20s}: {count:5d} ({percentage:5.1f}%) {bar}")

    # Check for missing classes
    missing_classes = [class_names[i] for i in range(len(class_names)) if stats['class_distribution'][i] == 0]
    if missing_classes:
        print(f"\nWARNING: No annotations for classes: {', '.join(missing_classes)}")

    # Box size analysis
    if stats['box_sizes']:
        avg_box_size = sum(stats['box_sizes']) / len(stats['box_sizes'])
        min_box_size = min(stats['box_sizes'])
        max_box_size = max(stats['box_sizes'])

        print(f"\nBOX SIZE ANALYSIS:")
        print(f"  Average box area: {avg_box_size:.4f} (of image)")
        print(f"  Smallest box: {min_box_size:.6f}")
        print(f"  Largest box: {max_box_size:.6f}")

    # Suspicious boxes
    if stats['suspicious_boxes']:
        print(f"\nSUSPICIOUS ANNOTATIONS ({len(stats['suspicious_boxes'])} found):")
        for issue in stats['suspicious_boxes'][:10]:
            print(f"    • {issue}")
        if len(stats['suspicious_boxes']) > 10:
            print(f"    ... and {len(stats['suspicious_boxes']) - 10} more")

    # Sample some files to check
    print("\n" + "="*70)
    print(" SAMPLE FILE INSPECTION")
    print("="*70)

    # Check a few random files
    sample_files = random.sample(stats['single_box_files'][:100], min(5, len(stats['single_box_files'])))

    for filename in sample_files:
        # Find the full path
        for split in ['train', 'val']:
            label_path = DATASET_DIR / split / 'labels' / filename
            if label_path.exists():
                with open(label_path, 'r') as f:
                    line = f.readline().strip()
                parts = line.split()
                if len(parts) >= 5:
                    class_id = int(parts[0])
                    print(f"\n  {filename}:")
                    print(f"    Class: {class_names[class_id]}")
                    print(f"    Box: x={float(parts[1]):.3f}, y={float(parts[2]):.3f}, w={float(parts[3]):.3f}, h={float(parts[4]):.3f}")
                break

    # Recommendations
    print("\n" + "="*70)
    print(" RECOMMENDATIONS")
    print("="*70)

    quality_issues = []

    if len(stats['empty_labels']) > 0:
        quality_issues.append(f"- {len(stats['empty_labels'])} empty label files (should be removed)")

    if len(stats['suspicious_boxes']) > 100:
        quality_issues.append(f"- {len(stats['suspicious_boxes'])} suspicious boxes detected")

    # Check class imbalance
    if total_boxes > 0:
        class_counts = [stats['class_distribution'][i] for i in range(len(class_names))]
        non_zero = [c for c in class_counts if c > 0]
        if non_zero:
            imbalance = max(non_zero) / (min(non_zero) + 1)
            if imbalance > 10:
                quality_issues.append(f"- Severe class imbalance (ratio {imbalance:.1f}:1)")

    # Check if most files have only 1 box
    single_box_ratio = len(stats['single_box_files']) / total_files if total_files > 0 else 0
    if single_box_ratio > 0.8:
        quality_issues.append(f"- {single_box_ratio*100:.1f}% of images have only 1 annotation (may be under-labeled)")

    if quality_issues:
        print("\nQUALITY CONCERNS:")
        for issue in quality_issues:
            print(issue)
    else:
        print("\nDataset quality looks good!")

    # Final verdict
    print("\n" + "="*70)
    print(" LABELING QUALITY VERDICT")
    print("="*70)

    if len(quality_issues) == 0:
        print("EXCELLENT: Labels appear well-annotated")
    elif len(quality_issues) <= 2:
        print("GOOD: Minor quality issues, but usable for training")
    elif len(quality_issues) <= 4:
        print("FAIR: Several quality issues that may affect model performance")
    else:
        print("POOR: Significant labeling issues detected")

    return stats

if __name__ == "__main__":
    print(">> YOLO Dataset Label Quality Analyzer")
    print("   Checking annotation quality...\n")

    stats = analyze_label_quality()

    print("\n>> Analysis complete!")