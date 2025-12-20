# Local YOLO Model Setup Guide

**Last Updated:** March 1, 2025  
**Purpose:** Step-by-step guide for setting up local YOLO model inference

---

## Overview

This guide explains how to configure and use the local YOLO model integration in `RoboflowDetectionService`. The service supports both:

1. **Local Inference** (ONNX-based) - Runs model on your server
2. **API Inference** (Roboflow hosted) - Uses Roboflow API (fallback)

---

## Prerequisites

### 1. Model Conversion

Your YOLO model needs to be in **ONNX format** for local inference.

#### Option A: Convert from PyTorch (.pt) to ONNX

If you have a PyTorch model (`.pt` file), convert it using:

```python
import torch
from ultralytics import YOLO

# Load your trained YOLO model
model = YOLO('path/to/your/model.pt')

# Export to ONNX
model.export(format='onnx', imgsz=640)  # 640x640 is standard for YOLOv11
```

This will create a `.onnx` file in the same directory.

#### Option B: Download from Roboflow

If your model is on Roboflow:
1. Go to your project in Roboflow
2. Navigate to "Deploy" → "ONNX"
3. Download the ONNX model file

### 2. Install Dependencies

The required dependencies are already added to `package.json`:

```bash
npm install
```

This installs:
- `onnxruntime-node` - ONNX Runtime for Node.js (supports GPU via CUDA)
- `sharp` - Image processing library

### 3. GPU Support (Optional but Recommended)

For GPU acceleration, you need:

**CUDA Setup:**
- NVIDIA GPU with CUDA support
- CUDA Toolkit installed
- cuDNN library

**Verify GPU:**
```bash
nvidia-smi  # Should show your GPU
```

If GPU is not available, the service will automatically fall back to CPU (slower but works).

---

## Configuration

### Environment Variables

Add these to your `.env.local` (or `.env.production`):

```bash
# Enable local YOLO inference
USE_LOCAL_YOLO=true

# Path to ONNX model file (required)
YOLO_MODEL_PATH=./models/yolov11.onnx

# Path to data.yaml file (optional, for class names)
YOLO_DATA_YAML_PATH=./Building Defect Detection 7.v2i.yolov11/data.yaml

# Confidence threshold (0-1, default: 0.25)
YOLO_CONFIDENCE_THRESHOLD=0.25

# IoU threshold for NMS (0-1, default: 0.45)
YOLO_IOU_THRESHOLD=0.45
```

### Model File Structure

Recommended directory structure:

```
apps/web/
├── models/
│   └── yolov11.onnx          # Your ONNX model file
├── Building Defect Detection 7.v2i.yolov11/
│   └── data.yaml             # Class names (71 classes)
└── lib/
    └── services/
        └── building-surveyor/
            └── RoboflowDetectionService.ts
```

**Note:** Use absolute paths or paths relative to the project root.

---

## Usage

### Automatic Initialization

The local YOLO model is automatically initialized on server startup via `instrumentation.ts`. No manual initialization needed.

### Code Usage

The service works exactly the same as before - no code changes needed:

```typescript
import { RoboflowDetectionService } from '@/lib/services/building-surveyor/RoboflowDetectionService';

// Detect objects in images
const detections = await RoboflowDetectionService.detect([
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg',
]);

// detections is an array of RoboflowDetection objects
// Same format as API-based inference
```

### Fallback Behavior

If local inference fails (e.g., model not found, GPU unavailable), the service automatically falls back to Roboflow API (if configured).

---

## Testing

### 1. Verify Model Loading

Check server logs on startup:

```
✅ Local YOLO model initialized in RoboflowDetectionService
```

If you see errors, check:
- Model file path is correct
- ONNX file is valid
- File permissions allow reading

### 2. Test Inference

Create a test script:

```typescript
// test-yolo.ts
import { RoboflowDetectionService } from './lib/services/building-surveyor/RoboflowDetectionService';

async function test() {
  await RoboflowDetectionService.initialize();
  
  const detections = await RoboflowDetectionService.detect([
    'https://example.com/test-image.jpg',
  ]);
  
  console.log('Detections:', detections);
}

test();
```

Run:
```bash
npx ts-node test-yolo.ts
```

### 3. Compare with API

To compare local vs API results:

1. Set `USE_LOCAL_YOLO=false` and test
2. Set `USE_LOCAL_YOLO=true` and test
3. Compare detection results

---

## Troubleshooting

### Error: "Model not initialized"

**Cause:** Model file not found or initialization failed.

