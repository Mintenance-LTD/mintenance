# SAM 3 Integration Guide for Building Surveyor AI

**Last Updated:** November 2025  
**Status:** ✅ Integrated and Ready for Setup

---

## Overview

SAM 3 (Segment Anything Model 3) has been integrated with the Building Surveyor AI Agent to provide **pixel-perfect segmentation** of building damage. This enables precise location mapping, affected area calculations, and enhanced damage assessment.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js App (TypeScript/Node.js)                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │ BuildingSurveyorService                           │  │
│  │   ├─ GPT-4 Vision (existing)                      │  │
│  │   └─ SAM3Service (NEW) ──→ Python Microservice   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓ HTTP
┌─────────────────────────────────────────────────────────┐
│  Python Microservice (FastAPI) - Port 8001             │
│  ┌───────────────────────────────────────────────────┐  │
│  │ SAM 3 Model (PyTorch + CUDA)                      │  │
│  │   ├─ Text-prompted segmentation                   │  │
│  │   ├─ Precise masks generation                     │  │
│  │   └─ Damage location mapping                      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Setup SAM 3 Service

**On Windows:**
```powershell
cd apps/sam3-service
.\scripts\sam3-setup.ps1
# OR manually:
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**On Linux/Mac:**
```bash
cd apps/sam3-service
chmod +x ../../scripts/sam3-setup.sh
../../scripts/sam3-setup.sh
# OR manually:
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Authenticate Hugging Face

**IMPORTANT**: You must request access to SAM 3 checkpoints first!

1. Visit: https://huggingface.co/facebook/sam3
2. Request access to the model
3. Once approved:

```bash
cd apps/sam3-service
source venv/bin/activate  # or venv\Scripts\activate on Windows
hf auth login
# Enter your Hugging Face token when prompted
# Get token from: https://huggingface.co/settings/tokens
```

### 3. Start SAM 3 Service

```bash
cd apps/sam3-service
source venv/bin/activate  # or venv\Scripts\activate on Windows
python -m app.main
```

The service will start on `http://localhost:8001`

### 4. Configure Next.js App

Add to `.env.local`:

```bash
# SAM 3 Service Configuration
SAM3_SERVICE_URL=http://localhost:8001
ENABLE_SAM3_SEGMENTATION=true

# Hugging Face (optional, for direct model access)
HF_TOKEN=your_huggingface_token_here
```

### 5. Test Integration

```bash
# Health check
curl http://localhost:8001/health

# Test segmentation
curl -X POST http://localhost:8001/segment \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "base64-encoded-image-here",
    "text_prompt": "water damage",
    "threshold": 0.5
  }'
```

## Features

### 1. Precise Damage Location Mapping

SAM 3 provides pixel-perfect segmentation masks showing exactly where damage is located:

```typescript
const assessment = await BuildingSurveyorService.assessDamage(imageUrls);

if (assessment.evidence?.sam3Segmentation) {
  const { preciseMasks, preciseBoxes, affectedArea } = assessment.evidence.sam3Segmentation;
  
  // Use masks to highlight damage areas
  // Calculate exact affected area
  // Show precise bounding boxes
}
```

### 2. Enhanced Assessment Data

The assessment now includes:

```typescript
interface Phase1BuildingAssessment {
  // ... existing fields ...
  evidence?: {
    roboflowDetections?: RoboflowDetection[];
    visionAnalysis?: VisionAnalysisSummary | null;
    sam3Segmentation?: {
      preciseMasks: number[][][];      // Pixel masks
      preciseBoxes: number[][];        // [x, y, w, h] boxes
      affectedArea: number;            // Total pixels affected
      segmentationConfidence: number;  // 0-100
      masks: Array<{
        mask: number[][];
        box: number[];
        score: number;
      }>;
    };
  };
}
```

### 3. Multi-Damage Type Detection

Segment multiple damage types in a single image:

```typescript
import { SAM3Service } from '@/lib/services/building-surveyor';

const result = await SAM3Service.segmentDamageTypes(
  imageUrl,
  ['water damage', 'crack', 'rot', 'mold']
);

// Returns segmentation for each damage type
```

## API Endpoints

### Health Check

```bash
GET /health
```

