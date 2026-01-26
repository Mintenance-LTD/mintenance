# YOLO Inference Script Guide

A comprehensive Python script for running inference with YOLO models - supports YOLO26, YOLOv11, and custom trained models like `best_model_final_v2.pt`.

## Quick Start

```bash
# Basic usage with default YOLO26n (nano) model
python scripts/yolo26-inference.py path/to/your/image.jpg

# Use your custom trained building defect detection model
python scripts/yolo26-inference.py path/to/your/image.jpg --model best_model_final_v2.pt

# Use custom model with data.yaml for class names
python scripts/yolo26-inference.py path/to/your/image.jpg --model best_model_final_v2.pt --data-yaml yolo_dataset/data.yaml

# Custom confidence threshold
python scripts/yolo26-inference.py path/to/your/image.jpg --model best_model_final_v2.pt --conf 0.5

# Save results to specific directory
python scripts/yolo26-inference.py path/to/your/image.jpg --model best_model_final_v2.pt --output results/
```

## Installation

The script requires `ultralytics` to be installed:

```bash
pip install -U ultralytics
```

Or install from the project requirements:

```bash
# For SAM2 service
pip install -r apps/sam2-video-service/requirements.txt

# For SAM3 service
pip install -r apps/sam3-service/requirements.txt
```

## Model Variants

### Pretrained YOLO26 Models

YOLO26 comes in several size variants, each with different speed/accuracy tradeoffs:

| Model | Size | Speed | Accuracy | Use Case |
|-------|------|-------|----------|----------|
| `yolo26n.pt` | Nano | Fastest | Good | Real-time inference, edge devices |
| `yolo26s.pt` | Small | Fast | Better | Balanced performance |
| `yolo26m.pt` | Medium | Moderate | Great | High accuracy needs |
| `yolo26l.pt` | Large | Slower | Excellent | Maximum accuracy |
| `yolo26x.pt` | XLarge | Slowest | Best | Research, offline processing |

**Note:** Pretrained models are automatically downloaded on first use. They're cached in `~/.ultralytics/` for subsequent runs.

### Custom Trained Models

The script also supports your custom trained models:

| Model | Description | Classes | Use Case |
|-------|-------------|---------|----------|
| `best_model_final_v2.pt` | Building Defect Detection | 15 classes | Building maintenance defect detection |
| `best_model_final.pt` | Building Defect Detection (v1) | 15 classes | Legacy model version |

**Custom Model Classes (15 building defect types):**
1. `pipe_leak` - Pipe leaks
2. `water_damage` - Water stains and damage
3. `wall_crack` - Cracks in walls
4. `roof_damage` - Roof damage
5. `electrical_fault` - Electrical problems
6. `mold_damp` - Mold and dampness
7. `fire_damage` - Fire damage
8. `window_broken` - Broken windows
9. `door_damaged` - Damaged doors
10. `floor_damage` - Floor damage
11. `ceiling_damage` - Ceiling damage
12. `foundation_crack` - Foundation cracks
13. `hvac_issue` - HVAC system issues
14. `gutter_blocked` - Blocked gutters
15. `general_damage` - General building damage

## Command-Line Options

```
positional arguments:
  image                 Path to the input image file

options:
  -h, --help            Show help message and exit
  --model MODEL         YOLO model (default: yolo26n.pt). Can be pretrained 
                        (yolo26n/yolo26s/yolo26m/yolo26l/yolo26x) or custom 
                        (best_model_final_v2.pt, etc.)
  --data-yaml DATA_YAML Path to data.yaml file for custom class names 
                        (optional, model uses its own class names if not provided)
  --output OUTPUT       Output directory for results (default: same as image)
  --conf CONF           Confidence threshold 0.0-1.0 (default: 0.25)
  --no-show            Don't display results on screen (only save)
  --no-save            Don't save results to disk (only display)
```

## Examples

### Basic Detection
```bash
python scripts/yolo26-inference.py myimage.jpg
```

### High Confidence Detection
Only show detections with >50% confidence:
```bash
python scripts/yolo26-inference.py myimage.jpg --conf 0.5
```

