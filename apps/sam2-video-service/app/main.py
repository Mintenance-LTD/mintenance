"""
SAM 2 Video Processing Microservice for Building Surveyor AI
FastAPI service that provides video-based damage tracking and segmentation
"""

import sys
import codecs
import asyncio
import logging
from pathlib import Path
from typing import List, Dict, Optional, Any
from datetime import datetime
import uuid

# Fix Windows console encoding for logging
if sys.platform == 'win32':
    try:
        if hasattr(sys.stdout, 'buffer'):
            sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        if hasattr(sys.stderr, 'buffer'):
            sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
    except (AttributeError, TypeError):
        pass

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import base64
from io import BytesIO

from app.schemas.video_requests import (
    VideoSegmentationRequest,
    VideoSegmentationResponse,
    VideoProcessingStatus,
    FrameDetection,
    DamageTrajectory,
    AggregatedDamageAssessment
)
from app.models.sam2_video_client import SAM2VideoClient
from app.services.video_processor import VideoProcessor
from app.services.trajectory_tracker import TrajectoryTracker
from app.services.damage_aggregator import DamageAggregator
from app.services.frame_extractor import FrameExtractor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances
sam2_client: Optional[SAM2VideoClient] = None
video_processor: Optional[VideoProcessor] = None
trajectory_tracker: Optional[TrajectoryTracker] = None
damage_aggregator: Optional[DamageAggregator] = None
frame_extractor: Optional[FrameExtractor] = None

