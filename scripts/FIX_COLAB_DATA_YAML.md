# 🔧 Fix data.yaml Paths in Colab

## Problem

The `data.yaml` file has Windows paths like:
```
C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean\yolo_dataset_merged_final/val/images
```

But Colab needs Linux paths like:
```
/content/dataset/yolo_dataset_merged_final/val/images
```

## Solution: Fix data.yaml in Colab

Add this cell **before** "Step 7: Start Training" (or replace Step 4 if you haven't extracted yet):

```python
# Fix data.yaml paths for Colab
import yaml
import os

dataset_path = "/content/dataset/yolo_dataset_merged_final"
data_yaml_path = f"{dataset_path}/data.yaml"

print("🔧 Fixing data.yaml paths for Colab...")

# Read current data.yaml
with open(data_yaml_path, 'r') as f:
    data_config = yaml.safe_load(f)

# Update paths to use Colab paths
data_config['train'] = f"{dataset_path}/train/images"
data_config['val'] = f"{dataset_path}/val/images"
if 'test' in data_config:
    data_config['test'] = f"{dataset_path}/test/images"

# Save fixed data.yaml
with open(data_yaml_path, 'w') as f:
    yaml.dump(data_config, f, default_flow_style=False)

print("✅ data.yaml paths fixed!")
print(f"   Train: {data_config['train']}")
print(f"   Val: {data_config['val']}")
if 'test' in data_config:
    print(f"   Test: {data_config['test']}")

# Verify paths exist
print("\n🔍 Verifying paths...")
for key in ['train', 'val']:
    path = data_config[key]
    if os.path.exists(path):
        count = len([f for f in os.listdir(path) if f.endswith('.jpg')])
        print(f"   ✅ {key}: {count} images found")
    else:
        print(f"   ❌ {key}: Path not found - {path}")
```

## Alternative: Create New data.yaml

If the above doesn't work, create a fresh data.yaml:

```python
# Create new data.yaml with correct paths
import yaml
import os

dataset_path = "/content/dataset/yolo_dataset_merged_final"

# Define class names (update if different)
class_names = [
    'crack', 'water_damage', 'structural_damage', 'paint_peeling',
    'mold', 'rust', 'pest_damage', 'electrical_issue', 'plumbing_issue',
    'hvac_issue', 'roof_damage', 'foundation_issue', 'window_damage',
    'door_damage', 'other'
]

# Create data.yaml
data_config = {
    'path': dataset_path,
    'train': f"{dataset_path}/train/images",
    'val': f"{dataset_path}/val/images",
    'test': f"{dataset_path}/test/images",
    'nc': len(class_names),
    'names': class_names
}

# Save
data_yaml_path = f"{dataset_path}/data.yaml"
with open(data_yaml_path, 'w') as f:
    yaml.dump(data_config, f, default_flow_style=False)

print("✅ Created new data.yaml:")
print(f"   Path: {data_yaml_path}")
print(f"   Classes: {data_config['nc']}")
print(f"   Train: {data_config['train']}")
print(f"   Val: {data_config['val']}")
```

## Quick Fix: Add This Cell After Step 4

After extracting the dataset (Step 4), add this cell:

```python
# Fix data.yaml paths
import yaml
import os

dataset_path = "/content/dataset/yolo_dataset_merged_final"
data_yaml = f"{dataset_path}/data.yaml"

# Read and fix
with open(data_yaml, 'r') as f:
    config = yaml.safe_load(f)

# Update paths
config['train'] = f"{dataset_path}/train/images"
config['val'] = f"{dataset_path}/val/images"
if 'test' in config:
    config['test'] = f"{dataset_path}/test/images"

# Save
with open(data_yaml, 'w') as f:
    yaml.dump(config, f)

print("✅ data.yaml fixed!")
```

Then continue with Step 5 (Verify Dataset) and Step 7 (Start Training).
