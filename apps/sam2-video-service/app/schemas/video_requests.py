"""
Request/Response schemas for SAM 2 video processing service
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum


class ProcessingStatus(str, Enum):
    """Video processing status enum"""
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class VideoSegmentationRequest(BaseModel):
    """Request for video segmentation"""
    video_url: Optional[str] = Field(None, description="URL to video file")
    video_base64: Optional[str] = Field(None, description="Base64-encoded video")
    damage_types: Optional[List[str]] = Field(
        default=["water damage", "crack", "rot", "mold", "structural damage"],
        description="Damage types to detect"
    )
    extraction_fps: Optional[float] = Field(
        default=2.0,
        ge=0.5,
        le=10.0,
        description="Frame extraction rate (frames per second)"
    )
    confidence_threshold: Optional[float] = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Minimum confidence threshold for detections"
    )
    max_duration_seconds: Optional[int] = Field(
        default=60,
        ge=1,
        le=300,
        description="Maximum video duration to process (seconds)"
    )


class BoundingBox(BaseModel):
    """Bounding box coordinates"""
    x: float = Field(..., description="X coordinate (top-left)")
    y: float = Field(..., description="Y coordinate (top-left)")
    width: float = Field(..., description="Box width")
    height: float = Field(..., description="Box height")


class DamageInstance(BaseModel):
    """Single damage instance detection"""
    damage_type: str = Field(..., description="Type of damage detected")
    confidence: float = Field(..., description="Detection confidence (0-1)")
    bounding_box: BoundingBox = Field(..., description="Bounding box coordinates")
    mask: Optional[List[List[int]]] = Field(None, description="Segmentation mask")
    area_pixels: Optional[int] = Field(None, description="Area in pixels")


class FrameDetection(BaseModel):
    """Damage detections in a single frame"""
    frame_number: int = Field(..., description="Frame number in video")
    timestamp_seconds: float = Field(..., description="Timestamp in seconds")
    detections: List[DamageInstance] = Field(
        default=[],
        description="List of damage instances detected in this frame"
    )
    presence_scores: Dict[str, float] = Field(
        default={},
        description="Presence scores for each damage type"
    )


class TrackingPoint(BaseModel):
    """Single point in a damage trajectory"""
    frame_number: int
    timestamp_seconds: float
    bounding_box: BoundingBox
    confidence: float
    area_pixels: Optional[int] = None


class DamageTrajectory(BaseModel):
    """Tracked damage instance across multiple frames"""
    track_id: str = Field(..., description="Unique tracking ID")
    damage_type: str = Field(..., description="Type of damage")
    first_frame: int = Field(..., description="First frame where damage appears")
    last_frame: int = Field(..., description="Last frame where damage appears")
    duration_seconds: float = Field(..., description="Duration of visibility")
    average_confidence: float = Field(..., description="Average confidence across frames")
    max_confidence: float = Field(..., description="Maximum confidence observed")
    tracking_points: List[TrackingPoint] = Field(
        ...,
        description="Trajectory points across frames"
    )
    is_consistent: bool = Field(
        ...,
        description="Whether damage appears consistently across frames"
    )
    consistency_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Temporal consistency score (0-1)"
    )


class AggregatedDamageItem(BaseModel):
    """Aggregated damage information for a specific type"""
    damage_type: str
    instance_count: int = Field(..., description="Number of unique instances")
    total_detections: int = Field(..., description="Total detections across all frames")
    average_confidence: float
    max_confidence: float
    temporal_coverage: float = Field(
        ...,
        description="Percentage of video frames containing this damage"
    )
    severity_estimate: str = Field(
        ...,
        description="Estimated severity: early, midway, or full"
    )
    trajectories: List[DamageTrajectory] = Field(
        default=[],
        description="Individual damage trajectories"
    )


class VideoMetadata(BaseModel):
    """Video processing metadata"""
    total_frames: int
    processed_frames: int
    duration_seconds: float
    extraction_fps: float
    resolution: Dict[str, int] = Field(..., description="Video resolution (width, height)")


class AggregatedDamageAssessment(BaseModel):
    """Complete aggregated damage assessment from video"""
    processing_id: str
    video_metadata: VideoMetadata
    damage_summary: Dict[str, AggregatedDamageItem] = Field(
        ...,
        description="Aggregated damage by type"
    )
    total_unique_damages: int = Field(
        ...,
        description="Total number of unique damage instances"
    )
    overall_severity: str = Field(
        ...,
        description="Overall severity assessment"
    )
    confidence_level: str = Field(
        ...,
        description="Overall confidence level: low, medium, high"
    )
    high_priority_damages: List[str] = Field(
        default=[],
        description="Damage types requiring immediate attention"
    )
    temporal_analysis: Dict[str, Any] = Field(
        default={},
        description="Temporal analysis insights"
    )


class VideoProcessingStatus(BaseModel):
    """Status of video processing job"""
    processing_id: str
    status: ProcessingStatus
    progress: int = Field(ge=0, le=100, description="Processing progress (0-100)")
    message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None


class VideoSegmentationResponse(BaseModel):
    """Initial response from video processing request"""
    processing_id: str = Field(..., description="Unique processing job ID")
    status: str = Field(..., description="Initial processing status")
    message: Optional[str] = Field(None, description="Status message")
    estimated_time_seconds: Optional[int] = Field(
        None,
        description="Estimated processing time"
    )