### Use Custom Trained Model
```bash
# Use your building defect detection model
python scripts/yolo26-inference.py myimage.jpg --model best_model_final_v2.pt

# With data.yaml for class names (optional, model has class names built-in)
python scripts/yolo26-inference.py myimage.jpg --model best_model_final_v2.pt --data-yaml yolo_dataset/data.yaml
```

### Use Larger Pretrained Model
```bash
python scripts/yolo26-inference.py myimage.jpg --model yolo26m.pt
```

### Batch Processing (using shell)
```bash
# Process all images in a directory
for img in images/*.jpg; do
    python scripts/yolo26-inference.py "$img" --output results/ --no-show
done
```

### Headless Mode (no display)
```bash
python scripts/yolo26-inference.py myimage.jpg --no-show --output results/
```

## Output

The script generates:

1. **Console Output**: Detection summary with class names and confidence scores
2. **Visual Results**: Annotated image with bounding boxes (if `--no-show` not used)
3. **Saved Image**: Results saved to `{output_dir}/yolo26_results/{image_name}_result.jpg`

## Integration with Project

This script is designed to work alongside your existing YOLO infrastructure:

- **Building Surveyor AI**: Test your custom trained models (`best_model_final_v2.pt`) before integration
- **SAM2/SAM3 Services**: Compare YOLO results with SAM segmentation
- **Training Pipeline**: Use for inference testing during model development
- **Local YOLO Deployment**: Works with your local YOLO model deployment (see `LOCAL_YOLO_DEPLOYMENT_COMPLETE.md`)

### Using Your Custom Models

Your custom trained models are located in the project root:
- `best_model_final_v2.pt` - Latest building defect detection model (49.65 MB)
- `best_model_final.pt` - Previous version

These models are trained on your building defect dataset with 15 classes and can be used directly:

```bash
# Test on a single image
python scripts/yolo26-inference.py yolo_dataset/images/sample.jpg --model best_model_final_v2.pt

# Batch process validation images
for img in yolo_dataset/val/images/*.jpg; do
    python scripts/yolo26-inference.py "$img" --model best_model_final_v2.pt --output results/ --no-show
done
```

## Troubleshooting

### Import Error
```
❌ Error: ultralytics not installed
```
**Solution:** Run `pip install -U ultralytics`

### Model Download Issues
If model download fails, check your internet connection. Models are downloaded from Ultralytics GitHub releases.

### CUDA/GPU Issues
The script automatically uses GPU if available. To force CPU:
```python
# Edit the script and add:
model = YOLO(model_name)
model.to('cpu')  # Force CPU
```

### Windows Path Issues
The script handles Windows paths automatically. Use forward slashes or raw strings:
```bash
python scripts/yolo26-inference.py "C:/Users/Name/image.jpg"
```

## Advanced Usage

### Programmatic Usage

You can also import and use the function directly:

```python
from scripts.yolo26_inference import run_inference

run_inference(
    image_path="image.jpg",
    model_name="yolo26s.pt",
    conf_threshold=0.3,
    show_results=True,
    save_results=True
)
```

### Custom Model Path

To use a custom trained model:

```bash
python scripts/yolo26-inference.py image.jpg --model ./best_model.pt
```

## Performance Tips

1. **Use appropriate model size**: Start with `yolo26n.pt` and scale up if needed
2. **Adjust confidence threshold**: Lower = more detections (may include false positives)
3. **Batch processing**: Use `--no-show` for batch processing to avoid display overhead
4. **GPU acceleration**: Ensure PyTorch with CUDA is installed for faster inference

## Next Steps

- Integrate YOLO26 into your Building Surveyor AI pipeline
- Compare YOLO26 performance with existing YOLO models
- Use for continuous learning data collection
- Test on your building defect detection dataset

## Related Files

- `test-local-yolo.py`: Tests local YOLO model deployment
- `scripts/ml/`: Machine learning training scripts
- `apps/web/lib/services/building-surveyor/`: YOLO integration services