# In-memory processing status store (use Redis in production)
processing_status: Dict[str, VideoProcessingStatus] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown"""
    # Startup
    global sam2_client, video_processor, trajectory_tracker, damage_aggregator, frame_extractor

    try:
        # Initialize SAM2 model
        sam2_client = SAM2VideoClient()
        await sam2_client.initialize()
        logger.info("SAM 2 video model initialized successfully")

        # Initialize services
        frame_extractor = FrameExtractor()
        trajectory_tracker = TrajectoryTracker()
        damage_aggregator = DamageAggregator()
        video_processor = VideoProcessor(
            sam2_client=sam2_client,
            frame_extractor=frame_extractor,
            trajectory_tracker=trajectory_tracker,
            damage_aggregator=damage_aggregator
        )

        logger.info("All video processing services initialized")

    except Exception as e:
        logger.error(f"Failed to initialize SAM 2 video services: {e}")
        logger.warning("Service will start but video processing will be unavailable")

    yield

    # Shutdown
    if sam2_client:
        await sam2_client.cleanup()
    if frame_extractor:
        await frame_extractor.cleanup()


app = FastAPI(
    title="SAM 2 Video Segmentation Service",
    description="Temporal damage tracking for property walkthrough videos",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
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
        "model_loaded": sam2_client is not None and sam2_client.is_ready(),
        "service": "sam2-video-segmentation",
        "capabilities": {
            "max_video_duration_seconds": 60,
            "extraction_fps": 2,
            "temporal_tracking": True,
            "streaming_memory": True
        }
    }


@app.post("/process-video", response_model=VideoSegmentationResponse)
async def process_video(
    video_file: UploadFile = File(...),
    damage_types: List[str] = None,
    background_tasks: BackgroundTasks = None
):
    """
    Process video for damage detection with temporal tracking

    Args:
        video_file: Uploaded video file
        damage_types: Optional list of damage types to detect

    Returns:
        VideoSegmentationResponse with processing ID and initial status
    """
    if not video_processor or not video_processor.is_ready():
        raise HTTPException(
            status_code=503,
            detail="SAM 2 video processor not initialized"
        )

    # Default damage types
    if damage_types is None:
        damage_types = ["water damage", "crack", "rot", "mold", "structural damage"]

    # Generate processing ID
    processing_id = str(uuid.uuid4())

    # Initialize status
    processing_status[processing_id] = VideoProcessingStatus(
        processing_id=processing_id,
        status="queued",
        progress=0,
        started_at=datetime.utcnow(),
        message="Video queued for processing"
    )

    try:
        # Save uploaded video temporarily
        video_path = Path(f"/tmp/{processing_id}_{video_file.filename}")
        video_content = await video_file.read()

        with open(video_path, "wb") as f:
            f.write(video_content)

        # Start background processing
        if background_tasks:
            background_tasks.add_task(
                process_video_async,
                processing_id,
                video_path,
                damage_types
            )
        else:
            # Process synchronously for testing
            await process_video_async(processing_id, video_path, damage_types)

        return VideoSegmentationResponse(
            processing_id=processing_id,
            status="processing",
            message="Video processing started"
        )

    except Exception as e:
        processing_status[processing_id] = VideoProcessingStatus(
            processing_id=processing_id,
            status="failed",
            progress=0,
            error=str(e),
            completed_at=datetime.utcnow()
        )
        raise HTTPException(status_code=500, detail=str(e))


async def process_video_async(
    processing_id: str,
    video_path: Path,
    damage_types: List[str]
):
    """
    Async video processing with progress tracking
    """
    try:
        # Update status to processing
        processing_status[processing_id].status = "processing"
        processing_status[processing_id].message = "Extracting frames from video"

        # Process the video
        result = await video_processor.process_video(
            video_path=video_path,
            damage_types=damage_types,
            progress_callback=lambda p, m: update_progress(processing_id, p, m)
        )

        # Store result and update status
        processing_status[processing_id].status = "completed"
        processing_status[processing_id].progress = 100
        processing_status[processing_id].completed_at = datetime.utcnow()
        processing_status[processing_id].result = result
        processing_status[processing_id].message = "Video processing completed successfully"

        # Cleanup temporary video file
        if video_path.exists():
            video_path.unlink()

    except Exception as e:
        logger.error(f"Video processing failed for {processing_id}: {e}")
        processing_status[processing_id].status = "failed"
        processing_status[processing_id].error = str(e)
        processing_status[processing_id].completed_at = datetime.utcnow()

        # Cleanup on failure
        if video_path.exists():
            video_path.unlink()


def update_progress(processing_id: str, progress: int, message: str):
    """Update processing progress"""
    if processing_id in processing_status:
        processing_status[processing_id].progress = progress
        processing_status[processing_id].message = message


@app.get("/processing-status/{processing_id}")
async def get_processing_status(processing_id: str):
    """
    Get current processing status for a video

    Args:
        processing_id: UUID of the processing job

    Returns:
        Current processing status and results if completed
    """
    if processing_id not in processing_status:
        raise HTTPException(
            status_code=404,
            detail="Processing ID not found"
        )

    status = processing_status[processing_id]

    return {
        "processing_id": status.processing_id,
        "status": status.status,
        "progress": status.progress,
        "message": status.message,
        "started_at": status.started_at,
        "completed_at": status.completed_at,
        "error": status.error,
        "result": status.result if hasattr(status, 'result') else None
    }


@app.post("/process-video-url")
async def process_video_url(
    request: VideoSegmentationRequest,
    background_tasks: BackgroundTasks
):
    """
    Process video from URL with temporal tracking

    Args:
        request: Video segmentation request with URL and parameters

    Returns:
        Processing ID and initial status
    """
    if not video_processor or not video_processor.is_ready():
        raise HTTPException(
            status_code=503,
            detail="SAM 2 video processor not initialized"
        )

    processing_id = str(uuid.uuid4())

    # Initialize status
    processing_status[processing_id] = VideoProcessingStatus(
        processing_id=processing_id,
        status="queued",
        progress=0,
        started_at=datetime.utcnow(),
        message="Downloading video from URL"
    )

    # Start background processing
    background_tasks.add_task(
        process_video_from_url_async,
        processing_id,
        request
    )

    return {
        "processing_id": processing_id,
        "status": "queued",
        "message": "Video queued for processing"
    }


async def process_video_from_url_async(
    processing_id: str,
    request: VideoSegmentationRequest
):
    """
    Process video from URL asynchronously
    """
    try:
        # Update status
        processing_status[processing_id].status = "downloading"
        processing_status[processing_id].message = "Downloading video"

        # Download video
        video_path = await video_processor.download_video(
            request.video_url,
            processing_id
        )

        # Process video
        await process_video_async(
            processing_id,
            video_path,
            request.damage_types or ["water damage", "crack", "rot", "mold"]
        )

    except Exception as e:
        logger.error(f"Failed to process video from URL: {e}")
        processing_status[processing_id].status = "failed"
        processing_status[processing_id].error = str(e)
        processing_status[processing_id].completed_at = datetime.utcnow()


@app.get("/aggregated-assessment/{processing_id}")
async def get_aggregated_assessment(processing_id: str):
    """
    Get aggregated damage assessment from completed video processing

    Args:
        processing_id: UUID of completed processing job

    Returns:
        AggregatedDamageAssessment with comprehensive damage analysis
    """
    if processing_id not in processing_status:
        raise HTTPException(
            status_code=404,
            detail="Processing ID not found"
        )

    status = processing_status[processing_id]

    if status.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Processing not completed. Current status: {status.status}"
        )

    if not hasattr(status, 'result') or not status.result:
        raise HTTPException(
            status_code=500,
            detail="No results available for completed processing"
        )

    # Return the aggregated assessment
    return status.result.get('aggregated_assessment', {})


@app.delete("/processing-status/{processing_id}")
async def cleanup_processing(processing_id: str):
    """
    Clean up processing data and free memory

    Args:
        processing_id: UUID of processing job to clean up
    """
    if processing_id in processing_status:
        del processing_status[processing_id]
        return {"message": "Processing data cleaned up"}

    raise HTTPException(
        status_code=404,
        detail="Processing ID not found"
    )


@app.get("/active-processings")
async def get_active_processings():
    """
    Get list of all active video processing jobs

    Returns:
        List of active processing jobs with their status
    """
    active = []
    for pid, status in processing_status.items():
        if status.status in ["queued", "processing", "downloading"]:
            active.append({
                "processing_id": pid,
                "status": status.status,
                "progress": status.progress,
                "started_at": status.started_at,
                "message": status.message
            })

    return {
        "active_count": len(active),
        "active_processings": active
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8002,  # Different port from SAM3 (8001) and Next.js (3000)
        reload=True
    )