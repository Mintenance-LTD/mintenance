# SAM 3 Integration Guide

## Overview

This guide covers the integration of SAM 3 (Segment Anything Model 3) into the Mintenance platform's Building Surveyor AI system. SAM 3 provides text-prompted concept segmentation for precise building damage detection.

## Key Features

- **Text-Prompted Segmentation**: Find damage using natural language ("cracks", "water damage", "mold")
- **Concept Exhaustiveness**: Detects ALL instances of a damage type in images
- **30ms Inference**: Optimized for real-time assessment
- **Graceful Degradation**: Service continues with GPT-4 if SAM 3 is unavailable
- **Self-Learning**: Captures successful prompts for continual improvement

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Next.js App (TypeScript)                       │
│  ├─ BuildingSurveyorService                     │
│  ├─ SAM3Service (HTTP client)                   │
│  └─ BayesianFusionService                       │
└─────────────────────────────────────────────────┘
                    ↓ HTTP (Port 8001)
┌─────────────────────────────────────────────────┐
│  Python Microservice (FastAPI)                  │
│  └─ SAM 3 Model (PyTorch + CUDA)                │
└─────────────────────────────────────────────────┘
```

## Setup Instructions

### Prerequisites

1. **Python 3.10+** installed
2. **CUDA 12.6+** (optional, for GPU acceleration)
3. **Hugging Face Account** with access to `facebook/sam3`
4. **4GB disk space** for model checkpoints

### Step 1: Environment Configuration

Add the following to your `.env.local`:

```bash
# SAM 3 Configuration
SAM3_SERVICE_URL=http://localhost:8001
ENABLE_SAM3_SEGMENTATION=true
HF_TOKEN=your_huggingface_token_here
SAM_MODEL_VERSION=3
SAM3_ROLLOUT_PERCENTAGE=10  # Start with 10% rollout
SAM3_TIMEOUT_MS=30000
SAM3_CACHE_DIR=./model_cache  # Optional: cache directory
```

### Step 2: Python Microservice Setup

1. Navigate to the SAM 3 service directory:
```bash
cd apps/sam3-service
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install PyTorch with CUDA support:
```bash
# For CUDA 12.6
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126

# For CPU only
pip install torch torchvision torchaudio
```

4. Install SAM 3 and dependencies:
```bash
pip install -r requirements.txt
pip install -e git+https://github.com/facebookresearch/sam3.git#egg=sam3
```

5. Start the microservice:
```bash
python app/main.py
```

The service will start on http://localhost:8001

### Step 3: Verify Installation

1. Check health endpoint:
```bash
curl http://localhost:8001/health
```

Expected response:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "service": "sam3-segmentation"
}
```

2. Run integration tests:
```bash
cd apps/web
npm test -- SAM3Integration.test.ts
```

## Usage

### Basic Segmentation

```typescript
import { SAM3Service } from '@/lib/services/building-surveyor/SAM3Service';

// Single damage type
const result = await SAM3Service.segment(
  imageUrl,
  'water damage',
  0.5  // confidence threshold
);

// Multiple damage types
const results = await SAM3Service.segmentDamageTypes(
  imageUrl,
  ['crack', 'water damage', 'mold', 'rot']
);
```

### Integration with Building Surveyor

The BuildingSurveyorService automatically uses SAM 3 when enabled:

```typescript
const assessment = await BuildingSurveyorService.assessBuilding(
  imageUrls,
  {
    location: 'London, UK',
    propertyType: 'residential'
  }
);
// SAM 3 results are automatically integrated via Bayesian fusion
```

## Configuration Options

### Gradual Rollout

Control what percentage of requests use SAM 3:

```bash
SAM3_ROLLOUT_PERCENTAGE=0    # Disabled
SAM3_ROLLOUT_PERCENTAGE=10   # 10% of requests
SAM3_ROLLOUT_PERCENTAGE=50   # 50% of requests
SAM3_ROLLOUT_PERCENTAGE=100  # All requests
```

### Performance Tuning

```bash
# Timeout for segmentation requests (ms)
SAM3_TIMEOUT_MS=30000  # Default: 30 seconds

# Model caching directory
SAM3_CACHE_DIR=./model_cache

# Model version tracking
SAM_MODEL_VERSION=3
```

### Circuit Breaker

The service includes automatic circuit breaker protection:
- Opens after 3 consecutive failures
- Resets after 5 minutes
- Health checks are cached for 60 seconds

## Prompt Engineering Best Practices

### Effective Prompts

Good prompts for building damage:
- ✅ "water damage stains"
- ✅ "horizontal crack in wall"
- ✅ "black mold growth"
- ✅ "roof tile damage"
- ✅ "foundation settling crack"

Less effective prompts:
- ❌ "damage" (too vague)
- ❌ "bad stuff" (not specific)
- ❌ "fix this" (not descriptive)

### Prompt Templates

```typescript
const DAMAGE_PROMPTS = {
  water: [
    'water damage stains',
    'water infiltration marks',
    'moisture damage'
  ],
  structural: [
    'crack in wall',
    'foundation crack',
    'structural damage'
  ],
  biological: [
    'mold growth',
    'black mold',
    'fungal growth'
  ]
};
```

## Troubleshooting

### Common Issues

1. **Model fails to load**
   - Check Hugging Face token is valid
   - Verify access to `facebook/sam3` repository
   - Check disk space (needs 4GB)
   - Check CUDA compatibility if using GPU

2. **Slow inference**
   - Verify GPU is being used: Check logs for "Loading SAM 3 model on cuda"
   - Reduce image resolution if needed
   - Check GPU memory usage

3. **Circuit breaker opens frequently**
   - Check Python service logs: `docker logs sam3-service`
   - Verify network connectivity
   - Increase timeout: `SAM3_TIMEOUT_MS=60000`

4. **Low confidence scores**
   - Improve prompt specificity
   - Ensure good image quality
   - Check lighting conditions in images

### Debug Commands

```bash
# Check if model is using GPU
python -c "import torch; print(torch.cuda.is_available())"

