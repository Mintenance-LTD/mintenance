# SAM 3 Segmentation Service

Python microservice providing text-prompted image segmentation for the Building Surveyor AI Agent.

## Features

- **Text-Prompted Segmentation**: Segment images based on natural language descriptions
- **Multi-Damage Detection**: Detect multiple damage types in a single image
- **Precise Location Mapping**: Get pixel-perfect masks and bounding boxes
- **FastAPI Service**: RESTful API for integration with Next.js app

## Prerequisites

- Python 3.12+
- CUDA-capable GPU (recommended) or CPU
- Hugging Face account and access token

## Installation

### 1. Create Virtual Environment

```bash
cd apps/sam3-service
python -m venv venv

# On Windows:
venv\Scripts\activate

# On Linux/Mac:
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Authenticate Hugging Face

**IMPORTANT**: You must request access to SAM 3 checkpoints first:

1. Visit: https://huggingface.co/facebook/sam3
2. Request access to the model
3. Once approved, authenticate:

```bash
# Install huggingface-cli if not already installed
pip install huggingface-hub

# Login
hf auth login

# Enter your Hugging Face token when prompted
# Get token from: https://huggingface.co/settings/tokens
```

### 4. Verify Installation

```bash
python -c "import sam3; print('✅ SAM 3 installed successfully')"
```

## Running the Service

### Development

```bash
cd apps/sam3-service
source venv/bin/activate  # or venv\Scripts\activate on Windows
python -m app.main
```

The service will start on `http://localhost:8001`

### Production (with Uvicorn)

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### Docker (Optional)

```bash
docker build -t sam3-service .
docker run -p 8001:8001 sam3-service
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

Response:
```json
{
  "success": true,
  "masks": [[[...]]],
  "boxes": [[x, y, w, h], ...],
  "scores": [0.95, 0.87, ...],
  "num_instances": 2
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

Response:
```json
{
  "success": true,
  "damage_types": {
    "water damage": {
      "masks": [[[...]]],
      "boxes": [[...]],
      "scores": [...],
      "num_instances": 2
    },
    "crack": {
      ...
    }
  }
}
```

## Integration with Next.js

The service is integrated with the Building Surveyor service via `SAM3Service.ts`.

Add to `.env.local`:

```bash
SAM3_SERVICE_URL=http://localhost:8001
ENABLE_SAM3_SEGMENTATION=true
HF_TOKEN=your_huggingface_token_here
```

## Troubleshooting

### Model Not Loading

- Ensure you have requested and received access to SAM 3 checkpoints on Hugging Face
- Verify `hf auth login` was successful
- Check GPU availability: `python -c "import torch; print(torch.cuda.is_available())"`

### CUDA Out of Memory

- Reduce batch size or image resolution
- Use CPU mode (slower but works): Model will automatically fall back to CPU

### Service Won't Start

- Check Python version: `python --version` (should be 3.12+)
- Verify all dependencies installed: `pip list | grep sam3`
- Check logs for specific error messages

## Performance

- **GPU (CUDA)**: ~1-2 seconds per segmentation
- **CPU**: ~5-10 seconds per segmentation
- **Memory**: ~4-8GB RAM required
- **Model Size**: ~2-4GB (downloads automatically on first run)

## License

This service uses SAM 3, which is licensed under the SAM License.
See: https://github.com/facebookresearch/sam3

