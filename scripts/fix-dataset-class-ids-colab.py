"""
Fix YOLO Dataset Class ID Issues - Colab Version
=================================================
This script fixes the class ID mismatch problem where some labels have
class IDs outside the valid range (0-14) for our 15-class dataset.

Run this in Colab BEFORE training to fix the dataset.
"""

import os
from pathlib import Path
import yaml

def fix_class_ids_in_dataset():
    """Fix all label files to only contain valid class IDs (0-14)."""
    
    # Configuration
    DATASET_DIR = Path("/content/dataset/yolo_dataset_merged_final")
    MAX_CLASS_ID = 14  # For 15 classes (0-14)
    
    print("="*70)
    print(" FIXING DATASET CLASS ID ISSUES")
    print("="*70)
    print()
    
    # Load data.yaml to verify configuration
    data_yaml_path = DATASET_DIR / "data.yaml"
    if not data_yaml_path.exists():
        print(f"❌ Error: data.yaml not found at {data_yaml_path}")
        return False
    
    with open(data_yaml_path, 'r') as f:
        data = yaml.safe_load(f)
    
    print(f"📋 Dataset configuration:")
    print(f"   Classes: {data['nc']}")
    print(f"   Valid class IDs: 0 to {data['nc']-1}")
    print(f"   Class names: {', '.join(data['names'][:5])}...")
    print()
    
    # Statistics
    stats = {
        'train': {'total': 0, 'fixed': 0, 'removed': 0, 'invalid_ids': set()},
        'val': {'total': 0, 'fixed': 0, 'removed': 0, 'invalid_ids': set()},
        'test': {'total': 0, 'fixed': 0, 'removed': 0, 'invalid_ids': set()}
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
        
        for label_file in label_files:
            try:
                with open(label_file, 'r') as f:
                    lines = f.readlines()
                
                valid_lines = []
                file_has_invalid = False
                
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    parts = line.split()
                    if len(parts) < 5:
                        continue
                    
                    class_id = int(parts[0])
                    
                    # Check if class ID is valid
                    if class_id < 0 or class_id > MAX_CLASS_ID:
                        stats[split]['invalid_ids'].add(class_id)
                        file_has_invalid = True
                        stats[split]['removed'] += 1
                        continue  # Skip invalid class IDs
                    
                    # Keep valid lines
                    valid_lines.append(line)
                
                # Write back if file was modified
                if file_has_invalid:
                    with open(label_file, 'w') as f:
                        f.write('\n'.join(valid_lines) + '\n')
                    stats[split]['fixed'] += 1
                
            except Exception as e:
                print(f"   ⚠️  Error processing {label_file.name}: {e}")
        
        print(f"   ✅ Processed {stats[split]['total']} files")
        print(f"      Fixed: {stats[split]['fixed']} files")
        print(f"      Removed: {stats[split]['removed']} invalid annotations")
        if stats[split]['invalid_ids']:
            print(f"      Invalid class IDs found: {sorted(stats[split]['invalid_ids'])}")
        print()
    
    # Summary
    print("="*70)
    print(" SUMMARY")
    print("="*70)
    total_fixed = sum(s['fixed'] for s in stats.values())
    total_removed = sum(s['removed'] for s in stats.values())
    all_invalid_ids = set()
    for s in stats.values():
        all_invalid_ids.update(s['invalid_ids'])
    
    print(f"✅ Fixed {total_fixed} label files")
    print(f"✅ Removed {total_removed} invalid annotations")
    if all_invalid_ids:
        print(f"⚠️  Invalid class IDs found: {sorted(all_invalid_ids)}")
        print(f"   These were from the original dataset (81 classes)")
        print(f"   and should have been remapped to 0-14")
    print()
    
    if total_fixed > 0:
        print("✅ Dataset fixed! Ready for training.")
        print("   Re-run Step 5 (Verify Dataset) to confirm.")
    else:
        print("ℹ️  No issues found. Dataset is ready for training.")
    
    return True

if __name__ == "__main__":
    fix_class_ids_in_dataset()
