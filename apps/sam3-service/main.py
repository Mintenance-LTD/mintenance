"""
SAM3 Service for Maintenance App
Provides segmentation masks for maintenance issue detection
"""

import os
import hmac

from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from starlette.middleware.base import BaseHTTPMiddleware
import torch
import numpy as np
from segment_anything import sam_model_registry, SamPredictor, SamAutomaticMaskGenerator
import cv2
from PIL import Image
import io
import base64
import logging
import time
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for model
sam_model = None
predictor = None
mask_generator = None
device = None

# --- Input validation constants ---
MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB
MAX_BASE64_LENGTH = 30 * 1024 * 1024  # ~22 MB decoded
MAX_IMAGE_DIMENSIONS = (8192, 8192)
MAX_BOXES = 50
MAX_POINTS = 100
ALLOWED_MODES = {"boxes", "points", "everything"}
EXCLUDED_AUTH_PATHS = {"/health", "/", "/docs", "/openapi.json", "/redoc"}


class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    """API key authentication middleware for SAM3 root service."""

    async def dispatch(self, request: Request, call_next):
        if request.url.path in EXCLUDED_AUTH_PATHS or request.method == "OPTIONS":
            return await call_next(request)

        expected_key = os.environ.get("API_KEY")
        if not expected_key:
            logger.warning("API_KEY not set - authentication disabled.")
            return await call_next(request)

        provided_key = request.headers.get("X-API-Key")
        if not provided_key:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                provided_key = auth_header[7:]

        if not provided_key:
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing API key. Provide X-API-Key or Authorization: Bearer header."},
            )

        if not hmac.compare_digest(provided_key.encode(), expected_key.encode()):
            return JSONResponse(status_code=403, content={"detail": "Invalid API key."})

        return await call_next(request)


