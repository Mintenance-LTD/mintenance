"""
SAM3 Service for Maintenance App
Provides segmentation masks for maintenance issue detection
"""

from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
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

class SegmentationRequest(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    boxes: Optional[List[List[float]]] = None  # [[x1,y1,x2,y2], ...]
    points: Optional[List[List[float]]] = None  # [[x,y], ...]
    mode: str = "boxes"  # "boxes", "points", "everything"
    refine_masks: bool = True
    min_mask_region_area: int = 100

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
            request = SegmentationRequest(**json.loads(request_json))
        else:
            request = SegmentationRequest()

        # Load image
        if file:
            image_bytes = await file.read()
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        elif request.image_base64:
            image_bytes = base64.b64decode(request.image_base64)
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
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
        # Read image
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
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