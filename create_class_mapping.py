#!/usr/bin/env python3
"""
Create class mapping from Building Defect Detection (81 classes) to Maintenance Model (15 classes).
"""

import json
from pathlib import Path
import yaml

def create_class_mapping():
    """Create mapping from new dataset's 81 classes to current 15 classes."""

    # Define current model classes
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

    # New dataset classes (from data.yaml)
    new_classes = [
        'Bare electrical wire', 'Broken Window', 'Broken timber Floor', 'Building', 'Crack',
        'Cracked Skirting', 'Damage', 'Damaged Brick', 'Damaged Tower', 'Damaged plaster board',
        'Damaged roof', 'Damaged wall', 'Damaged_Roof', 'Damp', 'Damp damage',
        'Dangerous Electrical socket', 'Defective paving', 'Expansion Crack', 'Fissure',
        'Leaking damage on wood', 'Leaking radiator', 'Loose Coping', 'Loose pipes',
        'Minor Crack', 'Mold', 'Mould', 'Mould on wall', 'Normal wall', 'Other',
        'Plaster board', 'Plaster coverring to stop leaking', 'Radiator', 'Radiator conner',
        'Roof', 'Rotten', 'Rotten timber', 'Rust on radiator', 'Spalling',
        'Stepped cracking on brick', 'Sunken Block', 'Trou', 'Uncracked wall', 'Unstable',
        'Wall leaking', 'Wall-leaking', 'Whole cause by damp', 'Window', 'bad_coupler',
        'bad_line', 'bath', 'brack_crack', 'broken window', 'building', 'burst',
        'closed valve', 'crack', 'crack-mold-damp-spalling-cor', 'damage', 'damaged roof',
        'designradiator', 'douche', 'good_bolt', 'good_coupler', 'good_line', 'good_valve',
        'hole', 'leak', 'opened valve', 'pipe', 'roof', 'rusty_bolt', 'rusty_valve',
        'toilet', 'wall flange', 'wall_corrosion', 'wall_crack', 'wall_deterioration',
        'wall_mold', 'wall_stain', 'wastafel', 'window'
    ]

    # Create mapping: new_class_id -> current_class_id
    # Use -1 for classes that should be filtered out (non-defects)
    class_mapping = {}

    # Define mappings by category
    mappings = {
        # WINDOWS (7: window_broken)
        7: ['Broken Window', 'broken window', 'Window', 'window'],

        # CRACKS (2: wall_crack)
        2: ['Crack', 'crack', 'wall_crack', 'Minor Crack', 'Expansion Crack', 'Fissure',
            'brack_crack', 'Stepped cracking on brick'],

        # WATER DAMAGE (1: water_damage)
        1: ['Wall leaking', 'Wall-leaking', 'Leaking damage on wood', 'wall_stain',
            'Plaster coverring to stop leaking'],

        # ROOF DAMAGE (3: roof_damage)
        3: ['Damaged roof', 'Damaged_Roof', 'Roof', 'damaged roof', 'roof', 'Loose Coping'],

        # MOLD & DAMP (5: mold_damp)
        5: ['Mold', 'Mould', 'wall_mold', 'Mould on wall', 'Damp', 'Damp damage',
            'Whole cause by damp', 'Spalling', 'crack-mold-damp-spalling-cor'],

        # PIPE LEAKS (0: pipe_leak)
        0: ['leak', 'burst', 'pipe', 'Loose pipes', 'Leaking radiator', 'Rust on radiator'],

        # ELECTRICAL (4: electrical_fault)
        4: ['Bare electrical wire', 'Dangerous Electrical socket'],

        # FLOOR DAMAGE (9: floor_damage)
        9: ['Broken timber Floor', 'Defective paving'],

        # FOUNDATION (11: foundation_crack)
        11: ['Sunken Block', 'Unstable'],

        # GENERAL DAMAGE (14: general_damage)
        14: ['Damage', 'damage', 'Damaged Brick', 'Damaged Tower', 'Damaged plaster board',
             'Damaged wall', 'Cracked Skirting', 'Rotten', 'Rotten timber', 'wall_corrosion',
             'wall_deterioration', 'hole', 'Trou', 'Other'],

        # FILTER OUT (non-defects) - use -1
        -1: ['Normal wall', 'Uncracked wall', 'Plaster board', 'Building', 'building',
             'Radiator', 'Radiator conner', 'designradiator',
             'bath', 'toilet', 'douche', 'wastafel', 'wall flange',
             'good_bolt', 'good_coupler', 'good_line', 'good_valve',
             'closed valve', 'opened valve', 'rusty_bolt', 'rusty_valve',
             'bad_coupler', 'bad_line']
    }

    # Build reverse mapping: class_name -> target_class_id
    name_to_target = {}
    for target_id, class_names in mappings.items():
        for class_name in class_names:
            name_to_target[class_name] = target_id

    # Create final mapping with new dataset class IDs
    for new_id, class_name in enumerate(new_classes):
        if class_name in name_to_target:
            class_mapping[new_id] = name_to_target[class_name]
        else:
            # Unmapped classes go to general_damage by default
            print(f"Warning: Unmapped class '{class_name}' (ID {new_id}) -> general_damage (14)")
            class_mapping[new_id] = 14

    return class_mapping, current_classes, new_classes

