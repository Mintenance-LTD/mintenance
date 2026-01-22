"""
Fix YOLO Dataset Class ID Issues - Local Version
================================================
This script fixes the class ID mismatch problem where some labels have
class IDs outside the valid range (0-14) for our 15-class dataset.

Run this BEFORE training to fix the dataset.
"""

import os
import sys
from pathlib import Path
import yaml
from collections import defaultdict

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def fix_class_ids_in_dataset(dataset_dir: str = "yolo_dataset_merged_final"):
    """Fix all label files to only contain valid class IDs (0-14)."""
    
    DATASET_DIR = Path(dataset_dir)
    MAX_CLASS_ID = 14  # For 15 classes (0-14)
    
    print("="*70)
    print(" FIXING DATASET CLASS ID ISSUES")
    print("="*70)
    print()
    
    if not DATASET_DIR.exists():
        print(f"❌ Error: Dataset directory not found: {DATASET_DIR}")
        print(f"   Current directory: {Path.cwd()}")
        return False
    
    # Load data.yaml to verify configuration
    data_yaml_path = DATASET_DIR / "data.yaml"
    if not data_yaml_path.exists():
        print(f"❌ Error: data.yaml not found at {data_yaml_path}")
        return False
    
    with open(data_yaml_path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    
    print(f"📋 Dataset configuration:")
    print(f"   Path: {DATASET_DIR}")
    print(f"   Classes: {data['nc']}")
    print(f"   Valid class IDs: 0 to {data['nc']-1}")
    print(f"   Class names: {', '.join(data['names'][:5])}...")
    print()
    
    # Statistics
    stats = {
        'train': {'total': 0, 'fixed': 0, 'removed': 0, 'invalid_ids': set(), 'empty_files': 0},
        'val': {'total': 0, 'fixed': 0, 'removed': 0, 'invalid_ids': set(), 'empty_files': 0},
        'test': {'total': 0, 'fixed': 0, 'removed': 0, 'invalid_ids': set(), 'empty_files': 0}
    }
    
    # Process each split
    for split in ['train', 'val', 'test']:
        labels_dir = DATASET_DIR / split / 'labels'
        
        if not labels_dir.exists():
            print(f"⚠️  {split}/labels directory not found, skipping...")
            continue
        
        print(f"🔍 Processing {split} labels...")
        label_files = list(labels_dir.glob('*.txt'))
        stats[split]['total'] = len(label_files)
        
        if stats[split]['total'] == 0:
            print(f"   ⚠️  No label files found in {split}/labels")
            continue
        
        processed = 0
        for label_file in label_files:
            try:
                with open(label_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                
                valid_lines = []
                file_has_invalid = False
                original_count = len([l for l in lines if l.strip()])
                
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    parts = line.split()
                    if len(parts) < 5:
                        continue
                    
                    try:
                        class_id = int(parts[0])
                        
                        # Check if class ID is valid
                        if class_id < 0 or class_id > MAX_CLASS_ID:
                            stats[split]['invalid_ids'].add(class_id)
                            file_has_invalid = True
                            stats[split]['removed'] += 1
                            continue  # Skip invalid class IDs
                        
                        # Keep valid lines
                        valid_lines.append(line)
                    except ValueError:
                        # Skip lines with invalid class ID format
                        file_has_invalid = True
                        stats[split]['removed'] += 1
                        continue
                
                # Check if file becomes empty
                if len(valid_lines) == 0 and original_count > 0:
                    stats[split]['empty_files'] += 1
                
                # Write back if file was modified
                if file_has_invalid:
                    with open(label_file, 'w', encoding='utf-8') as f:
                        if valid_lines:
                            f.write('\n'.join(valid_lines) + '\n')
                    stats[split]['fixed'] += 1
                
                processed += 1
                if processed % 500 == 0:
                    print(f"   Processed {processed}/{stats[split]['total']} files...")
                
            except Exception as e:
                print(f"   ⚠️  Error processing {label_file.name}: {e}")
        
        print(f"   ✅ Processed {processed} files")
        print(f"      Fixed: {stats[split]['fixed']} files")
        print(f"      Removed: {stats[split]['removed']} invalid annotations")
        if stats[split]['empty_files'] > 0:
            print(f"      ⚠️  {stats[split]['empty_files']} files became empty (all annotations removed)")
        if stats[split]['invalid_ids']:
            print(f"      Invalid class IDs found: {sorted(stats[split]['invalid_ids'])}")
        print()
    
    # Summary
    print("="*70)
    print(" SUMMARY")
    print("="*70)
    total_fixed = sum(s['fixed'] for s in stats.values())
    total_removed = sum(s['removed'] for s in stats.values())
    total_empty = sum(s['empty_files'] for s in stats.values())
    all_invalid_ids = set()
    for s in stats.values():
        all_invalid_ids.update(s['invalid_ids'])
    
    print(f"✅ Fixed {total_fixed} label files")
    print(f"✅ Removed {total_removed} invalid annotations")
    if total_empty > 0:
        print(f"⚠️  {total_empty} files became empty (all annotations removed)")
        print(f"   These images will have no labels - consider removing them or re-labeling")
    if all_invalid_ids:
        print(f"⚠️  Invalid class IDs found: {sorted(all_invalid_ids)}")
        print(f"   These were from the original dataset (81 classes)")
        print(f"   and should have been remapped to 0-14")
    print()
    
    if total_fixed > 0:
        print("✅ Dataset fixed! Ready for training.")
        print("   These invalid labels were causing poor performance (18.87% mAP50)")
        print("   Now training should perform much better!")
        print()
        print("📊 Next steps:")
        print("   1. Re-analyze dataset: python scripts/analyze-class-distribution.py")
        print("   2. Upload fixed dataset to Google Drive")
        print("   3. Run training in Colab (Step 4.6 will also check this)")
    else:
        print("ℹ️  No issues found. Dataset is ready for training.")
    
    return True

def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Fix invalid class IDs in YOLO dataset",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Fix default dataset
  python scripts/fix-dataset-class-ids.py
  
  # Fix custom dataset path
  python scripts/fix-dataset-class-ids.py --dataset path/to/dataset
        """
    )
    
    parser.add_argument(
        '--dataset',
        type=str,
        default='yolo_dataset_merged_final',
        help='Path to dataset directory (default: yolo_dataset_merged_final)'
    )
    
    args = parser.parse_args()
    
    success = fix_class_ids_in_dataset(args.dataset)
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
