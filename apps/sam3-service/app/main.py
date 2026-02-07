"""
SAM 3 Microservice for Building Surveyor AI
FastAPI service that provides segmentation capabilities
"""

import sys
import codecs

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    try:
        if hasattr(sys.stdout, 'buffer'):
            sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        if hasattr(sys.stderr, 'buffer'):
            sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
    except (AttributeError, TypeError):
        # If stdout/stderr don't have buffer attribute, skip encoding fix
        pass

import os
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import base64
from io import BytesIO
from PIL import Image

from app.schemas.requests import (
    SegmentationRequest,
    SegmentationResponse,
    DamageTypeSegmentation,
    DamageTypeSegmentationRequest,
)
from app.models.sam3_client import SAM3Client
from app.middleware.auth import APIKeyAuthMiddleware
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

# --- Input validation constants ---
MAX_IMAGE_BASE64_LENGTH = 20 * 1024 * 1024  # ~15 MB decoded
MAX_IMAGE_DIMENSIONS = (8192, 8192)  # 8K resolution cap
MAX_DAMAGE_TYPES = 20

# Initialize SAM 3 client (lazy loading)
sam3_client: Optional[SAM3Client] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown"""
    # Startup
    global sam3_client
    try:
        sam3_client = SAM3Client()
        await sam3_client.initialize()
        print("✅ SAM 3 model initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize SAM 3: {e}")
        print("⚠️  Service will start but segmentation will be unavailable")
        # Don't raise - allow service to start even if model fails
    
    yield
    
    # Shutdown
    if sam3_client is not None:
        sam3_client.cleanup()


app = FastAPI(
    title="SAM 3 Segmentation Service",
    description="Text-prompted image segmentation for building damage detection",
    version="1.0.0",
    lifespan=lifespan
)

# API key authentication middleware (registered first so it runs after CORS)
app.add_middleware(APIKeyAuthMiddleware)

# CORS configuration for Next.js app
allowed_origins = os.environ.get(
    "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


def _validate_base64_image(image_base64: str) -> Image.Image:
    """Validate and decode a base64 image. Returns the PIL Image."""
    if len(image_base64) > MAX_IMAGE_BASE64_LENGTH:
        raise HTTPException(
            status_code=413,
            detail=f"Image too large. Maximum base64 length is {MAX_IMAGE_BASE64_LENGTH // (1024 * 1024)} MB.",
        )

    # Strip data URL prefix if present
    raw_b64 = image_base64
    if raw_b64.startswith("data:image"):
        raw_b64 = raw_b64.split(",", 1)[1]

    try:
        image_data = base64.b64decode(raw_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 encoding for image.")

    if len(image_data) == 0:
        raise HTTPException(status_code=400, detail="Decoded image is empty.")

    try:
        image = Image.open(BytesIO(image_data)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Cannot decode image. Ensure it is a valid image file.")

    # Check dimensions
    if image.width > MAX_IMAGE_DIMENSIONS[0] or image.height > MAX_IMAGE_DIMENSIONS[1]:
        raise HTTPException(
            status_code=400,
            detail=f"Image dimensions ({image.width}x{image.height}) exceed maximum ({MAX_IMAGE_DIMENSIONS[0]}x{MAX_IMAGE_DIMENSIONS[1]}).",
        )

    return image


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": sam3_client is not None and sam3_client.is_ready(),
        "service": "sam3-segmentation"
    }


@app.post("/segment", response_model=SegmentationResponse)
async def segment_image(request: SegmentationRequest):
    """
    Segment image based on text prompt
    
    Args:
        request: Segmentation request with image and text prompt
        
    Returns:
        SegmentationResponse with masks, boxes, and scores
    """
    if not sam3_client or not sam3_client.is_ready():
        raise HTTPException(
            status_code=503,
            detail="SAM 3 model not initialized. Please check service logs."
        )
    
    try:
        # Validate and decode base64 image
        image = _validate_base64_image(request.image_base64)
        
        # Perform segmentation
        result = await sam3_client.segment(
            image=image,
            text_prompt=request.text_prompt,
            threshold=request.threshold or 0.5
        )
        
        return SegmentationResponse(
            success=True,
            masks=result["masks"],
            boxes=result["boxes"],
            scores=result["scores"],
            num_instances=len(result["masks"])
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Segmentation failed: {str(e)}"
        )


@app.post("/segment-damage-types", response_model=DamageTypeSegmentation)
async def segment_damage_types(request: DamageTypeSegmentationRequest):
    """
    Segment multiple damage types in a single image

    Args:
        request: DamageTypeSegmentationRequest with image and optional damage types

    Returns:
        DamageTypeSegmentation with results for each damage type
    """
    damage_types = request.damage_types or ["water damage", "crack", "rot", "mold"]

    if len(damage_types) > MAX_DAMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Too many damage types (max {MAX_DAMAGE_TYPES}).",
        )

    if not sam3_client or not sam3_client.is_ready():
        raise HTTPException(
            status_code=503,
            detail="SAM 3 model not initialized. Please check service logs."
        )

    try:
        # Validate and decode image
        image = _validate_base64_image(request.image_base64)
        
        results = {}
        for damage_type in damage_types:
            try:
                result = await sam3_client.segment(
                    image=image,
                    text_prompt=damage_type,
                    threshold=0.5
                )
                results[damage_type] = {
                    "masks": result["masks"],
                    "boxes": result["boxes"],
                    "scores": result["scores"],
                    "num_instances": len(result["masks"])
                }
            except Exception as e:
                # Continue with other damage types if one fails
                results[damage_type] = {
                    "masks": [],
                    "boxes": [],
                    "scores": [],
                    "num_instances": 0,
                    "error": str(e)
                }
        
        return DamageTypeSegmentation(
            success=True,
            damage_types=results
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Multi-damage segmentation failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,  # Different port from Next.js (3000)
        reload=True  # Only in development
    )

