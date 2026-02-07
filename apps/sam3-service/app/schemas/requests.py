"""
Request/Response schemas for SAM 3 service
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any


class SegmentationRequest(BaseModel):
    """Request for image segmentation"""
    image_base64: str = Field(..., description="Base64-encoded image")
    text_prompt: str = Field(..., description="Text prompt describing what to segment")
    threshold: Optional[float] = Field(0.5, ge=0.0, le=1.0, description="Confidence threshold")


class SegmentationResponse(BaseModel):
    """Response from image segmentation"""
    success: bool
    masks: List[List[List[int]]] = Field(..., description="Segmentation masks")
    boxes: List[List[float]] = Field(..., description="Bounding boxes [x, y, w, h]")
    scores: List[float] = Field(..., description="Confidence scores")
    num_instances: int = Field(..., description="Number of detected instances")


class DamageTypeSegmentationRequest(BaseModel):
    """Request for multi-damage-type segmentation"""
    image_base64: str = Field(..., description="Base64-encoded image")
    damage_types: Optional[List[str]] = Field(
        default=None,
        description="Damage types to detect (defaults to common building damage types)",
        max_length=20,
    )


class DamageTypeSegmentation(BaseModel):
    """Response for multi-damage-type segmentation"""
    success: bool
    damage_types: Dict[str, Dict[str, Any]] = Field(
        ...,
        description="Results for each damage type"
    )

