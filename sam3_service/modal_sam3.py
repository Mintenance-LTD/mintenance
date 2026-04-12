"""
SAM3 Segmentation Service — Modal Serverless GPU
==================================================
Serves SAM2 (Segment Anything Model 2) for building damage segmentation.
Provides the endpoints that SAM3Service.ts expects:

    GET  /health   → { status, model_loaded, service }
    POST /segment  → { success, masks, boxes, scores, num_instances }

Deploy:
    modal deploy sam3_service/modal_sam3.py

Set these Modal secrets:
    modal secret create mintenance-sam3 \
        SAM3_AUTH_TOKEN="$(openssl rand -hex 32)"

Then configure in .env.local:
    SAM3_SERVICE_URL=https://<your-org>--mint-sam3.modal.run
    SAM3_AUTH_TOKEN=<same token>
    ENABLE_SAM3_SEGMENTATION=true
    SAM3_ROLLOUT_PERCENTAGE=10
"""

from __future__ import annotations

import base64
import io
import logging
import os
import time
from typing import Any

import modal

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s - %(message)s")
logger = logging.getLogger("mint-sam3")

# ---------------------------------------------------------------------------
# Modal image
# ---------------------------------------------------------------------------
sam3_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libgl1-mesa-glx", "libglib2.0-0")
    .pip_install(
        "torch==2.4.1",
        "torchvision==0.19.1",
        "pillow==11.0.0",
        "numpy>=1.26.0",
        "sam2>=0.4.0",
        "fastapi==0.115.5",
        "uvicorn==0.32.1",
    )
    .env({"TORCH_HOME": "/model-cache"})
)

model_cache = modal.Volume.from_name("mint-sam3-model-cache", create_if_missing=True)
app = modal.App("mint-sam3-segmentation", image=sam3_image)