def save_mapping(mapping, current_classes, new_classes, output_file):
    """Save mapping to JSON file with documentation."""

    output = {
        'description': 'Class mapping from Building Defect Detection (81 classes) to Maintenance Model (15 classes)',
        'created': '2024-12-08',
        'source_dataset': 'Building Defect Detection 7 v3 (Roboflow)',
        'target_model': 'Maintenance Issue Detection (15 classes)',
        'target_classes': current_classes,
        'source_classes': {i: name for i, name in enumerate(new_classes)},
        'mapping': {str(k): v for k, v in mapping.items()},
        'statistics': {
            'total_source_classes': len(new_classes),
            'total_target_classes': len(current_classes),
            'filtered_classes': sum(1 for v in mapping.values() if v == -1),
            'mapped_classes': sum(1 for v in mapping.values() if v >= 0)
        },
        'special_values': {
            '-1': 'Filter out (non-defect or reference object)'
        }
    }

    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\nMapping saved to: {output_file}")

def print_mapping_summary(mapping, current_classes, new_classes):
    """Print human-readable mapping summary."""

    print("\n" + "="*80)
    print("CLASS MAPPING SUMMARY")
    print("="*80)

    # Group by target class
    target_groups = {}
    for new_id, target_id in mapping.items():
        if target_id not in target_groups:
            target_groups[target_id] = []
        target_groups[target_id].append((new_id, new_classes[new_id]))

    # Print mappings by target class
    for target_id in sorted(target_groups.keys()):
        if target_id == -1:
            print(f"\nFILTERED OUT (non-defects):")
        else:
            target_name = current_classes[target_id]
            print(f"\n{target_id}: {target_name.upper()}")

        for new_id, new_name in sorted(target_groups[target_id], key=lambda x: x[1]):
            print(f"   [{new_id:2d}] {new_name}")

    # Print statistics
    print("\n" + "="*80)
    print("STATISTICS")
    print("="*80)
    print(f"Total source classes: {len(new_classes)}")
    print(f"Total target classes: {len(current_classes)}")
    print(f"Filtered classes: {sum(1 for v in mapping.values() if v == -1)}")
    print(f"Mapped classes: {sum(1 for v in mapping.values() if v >= 0)}")

    # Distribution
    print("\nTarget Class Distribution:")
    target_counts = {}
    for target_id in mapping.values():
        if target_id >= 0:
            target_counts[target_id] = target_counts.get(target_id, 0) + 1

    for target_id in sorted(target_counts.keys()):
        count = target_counts[target_id]
        name = current_classes[target_id]
        print(f"   {target_id:2d}. {name:20s} <- {count:2d} source classes")

if __name__ == "__main__":
    print("Creating class mapping...")
    print("Source: Building Defect Detection 7 v3 (81 classes)")
    print("Target: Maintenance Model (15 classes)")

    # Create mapping
    mapping, current_classes, new_classes = create_class_mapping()

    # Save to file
    output_file = Path(__file__).parent / "class_mapping.json"
    save_mapping(mapping, current_classes, new_classes, output_file)

    # Print summary
    print_mapping_summary(mapping, current_classes, new_classes)

    print("\n" + "="*80)
    print("NEXT STEPS")
    print("="*80)
    print("\n1. Review the mapping above")
    print("2. Edit class_mapping.json if you want to change any mappings")
    print("3. Run: python merge_datasets_with_mapping.py")
    print("\n")
