#!/usr/bin/env python3
"""
Analyze SAM2 label files to understand quality issues and empty labels
"""

import os
from pathlib import Path
from collections import defaultdict
import json

def analyze_sam2_labels():
    dataset_path = Path("yolo_dataset_merged_final")

    stats = {
        'sam2_files': {
            'total': 0,
            'empty': 0,
            'single_box': 0,
            'multi_box': 0,
            'by_source': defaultdict(int),
            'classes_used': defaultdict(int),
            'avg_boxes': 0,
            'total_annotations': 0
        },
        'non_sam2_files': {
            'total': 0,
            'empty': 0,
            'single_box': 0,
            'multi_box': 0,
            'by_source': defaultdict(int),
            'classes_used': defaultdict(int),
            'avg_boxes': 0,
            'total_annotations': 0
        }
    }

    # Class names for reference
    class_names = [
        'general_damage', 'cracks', 'mold', 'water_damage', 'structural_damage',
        'electrical_issues', 'plumbing_issues', 'roofing_damage', 'window_damage',
        'door_damage', 'floor_damage', 'wall_damage', 'ceiling_damage',
        'hvac_issues', 'insulation_issues'
    ]

    # Process all label files
    for split in ['train', 'val']:
        labels_dir = dataset_path / split / 'labels'
        if not labels_dir.exists():
            continue

        for label_file in labels_dir.glob('*.txt'):
            filename = label_file.name
            is_sam2 = filename.startswith('sam2_batch')

            # Determine which stats to update
            current_stats = stats['sam2_files'] if is_sam2 else stats['non_sam2_files']
            current_stats['total'] += 1

            # Identify source from filename
            if is_sam2:
                # Extract source from sam2 filename pattern
                parts = filename.split('_')
                if 'Building_Defect_Detection' in filename:
                    source = 'Building_Defect_Detection'
                elif 'yolo_dataset_full' in filename:
                    source = 'yolo_dataset_full'
                elif 'yolo_dataset_v3' in filename:
                    source = 'yolo_dataset_v3'
                else:
                    source = 'sam2_other'
            else:
                # Non-SAM2 sources
                if 'Building_Defect_Detection' in filename:
                    source = 'Building_Defect_Detection'
                elif 'yolo_dataset_full' in filename:
                    source = 'yolo_dataset_full'
                elif 'yolo_dataset_v3' in filename:
                    source = 'yolo_dataset_v3'
                else:
                    source = 'other'

            current_stats['by_source'][source] += 1

            # Read and analyze label content
            try:
                with open(label_file, 'r') as f:
                    lines = f.readlines()

                # Count valid annotations
                valid_annotations = 0
                for line in lines:
                    parts = line.strip().split()
                    if len(parts) == 5:  # Valid YOLO format
                        try:
                            class_id = int(parts[0])
                            if 0 <= class_id <= 14:
                                current_stats['classes_used'][class_id] += 1
                                valid_annotations += 1
                        except:
                            pass

                # Categorize by annotation count
                if valid_annotations == 0:
                    current_stats['empty'] += 1
                elif valid_annotations == 1:
                    current_stats['single_box'] += 1
                else:
                    current_stats['multi_box'] += 1

                current_stats['total_annotations'] += valid_annotations

            except Exception as e:
                print(f"Error reading {label_file}: {e}")

    # Calculate averages
    for key in ['sam2_files', 'non_sam2_files']:
        if stats[key]['total'] > 0:
            stats[key]['avg_boxes'] = stats[key]['total_annotations'] / stats[key]['total']

    # Print detailed analysis
    print("\n" + "="*80)
    print("SAM2 LABEL ANALYSIS REPORT")
    print("="*80)

    # SAM2 Files Analysis
    sam2 = stats['sam2_files']
    print(f"\nSAM2 LABELED FILES ({sam2['total']} files):")
    print("-" * 40)
    print(f"  Empty files: {sam2['empty']} ({sam2['empty']/max(1,sam2['total'])*100:.1f}%)")
    print(f"  Single-box files: {sam2['single_box']} ({sam2['single_box']/max(1,sam2['total'])*100:.1f}%)")
    print(f"  Multi-box files: {sam2['multi_box']} ({sam2['multi_box']/max(1,sam2['total'])*100:.1f}%)")
    print(f"  Average boxes per file: {sam2['avg_boxes']:.2f}")
    print(f"  Total annotations: {sam2['total_annotations']}")

    print("\n  Sources:")
    for source, count in sorted(sam2['by_source'].items(), key=lambda x: x[1], reverse=True):
        print(f"    - {source}: {count} files")

    print("\n  Class distribution (SAM2):")
    for class_id in range(15):
        count = sam2['classes_used'][class_id]
        if count > 0:
            print(f"    {class_id:2d} ({class_names[class_id]:20s}): {count:5d} annotations")

    # Non-SAM2 Files Analysis
    non_sam2 = stats['non_sam2_files']
    print(f"\nNON-SAM2 LABELED FILES ({non_sam2['total']} files):")
    print("-" * 40)
    print(f"  Empty files: {non_sam2['empty']} ({non_sam2['empty']/max(1,non_sam2['total'])*100:.1f}%)")
    print(f"  Single-box files: {non_sam2['single_box']} ({non_sam2['single_box']/max(1,non_sam2['total'])*100:.1f}%)")
    print(f"  Multi-box files: {non_sam2['multi_box']} ({non_sam2['multi_box']/max(1,non_sam2['total'])*100:.1f}%)")
    print(f"  Average boxes per file: {non_sam2['avg_boxes']:.2f}")
    print(f"  Total annotations: {non_sam2['total_annotations']}")

    print("\n  Sources:")
    for source, count in sorted(non_sam2['by_source'].items(), key=lambda x: x[1], reverse=True):
        print(f"    - {source}: {count} files")

    print("\n  Class distribution (Non-SAM2):")
    for class_id in range(15):
        count = non_sam2['classes_used'][class_id]
        if count > 0:
            print(f"    {class_id:2d} ({class_names[class_id]:20s}): {count:5d} annotations")

    # Comparison Analysis
    print("\n" + "="*80)
    print("COMPARISON: SAM2 vs NON-SAM2")
    print("="*80)

    if sam2['total'] > 0 and non_sam2['total'] > 0:
        print(f"\nEmpty Rate:")
        print(f"  SAM2:     {sam2['empty']/sam2['total']*100:.1f}%")
        print(f"  Non-SAM2: {non_sam2['empty']/non_sam2['total']*100:.1f}%")

        print(f"\nAverage Annotations per File:")
        print(f"  SAM2:     {sam2['avg_boxes']:.2f}")
        print(f"  Non-SAM2: {non_sam2['avg_boxes']:.2f}")

        print(f"\nTotal Annotations:")
        print(f"  SAM2:     {sam2['total_annotations']:,}")
        print(f"  Non-SAM2: {non_sam2['total_annotations']:,}")

    # Identify problematic patterns
    print("\n" + "="*80)
    print("KEY FINDINGS")
    print("="*80)

    total_files = sam2['total'] + non_sam2['total']
    total_empty = sam2['empty'] + non_sam2['empty']

    print(f"\n1. Overall empty rate: {total_empty}/{total_files} ({total_empty/max(1,total_files)*100:.1f}%)")

    if sam2['total'] > 0:
        sam2_empty_rate = sam2['empty']/sam2['total']*100
        print(f"\n2. SAM2 files have {sam2_empty_rate:.1f}% empty rate")
        if sam2_empty_rate > 30:
            print("   >> HIGH EMPTY RATE: SAM2 annotation may have failed on many images")

    if non_sam2['total'] > 0:
        non_sam2_empty_rate = non_sam2['empty']/non_sam2['total']*100
        print(f"\n3. Non-SAM2 files have {non_sam2_empty_rate:.1f}% empty rate")

    # Check for specific source issues
    print("\n4. Problematic sources (high empty rates):")
    for source_type, source_stats in [('SAM2', sam2), ('Non-SAM2', non_sam2)]:
        for source, count in source_stats['by_source'].items():
            # Count empty files for this source
            empty_count = 0
            check_dir = Path("yolo_dataset_merged_final")
            for split in ['train', 'val']:
                labels_dir = check_dir / split / 'labels'
                if labels_dir.exists():
                    for f in labels_dir.glob('*.txt'):
                        if source in f.name:
                            if source_type == 'SAM2' and not f.name.startswith('sam2_batch'):
                                continue
                            if source_type == 'Non-SAM2' and f.name.startswith('sam2_batch'):
                                continue
                            try:
                                with open(f, 'r') as file:
                                    if not file.read().strip():
                                        empty_count += 1
                            except:
                                pass

            if count > 0:
                empty_rate = (empty_count / count) * 100
                if empty_rate > 40:
                    print(f"   - {source_type}/{source}: {empty_rate:.1f}% empty ({empty_count}/{count})")

    # Save detailed report
    report = {
        'sam2_stats': {
            'total': sam2['total'],
            'empty': sam2['empty'],
            'empty_rate': f"{sam2['empty']/max(1,sam2['total'])*100:.1f}%",
            'avg_boxes': sam2['avg_boxes'],
            'total_annotations': sam2['total_annotations'],
            'sources': dict(sam2['by_source']),
            'classes': {class_names[i]: sam2['classes_used'][i] for i in range(15)}
        },
        'non_sam2_stats': {
            'total': non_sam2['total'],
            'empty': non_sam2['empty'],
            'empty_rate': f"{non_sam2['empty']/max(1,non_sam2['total'])*100:.1f}%",
            'avg_boxes': non_sam2['avg_boxes'],
            'total_annotations': non_sam2['total_annotations'],
            'sources': dict(non_sam2['by_source']),
            'classes': {class_names[i]: non_sam2['classes_used'][i] for i in range(15)}
        }
    }

    with open('sam2_analysis_report.json', 'w') as f:
        json.dump(report, f, indent=2)

    print("\n" + "="*80)
    print("Report saved to: sam2_analysis_report.json")
    print("="*80)

    return stats

if __name__ == "__main__":
    analyze_sam2_labels()