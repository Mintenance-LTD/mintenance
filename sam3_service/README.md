# SAM3 Segmentation Service

Serverless GPU segmentation for building damage detection using SAM2 (Segment Anything Model 2).

**Model**: SAM2 Hiera-Small (Meta, Apache 2.0) **Platform**: Modal (T4 GPU, scales to zero)

## Endpoints

| Endpoint   | Method | Description                                                |
| ---------- | ------ | ---------------------------------------------------------- |
| `/health`  | GET    | Health check: `{ status, model_loaded, service }`          |
| `/segment` | POST   | Segment damage: `{ image_base64, text_prompt, threshold }` |

## Setup

```bash
# 1. Create Modal secret
modal secret create mintenance-sam3 SAM3_AUTH_TOKEN="$(openssl rand -hex 32)"

# 2. Create volume for model cache
modal volume create mint-sam3-model-cache

# 3. Deploy
modal deploy sam3_service/modal_sam3.py
# -> https://<your-org>--mint-sam3.modal.run

# 4. Configure in .env.local
SAM3_SERVICE_URL=https://<your-org>--mint-sam3.modal.run
SAM3_AUTH_TOKEN=<same token from step 1>
ENABLE_SAM3_SEGMENTATION=true
SAM3_ROLLOUT_PERCENTAGE=10
```

## Cost

| Scenario                | GPU | Time | Cost    |
| ----------------------- | --- | ---- | ------- |
| Per request             | T4  | 1-3s | ~$0.001 |
| Cold start              | T4  | ~30s | ~$0.01  |
| Always-on (1 container) | T4  | 24/7 | ~$18/mo |