**Solution:**
- Check `YOLO_MODEL_PATH` is correct
- Verify file exists and is readable
- Check file format (must be `.onnx`)
- Review server logs for detailed error

### Error: "CUDA not available"

**Cause:** GPU/CUDA not properly configured.

**Solution:**
- Service will automatically fall back to CPU
- For GPU support, install CUDA Toolkit and cuDNN
- Verify with `nvidia-smi`

### Slow Performance

**Cause:** Running on CPU instead of GPU.

**Solution:**
- Install CUDA for GPU acceleration
- Or use Roboflow API (may be faster for CPU-only servers)

### Wrong Class Names

**Cause:** `data.yaml` path incorrect or class names don't match model.

**Solution:**
- Verify `YOLO_DATA_YAML_PATH` points to correct file
- Check class count matches model (should be 71)
- Service will use default class names if file not found

### Memory Issues

**Cause:** Model too large or insufficient RAM.

**Solution:**
- YOLOv11 models are typically 50-200 MB
- Ensure at least 2 GB free RAM
- Consider using smaller model variant
- Use API inference if memory constrained

---

## Performance Comparison

### Expected Latency (8 images)

| Method | GPU | CPU | Notes |
|--------|-----|-----|-------|
| **Local (GPU)** | ~880-2400ms | N/A | Fastest, requires GPU |
| **Local (CPU)** | N/A | ~4400-17600ms | Slower, no GPU needed |
| **API** | N/A | ~800-4000ms | Network dependent |

### Resource Usage

| Resource | Local (GPU) | Local (CPU) | API |
|----------|------------|-------------|-----|
| **GPU VRAM** | 500 MB - 2 GB | 0 | 0 |
| **CPU** | Low | High (50-100%) | Low |
| **Memory** | 200-500 MB | 200-500 MB | 10-50 MB |
| **Network** | Minimal | Minimal | High |

---

## Migration Strategy

### Phase 1: Parallel Testing

1. Keep `USE_LOCAL_YOLO=false` (use API)
2. Test local inference separately
3. Compare results and performance

### Phase 2: Gradual Rollout

1. Enable local inference for specific users/environments
2. Monitor performance and errors
3. Keep API as fallback

### Phase 3: Full Migration

1. Set `USE_LOCAL_YOLO=true` for all environments
2. Monitor resource usage
3. Optimize based on metrics

---

## Advanced Configuration

### Custom Confidence Threshold

Adjust based on your use case:

```bash
# More detections (lower threshold)
YOLO_CONFIDENCE_THRESHOLD=0.15

# Fewer, higher-quality detections (higher threshold)
YOLO_CONFIDENCE_THRESHOLD=0.5
```

### Custom NMS Threshold

Control overlap suppression:

```bash
# Allow more overlapping detections
YOLO_IOU_THRESHOLD=0.6

# Stricter overlap suppression
YOLO_IOU_THRESHOLD=0.3
```

### Model Versioning

For multiple model versions:

```bash
# Use versioned model paths
YOLO_MODEL_PATH=./models/yolov11-v2.onnx
```

Update path when deploying new model versions.

---

## Security Considerations

### Model File Security

- Store model files in secure location
- Don't commit `.onnx` files to git (add to `.gitignore`)
- Use environment-specific paths
- Restrict file permissions

### Input Validation

The service already validates image URLs via `validateURLs()`. This prevents:
- SSRF attacks
- Malicious URL requests
- Invalid image formats

---

## Monitoring

### Key Metrics to Track

1. **Inference Latency** - Time per image
2. **Model Load Time** - Startup initialization
3. **Memory Usage** - RAM/VRAM consumption
4. **Error Rate** - Failed inferences
5. **Fallback Rate** - API fallback frequency

### Logging

The service logs:
- Model initialization status
- Inference errors
- Fallback to API
- Performance metrics

Check logs for:
```
Local YOLO model initialized successfully
Local YOLO inference failed, falling back to API
```

---

## Next Steps

1. **Convert your model** to ONNX format
2. **Place model file** in `apps/web/models/`
3. **Set environment variables** in `.env.local`
4. **Restart server** to initialize model
5. **Test inference** with sample images
6. **Monitor performance** and adjust thresholds

---

## Support

For issues or questions:
1. Check server logs for detailed errors
2. Review this guide's troubleshooting section
3. Verify model format and paths
4. Test with API fallback to isolate issues

---

## References

- [ONNX Runtime Documentation](https://onnxruntime.ai/docs/)
- [YOLOv11 Documentation](https://docs.ultralytics.com/)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [Local YOLO Integration Impact Analysis](./LOCAL_YOLO_INTEGRATION_IMPACT.md)

