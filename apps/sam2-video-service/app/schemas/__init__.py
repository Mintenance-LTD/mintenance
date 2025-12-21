"""
SAM 2 Video Schemas
"""

from .video_requests import (
    VideoSegmentationRequest,
    VideoSegmentationResponse,
    VideoProcessingStatus,
    BoundingBox,
    DamageInstance,
    FrameDetection,
    TrackingPoint,
    DamageTrajectory,
    AggregatedDamageItem,
    VideoMetadata,
    AggregatedDamageAssessment,
    ProcessingStatus
)

__all__ = [
    'VideoSegmentationRequest',
    'VideoSegmentationResponse',
    'VideoProcessingStatus',
    'BoundingBox',
    'DamageInstance',
    'FrameDetection',
    'TrackingPoint',
    'DamageTrajectory',
    'AggregatedDamageItem',
    'VideoMetadata',
    'AggregatedDamageAssessment',
    'ProcessingStatus'
]