# ---------------------------------------------------------------------------
# SAM2 Model class
# ---------------------------------------------------------------------------
@app.cls(
    gpu="T4",
    timeout=120,
    memory=8192,
    min_containers=0,
    volumes={"/model-cache": model_cache},
    secrets=[modal.Secret.from_name("mintenance-sam3")],
)
class SAM3Model:
    model: Any
    processor: Any
    model_loaded: bool

    @modal.enter()
    def load(self) -> None:
        """Load SAM2 model on container startup."""
        import torch

        self.model_loaded = False
        try:
            from sam2.build_sam import build_sam2
            from sam2.sam2_image_predictor import SAM2ImagePredictor

            # Use sam2-hiera-small for fast inference on T4
            checkpoint = "/model-cache/sam2_hiera_small.pt"
            model_cfg = "sam2_hiera_s.yaml"

            # Download checkpoint if not cached
            if not os.path.exists(checkpoint):
                logger.info("Downloading SAM2 checkpoint...")
                import urllib.request
                url = "https://dl.fbaipublicfiles.com/segment_anything_2/072824/sam2_hiera_small.pt"
                os.makedirs("/model-cache", exist_ok=True)
                urllib.request.urlretrieve(url, checkpoint)
                logger.info("Checkpoint downloaded: %s", checkpoint)

            sam2_model = build_sam2(model_cfg, checkpoint, device="cuda")
            self.predictor = SAM2ImagePredictor(sam2_model)
            self.model_loaded = True
            logger.info("SAM2 model loaded successfully (hiera-small)")
        except Exception as exc:
            logger.error("Failed to load SAM2 model: %s", exc, exc_info=True)
            self.predictor = None

    @modal.method()
    def segment(self, image_base64: str, text_prompt: str, threshold: float = 0.5) -> dict:
        """Segment damage in an image using text-guided SAM2."""
        import numpy as np
        from PIL import Image as PILImage

        if not self.model_loaded or self.predictor is None:
            return {"success": False, "error": "Model not loaded", "masks": [], "boxes": [], "scores": [], "num_instances": 0}

        t0 = time.time()

        # Decode base64 image
        image_bytes = base64.b64decode(image_base64)
        image = PILImage.open(io.BytesIO(image_bytes)).convert("RGB")
        image_np = np.array(image)

        # Set image for prediction
        self.predictor.set_image(image_np)

        # Use automatic mask generation for damage detection
        # SAM2 doesn't have native text prompting — we use grid points as prompts
        h, w = image_np.shape[:2]
        # Generate a grid of point prompts
        grid_size = 8
        points = []
        for y in range(grid_size):
            for x in range(grid_size):
                px = int((x + 0.5) * w / grid_size)
                py = int((y + 0.5) * h / grid_size)
                points.append([px, py])

        point_coords = np.array(points)
        point_labels = np.ones(len(points), dtype=np.int32)  # all foreground

        masks_list = []
        boxes_list = []
        scores_list = []

        # Predict masks from grid points
        try:
            masks, scores, logits = self.predictor.predict(
                point_coords=point_coords,
                point_labels=point_labels,
                multimask_output=True,
            )

            for i, (mask, score) in enumerate(zip(masks, scores)):
                if score < threshold:
                    continue

                # Convert mask to bounding box
                ys, xs = np.where(mask)
                if len(ys) == 0:
                    continue

                x_min, x_max = int(xs.min()), int(xs.max())
                y_min, y_max = int(ys.min()), int(ys.max())
                box_w = x_max - x_min
                box_h = y_max - y_min

                # Skip tiny masks (noise)
                if box_w < 10 or box_h < 10:
                    continue

                masks_list.append(mask.astype(int).tolist())
                boxes_list.append([x_min, y_min, box_w, box_h])
                scores_list.append(float(score))

        except Exception as exc:
            logger.error("Prediction failed: %s", exc)
            return {"success": False, "error": str(exc), "masks": [], "boxes": [], "scores": [], "num_instances": 0}

        latency_ms = int((time.time() - t0) * 1000)
        logger.info("Segmentation: %d instances in %dms (prompt=%s)", len(masks_list), latency_ms, text_prompt[:50])

        return {
            "success": True,
            "masks": masks_list,
            "boxes": boxes_list,
            "scores": scores_list,
            "num_instances": len(masks_list),
        }

    @modal.method()
    def health_check(self) -> dict:
        return {
            "status": "healthy" if self.model_loaded else "unhealthy",
            "model_loaded": self.model_loaded,
            "service": "sam3",
        }


# ---------------------------------------------------------------------------
# FastAPI endpoints — matches SAM3Service.ts expectations
# ---------------------------------------------------------------------------
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

web_app = FastAPI(title="Mint AI SAM3 Segmentation")


def _verify_auth(request: Request) -> bool:
    secret = os.environ.get("SAM3_AUTH_TOKEN", "")
    if not secret:
        return True  # No auth configured — allow (dev mode)
    import hmac
    auth = request.headers.get("Authorization", "")
    return hmac.compare_digest(auth, f"Bearer {secret}")


@web_app.get("/health")
async def health(request: Request) -> JSONResponse:
    if not _verify_auth(request):
        raise HTTPException(status_code=401, detail="Unauthorized")
    sam3 = SAM3Model()
    result = await sam3.health_check.remote.aio()
    return JSONResponse(content=result)


@web_app.post("/segment")
async def segment(request: Request) -> JSONResponse:
    if not _verify_auth(request):
        raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    image_base64 = body.get("image_base64", "")
    text_prompt = body.get("text_prompt", "damage")
    threshold = float(body.get("threshold", 0.5))

    if not image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    sam3 = SAM3Model()
    result = await sam3.segment.remote.aio(image_base64, text_prompt, threshold)
    return JSONResponse(content=result)


@app.function(
    memory=256,
    timeout=180,
    secrets=[modal.Secret.from_name("mintenance-sam3")],
)
@modal.asgi_app(label="mint-sam3")
def fastapi_app() -> FastAPI:
    return web_app