# Monitor GPU usage
nvidia-smi -l 1

# Check service logs
tail -f apps/sam3-service/logs/sam3.log

# Test segmentation endpoint
curl -X POST http://localhost:8001/segment \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "...",
    "text_prompt": "crack",
    "threshold": 0.5
  }'
```

## Performance Metrics

### Expected Performance

- **Inference Time**: 30-100ms per image (GPU)
- **Accuracy**: >90% for common damage types
- **Memory Usage**: 2-4GB GPU memory
- **Throughput**: 10-30 images/second (depends on GPU)

### Monitoring

The service tracks:
- Average inference time
- Confidence score distribution
- GPU memory usage
- Cache hit rates

Access metrics via logs or implement Prometheus integration.

## Production Deployment

### Docker Deployment

```dockerfile
# Dockerfile for SAM 3 service
FROM pytorch/pytorch:2.7.0-cuda12.6-cudnn9-runtime

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app/ ./app/

ENV HF_TOKEN=${HF_TOKEN}
ENV SAM_MODEL_VERSION=3

EXPOSE 8001

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Kubernetes Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sam3-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sam3-service
  template:
    metadata:
      labels:
        app: sam3-service
    spec:
      containers:
      - name: sam3
        image: mintenance/sam3-service:latest
        ports:
        - containerPort: 8001
        resources:
          requests:
            memory: "4Gi"
            nvidia.com/gpu: 1
          limits:
            memory: "8Gi"
            nvidia.com/gpu: 1
        env:
        - name: HF_TOKEN
          valueFrom:
            secretKeyRef:
              name: sam3-secrets
              key: hf-token
```

### Scaling Considerations

1. **Horizontal Scaling**: Run multiple instances behind load balancer
2. **GPU Sharing**: Use MIG (Multi-Instance GPU) for better utilization
3. **Model Caching**: Share model cache across instances via NFS/S3
4. **Request Batching**: Batch multiple images for better throughput

## API Reference

### POST /segment

Segment a single image with text prompt.

**Request:**
```json
{
  "image_base64": "base64_encoded_image",
  "text_prompt": "water damage",
  "threshold": 0.5
}
```

**Response:**
```json
{
  "success": true,
  "masks": [[[...]]],
  "boxes": [[x, y, w, h]],
  "scores": [0.95],
  "num_instances": 1
}
```

### POST /segment-damage-types

Segment multiple damage types in one image.

**Request:**
```json
{
  "image_base64": "base64_encoded_image",
  "damage_types": ["crack", "water damage", "mold"]
}
```

**Response:**
```json
{
  "success": true,
  "damage_types": {
    "crack": {
      "masks": [[[...]]],
      "boxes": [[x, y, w, h]],
      "scores": [0.88],
      "num_instances": 1
    },
    "water damage": {
      "masks": [],
      "boxes": [],
      "scores": [],
      "num_instances": 0
    }
  }
}
```

### GET /health

Check service health.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "service": "sam3-segmentation"
}
```

## Integration with Learning System

SAM 3 outputs are automatically captured for continual learning:

1. **Successful Segmentations**: Stored in `sam3_training_masks` table
2. **Prompt Effectiveness**: Tracked in `sam3_prompt_metrics`
3. **Human Validation**: Corrections stored in `sam3_corrections`
4. **Knowledge Distillation**: Used to train smaller models

The system learns:
- Which prompts work best for different damage types
- Confidence calibration per damage category
- Spatial patterns of damage occurrence
- Correlation with GPT-4 assessments

## Future Enhancements

### Planned Features

1. **Multi-Language Prompts**: Support for non-English damage descriptions
2. **Video Segmentation**: Track damage progression over time
3. **3D Reconstruction**: Combine multiple angles for 3D damage models
4. **Custom Fine-Tuning**: Train on your specific damage types
5. **Edge Deployment**: Run on mobile devices for field inspections

### Research Directions

- **Few-Shot Learning**: Adapt to new damage types with minimal examples
- **Active Learning**: Request human labels for uncertain cases
- **Explainable AI**: Visualize why SAM 3 detected specific regions
- **Multi-Modal Fusion**: Combine with thermal/infrared imaging

## Support

For issues or questions:
1. Check logs: `apps/sam3-service/logs/`
2. Review tests: `apps/web/lib/services/building-surveyor/__tests__/`
3. Open issue: https://github.com/your-repo/issues

## License

This integration uses SAM 3 under Meta's research license. Ensure compliance with:
- SAM 3 License: https://github.com/facebookresearch/sam3/blob/main/LICENSE
- Commercial usage restrictions may apply

---

*Last Updated: December 5, 2025*
*Version: 1.1.0*