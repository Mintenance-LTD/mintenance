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

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import base64
from io import BytesIO
from PIL import Image

from app.schemas.requests import (
    SegmentationRequest,
    SegmentationResponse,
    DamageTypeSegmentation
)
from app.models.sam3_client import SAM3Client
from contextlib import asynccontextmanager

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

# CORS configuration for Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev
        "http://127.0.0.1:3000",
        # Add production domain when ready
        # "https://your-production-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
        # Decode base64 image
        if request.image_base64.startswith('data:image'):
            # Remove data URL prefix if present
            request.image_base64 = request.image_base64.split(',')[1]
        
        image_data = base64.b64decode(request.image_base64)
        image = Image.open(BytesIO(image_data)).convert("RGB")
        
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
async def segment_damage_types(
    image_base64: str,
    damage_types: List[str] = None
):
    """
    Segment multiple damage types in a single image
    
    Args:
        image_base64: Base64-encoded image
        damage_types: List of damage type prompts (defaults to common types)
        
    Returns:
        DamageTypeSegmentation with results for each damage type
    """
    if damage_types is None:
        damage_types = ["water damage", "crack", "rot", "mold"]
    
    if not sam3_client or not sam3_client.is_ready():
        raise HTTPException(
            status_code=503,
            detail="SAM 3 model not initialized. Please check service logs."
        )
    
    try:
        # Decode image
        if image_base64.startswith('data:image'):
            image_base64 = image_base64.split(',')[1]
        
        image_data = base64.b64decode(image_base64)
        image = Image.open(BytesIO(image_data)).convert("RGB")
        
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