class SegmentationRequest(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    boxes: Optional[List[List[float]]] = Field(
        default=None, description="Bounding boxes [[x1,y1,x2,y2], ...]"
    )
    points: Optional[List[List[float]]] = Field(
        default=None, description="Point prompts [[x,y], ...]"
    )
    mode: str = Field(default="boxes", description="Segmentation mode: boxes, points, or everything")
    refine_masks: bool = True
    min_mask_region_area: int = Field(default=100, ge=0, le=1_000_000)


class SegmentationResponse(BaseModel):
    masks: List[List[List[int]]]  # Binary masks
    boxes: List[List[float]]  # Bounding boxes
    scores: List[float]  # Confidence scores
    areas: List[int]  # Pixel counts
    num_instances: int
    processing_time_ms: float

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize model on startup, cleanup on shutdown"""
    global sam_model, predictor, mask_generator, device

    logger.info("Initializing SAM3 model...")

    # Determine device
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device}")

    # Load model
    model_type = "vit_h"  # Largest, most accurate model
    checkpoint_path = "model_cache/sam_vit_h_4b8939.pth"

    try:
        sam_model = sam_model_registry[model_type](checkpoint=checkpoint_path)
        sam_model.to(device=device)
        sam_model.eval()

        # Initialize predictor for box/point prompts
        predictor = SamPredictor(sam_model)

        # Initialize mask generator for automatic segmentation
        mask_generator = SamAutomaticMaskGenerator(
            sam_model,
            points_per_side=32,
            pred_iou_thresh=0.86,
            stability_score_thresh=0.92,
            crop_n_layers=1,
            crop_n_points_downscale_factor=2,
            min_mask_region_area=100,
        )

        logger.info("SAM3 model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load SAM3 model: {e}")
        raise

    yield

    # Cleanup
    logger.info("Shutting down SAM3 service")
    if sam_model:
        del sam_model
    if predictor:
        del predictor
    if mask_generator:
        del mask_generator
    torch.cuda.empty_cache()

app = FastAPI(
    title="SAM3 Segmentation Service",
    version="1.0.0",
    description="Segment Anything Model 3 for Maintenance App",
    lifespan=lifespan
)

# API key authentication
app.add_middleware(APIKeyAuthMiddleware)


def _validate_image_from_bytes(image_bytes: bytes) -> Image.Image:
    """Validate image bytes and return PIL Image."""
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Image data is empty.")
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Cannot decode image. Ensure it is a valid image file.")
    if image.width > MAX_IMAGE_DIMENSIONS[0] or image.height > MAX_IMAGE_DIMENSIONS[1]:
        raise HTTPException(
            status_code=400,
            detail=f"Image dimensions ({image.width}x{image.height}) exceed maximum {MAX_IMAGE_DIMENSIONS}.",
        )
    return image


@app.get("/health")
async def health_check():
    """Check if service is healthy and model is loaded"""
    if sam_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return {
        "status": "healthy",
        "model_loaded": True,
        "device": device,
        "cuda_available": torch.cuda.is_available(),
        "memory_allocated": torch.cuda.memory_allocated() if torch.cuda.is_available() else 0
    }

@app.post("/segment", response_model=SegmentationResponse)
async def segment_image(
    file: Optional[UploadFile] = File(None),
    request_json: Optional[str] = Form(None)
):
    """
    Segment image using SAM3
    Accepts either file upload or JSON with image URL/base64
    """
    start_time = time.time()

    try:
        # Parse request
        if request_json:
            import json
            try:
                request = SegmentationRequest(**json.loads(request_json))
            except Exception as parse_err:
                raise HTTPException(status_code=400, detail=f"Invalid request JSON: {parse_err}")
        else:
            request = SegmentationRequest()

        # Validate mode
        if request.mode not in ALLOWED_MODES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid mode '{request.mode}'. Allowed: {', '.join(ALLOWED_MODES)}",
            )

        # Validate box/point counts
        if request.boxes and len(request.boxes) > MAX_BOXES:
            raise HTTPException(status_code=400, detail=f"Too many boxes (max {MAX_BOXES}).")
        if request.points and len(request.points) > MAX_POINTS:
            raise HTTPException(status_code=400, detail=f"Too many points (max {MAX_POINTS}).")

        # Load and validate image
        if file:
            image_bytes = await file.read()
            if len(image_bytes) > MAX_UPLOAD_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
                )
            image = _validate_image_from_bytes(image_bytes)
        elif request.image_base64:
            if len(request.image_base64) > MAX_BASE64_LENGTH:
                raise HTTPException(status_code=413, detail="Base64 image data too large.")
            try:
                image_bytes = base64.b64decode(request.image_base64)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid base64 encoding.")
            image = _validate_image_from_bytes(image_bytes)
        elif request.image_url:
            # For production, implement proper image fetching from URL
            raise HTTPException(status_code=400, detail="URL fetching not implemented in demo")
        else:
            raise HTTPException(status_code=400, detail="No image provided")

        # Convert to numpy array
        image_np = np.array(image)

        # Perform segmentation based on mode
        if request.mode == "everything":
            # Automatic segmentation - find all objects
            masks_result = mask_generator.generate(image_np)

            # Extract results
            masks = [m["segmentation"].astype(int).tolist() for m in masks_result]
            boxes = [m["bbox"] for m in masks_result]  # [x,y,w,h] format
            scores = [m["predicted_iou"] for m in masks_result]
            areas = [m["area"] for m in masks_result]

        elif request.mode == "boxes" and request.boxes:
            # Box-prompted segmentation
            predictor.set_image(image_np)

            masks = []
            scores = []
            boxes = []
            areas = []

            for box in request.boxes:
                # Convert box format [x1,y1,x2,y2]
                input_box = np.array(box)

                # Get mask for this box
                mask, score, _ = predictor.predict(
                    box=input_box,
                    multimask_output=False
                )

                # mask is (1, H, W), squeeze it
                mask = mask[0]

                # Calculate area
                area = int(mask.sum())

                # Only keep if area is significant
                if area >= request.min_mask_region_area:
                    masks.append(mask.astype(int).tolist())
                    scores.append(float(score[0]))
                    boxes.append(box)
                    areas.append(area)

        elif request.mode == "points" and request.points:
            # Point-prompted segmentation
            predictor.set_image(image_np)

            # Convert points
            input_points = np.array(request.points)
            input_labels = np.ones(len(request.points))  # All positive points

            # Get masks
            masks_out, scores_out, _ = predictor.predict(
                point_coords=input_points,
                point_labels=input_labels,
                multimask_output=True  # Get multiple masks
            )

            # Select best mask
            best_idx = np.argmax(scores_out)
            mask = masks_out[best_idx]
            score = scores_out[best_idx]

            # Calculate bounding box
            y_indices, x_indices = np.where(mask)
            if len(x_indices) > 0 and len(y_indices) > 0:
                x_min, x_max = x_indices.min(), x_indices.max()
                y_min, y_max = y_indices.min(), y_indices.max()
                box = [float(x_min), float(y_min), float(x_max), float(y_max)]
            else:
                box = [0, 0, 0, 0]

            masks = [mask.astype(int).tolist()]
            scores = [float(score)]
            boxes = [box]
            areas = [int(mask.sum())]

        else:
            raise HTTPException(status_code=400, detail="Invalid mode or missing prompts")

        # Refine masks if requested
        if request.refine_masks and len(masks) > 0:
            masks = refine_masks(masks)

        # Calculate processing time
        processing_time_ms = (time.time() - start_time) * 1000

        return SegmentationResponse(
            masks=masks,
            boxes=boxes,
            scores=scores,
            areas=areas,
            num_instances=len(masks),
            processing_time_ms=processing_time_ms
        )

    except Exception as e:
        logger.error(f"Segmentation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def refine_masks(masks: List[List[List[int]]]) -> List[List[List[int]]]:
    """
    Refine masks using morphological operations
    Removes small noise and smooths boundaries
    """
    refined = []

    for mask in masks:
        mask_np = np.array(mask, dtype=np.uint8)

        # Morphological operations
        kernel = np.ones((3, 3), np.uint8)

        # Remove small noise
        mask_np = cv2.morphologyEx(mask_np, cv2.MORPH_OPEN, kernel)

        # Fill small holes
        mask_np = cv2.morphologyEx(mask_np, cv2.MORPH_CLOSE, kernel)

        # Smooth boundaries
        mask_np = cv2.medianBlur(mask_np, 5)

        refined.append(mask_np.tolist())

    return refined

@app.post("/segment_maintenance")
async def segment_maintenance_issue(
    file: UploadFile = File(...),
    issue_type: Optional[str] = Form(None)
):
    """
    Specialized endpoint for maintenance issues
    Automatically finds and segments damage areas
    """
    start_time = time.time()

    try:
        # Read and validate image
        image_bytes = await file.read()
        if len(image_bytes) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
            )
        image = _validate_image_from_bytes(image_bytes)
        image_np = np.array(image)

        # Generate all masks
        masks_result = mask_generator.generate(image_np)

        # Filter masks based on maintenance heuristics
        maintenance_masks = []

        for mask_data in masks_result:
            mask = mask_data["segmentation"]
            bbox = mask_data["bbox"]
            score = mask_data["predicted_iou"]
            area = mask_data["area"]

            # Heuristics for maintenance issues
            # 1. Size: Not too small, not too large
            image_area = image_np.shape[0] * image_np.shape[1]
            area_ratio = area / image_area

            if 0.001 < area_ratio < 0.5:  # Between 0.1% and 50% of image
                # 2. Shape: Irregular shapes often indicate damage
                # Calculate compactness (perimeter^2 / area)
                contours, _ = cv2.findContours(
                    mask.astype(np.uint8),
                    cv2.RETR_EXTERNAL,
                    cv2.CHAIN_APPROX_SIMPLE
                )

                if contours:
                    perimeter = cv2.arcLength(contours[0], True)
                    compactness = (perimeter ** 2) / (area + 1e-6)

                    # Higher compactness = more irregular
                    if compactness > 15:  # Threshold for irregular shapes
                        maintenance_masks.append({
                            "mask": mask.astype(int).tolist(),
                            "bbox": bbox,
                            "score": float(score),
                            "area": int(area),
                            "compactness": float(compactness),
                            "likely_damage": True
                        })

        # Sort by likelihood of being damage (score * compactness)
        maintenance_masks.sort(
            key=lambda x: x["score"] * (x["compactness"] / 100),
            reverse=True
        )

        # Keep top 5 most likely damage areas
        maintenance_masks = maintenance_masks[:5]

        processing_time_ms = (time.time() - start_time) * 1000

        return {
            "damage_areas": maintenance_masks,
            "num_potential_issues": len(maintenance_masks),
            "processing_time_ms": processing_time_ms,
            "issue_type_hint": issue_type
        }

    except Exception as e:
        logger.error(f"Maintenance segmentation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Service info"""
    return {
        "service": "SAM3 Segmentation Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/health",
            "/segment",
            "/segment_maintenance"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)