Returns:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "service": "sam3-segmentation"
}
```

### Single Segmentation

```bash
POST /segment
Content-Type: application/json

{
  "image_base64": "base64-encoded-image",
  "text_prompt": "water damage on ceiling",
  "threshold": 0.5
}
```

### Multi-Damage Segmentation

```bash
POST /segment-damage-types
Content-Type: application/json

{
  "image_base64": "base64-encoded-image",
  "damage_types": ["water damage", "crack", "rot", "mold"]
}
```

## Integration Flow

1. **User uploads images** → Building Surveyor API
2. **GPT-4 Vision analyzes** → Provides damage description
3. **SAM 3 segments** (if enabled) → Provides precise locations
4. **Combined assessment** → Returns enhanced assessment with both descriptions and masks

## Configuration

### Environment Variables

```bash
# SAM 3 Service URL (default: http://localhost:8001)
SAM3_SERVICE_URL=http://localhost:8001

# Enable/disable SAM 3 segmentation (default: false)
ENABLE_SAM3_SEGMENTATION=true

# Hugging Face token (optional, for direct model access)
HF_TOKEN=your_token_here
```

### Graceful Degradation

SAM 3 is **optional**. If the service is unavailable:

- ✅ Building Surveyor continues with GPT-4 Vision only
- ✅ No errors thrown
- ✅ Assessment still works (just without precise segmentation)
- ✅ Logs warning message

## Performance

- **GPU (CUDA)**: ~1-2 seconds per segmentation
- **CPU**: ~5-10 seconds per segmentation
- **Memory**: ~4-8GB RAM required
- **Model Size**: ~2-4GB (downloads automatically on first run)

## Troubleshooting

### Service Won't Start

1. **Check Python version**: `python --version` (should be 3.12+)
2. **Verify virtual environment**: Ensure venv is activated
3. **Check dependencies**: `pip list | grep sam3`
4. **Check logs**: Look for error messages in console

### Model Not Loading

1. **Hugging Face access**: Ensure you've requested and received access
2. **Authentication**: Run `hf auth login`
3. **GPU availability**: Check with `python -c "import torch; print(torch.cuda.is_available())"`
4. **Disk space**: Model is ~2-4GB, ensure enough space

### CUDA Out of Memory

- Model automatically falls back to CPU if CUDA unavailable
- Reduce image resolution if needed
- Close other GPU-intensive applications

### Integration Errors

1. **Check service URL**: Verify `SAM3_SERVICE_URL` is correct
2. **Test health endpoint**: `curl http://localhost:8001/health`
3. **Check CORS**: Ensure Next.js origin is in CORS allowlist
4. **Check logs**: Look for error messages in both services

## Use Cases

### 1. Training Data Generation

Use SAM 3 to automatically label images for training:

```typescript
const result = await SAM3Service.segment(imageUrl, "water damage");
// Use masks to create training labels
```

### 2. Damage Progression Tracking

Compare before/after photos:

```typescript
const before = await SAM3Service.segment(beforeImage, "crack");
const after = await SAM3Service.segment(afterImage, "crack");

// Calculate growth in affected area
const growth = calculateAreaDifference(before, after);
```

### 3. Affected Area Calculations

Get precise area measurements:

```typescript
const assessment = await BuildingSurveyorService.assessDamage([imageUrl]);
const affectedArea = assessment.evidence?.sam3Segmentation?.affectedArea;

// Convert pixels to square meters if you have image scale
const squareMeters = pixelsToSquareMeters(affectedArea, imageScale);
```

## Next Steps

1. ✅ **Setup**: Follow quick start guide above
2. ✅ **Test**: Verify service is working with health check
3. ✅ **Enable**: Set `ENABLE_SAM3_SEGMENTATION=true` in `.env.local`
4. ✅ **Deploy**: Consider deploying SAM 3 service separately (GPU instance)

## Resources

- **SAM 3 GitHub**: https://github.com/facebookresearch/sam3
- **SAM 3 Hugging Face**: https://huggingface.co/facebook/sam3
- **SAM 3 Documentation**: https://ai.meta.com/sam3/

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review service logs
3. Verify Hugging Face access
4. Check SAM 3 GitHub issues

---

**Status**: ✅ Ready for production use (with proper GPU infrastructure)

