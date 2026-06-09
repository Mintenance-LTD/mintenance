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
import os
import re
from io import BytesIO

from app.middleware.auth import APIKeyAuthMiddleware

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

# Processing status store — Redis-backed when REDIS_URL is set, in-memory
# fallback otherwise (audit 2026-06-09 closed the Sprint 7 (6.3) TODO: the
# dict lost every in-flight job on container restart and blocked horizontal
# scaling). Route handlers go through the load/save helpers below so the
# Pydantic shape (VideoProcessingStatus) round-trips Redis JSON cleanly.
from app.services.status_store import build_status_store

status_store = build_status_store()

# Hard ceiling on a single video job. The processor awaits between frame
# batches, so asyncio.wait_for cancellation fires at batch boundaries.
# Default 600s is generous for the 60s/2fps capability advertised by
# /health; raise via env for bigger deployments.
PROCESS_TIMEOUT_SECONDS = int(
    os.environ.get("SAM2_PROCESS_TIMEOUT_SECONDS", "600")
)


def _save_status(status: VideoProcessingStatus) -> None:
    status_store.set(status.processing_id, status.model_dump(mode="json"))


def _load_status(processing_id: str) -> Optional[VideoProcessingStatus]:
    raw = status_store.get(processing_id)
    if raw is None:
        return None
    try:
        return VideoProcessingStatus.model_validate(raw)
    except Exception as e:  # corrupt/stale payload — drop rather than 500
        logger.warning(f"Dropping corrupt status payload for {processing_id}: {e}")
        status_store.delete(processing_id)
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown"""
    # Sprint 7 (6.6): fail fast at startup when API_KEY is unset so the
    # orchestrator surfaces a clear boot error. Previously every request
    # came back with an opaque 503 from the auth middleware. Opt-out via
    # SAM2_ALLOW_UNAUTHENTICATED=true for local dev.
    allow_insecure = (
        os.environ.get("SAM2_ALLOW_UNAUTHENTICATED", "").lower() == "true"
        or os.environ.get("NODE_ENV", "").lower() == "development"
    )
    if not os.environ.get("API_KEY") and not allow_insecure:
        logger.error("SAM2 refusing to start: API_KEY is not set.")
        logger.error("Set API_KEY in your environment, or set")
        logger.error("SAM2_ALLOW_UNAUTHENTICATED=true for local development only.")
        sys.exit(1)

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

# API key authentication middleware (registered first so it runs after CORS)
app.add_middleware(APIKeyAuthMiddleware)

# CORS configuration
if os.environ.get("API_KEY") and not os.environ.get("CORS_ORIGINS"):
    # Authenticated (production-shaped) deployment still using the localhost
    # default — almost certainly a misconfiguration (audit 2026-06-09 P3).
    logger.warning(
        "CORS_ORIGINS not set — defaulting to localhost origins. "
        "Set CORS_ORIGINS to your production web origin(s)."
    )
allowed_origins = os.environ.get(
    "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_credentials=True,
    allow_methods=["POST", "GET", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# --- Input validation constants ---
MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
ALLOWED_VIDEO_CONTENT_TYPES = {
    "video/mp4", "video/x-msvideo", "video/quicktime",
    "video/x-matroska", "video/webm",
}
UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE
)


def _validate_processing_id(processing_id: str) -> None:
    """Validate that a processing ID is a well-formed UUID."""
    if not UUID_PATTERN.match(processing_id):
        raise HTTPException(status_code=400, detail="Invalid processing ID format (expected UUID)")


def _validate_video_upload(video_file: UploadFile, content: bytes) -> None:
    """Validate video upload: size, extension, and content type."""
    if len(content) > MAX_VIDEO_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Video file too large. Maximum size is {MAX_VIDEO_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded video file is empty.")

    filename = video_file.filename or ""
    ext = Path(filename).suffix.lower()
    if ext and ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format '{ext}'. Allowed: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}",
        )

    if video_file.content_type and video_file.content_type not in ALLOWED_VIDEO_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported content type '{video_file.content_type}'.",
        )


def _sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal attacks."""
    if not filename:
        return "upload.mp4"
    # Strip directory components and dangerous characters
    basename = Path(filename).name
    return re.sub(r"[^\w.\-]", "_", basename)


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

    # Validate damage_types length
    if len(damage_types) > 20:
        raise HTTPException(status_code=400, detail="Too many damage types (max 20).")

    # Generate processing ID
    processing_id = str(uuid.uuid4())

    # Initialize status
    _save_status(VideoProcessingStatus(
        processing_id=processing_id,
        status="queued",
        progress=0,
        started_at=datetime.utcnow(),
        message="Video queued for processing"
    ))

    try:
        # Read and validate uploaded video
        video_content = await video_file.read()
        _validate_video_upload(video_file, video_content)

        # Sanitize filename and save temporarily
        safe_name = _sanitize_filename(video_file.filename or "upload.mp4")
        video_path = Path(f"/tmp/{processing_id}_{safe_name}")

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

    except HTTPException:
        # Validation rejections (413/400) — mark failed and re-raise as-is
        # rather than collapsing everything to a 500.
        failed = _load_status(processing_id)
        if failed:
            failed.status = "failed"
            failed.error = "Upload validation failed"
            failed.completed_at = datetime.utcnow()
            _save_status(failed)
        raise
    except Exception as e:
        _save_status(VideoProcessingStatus(
            processing_id=processing_id,
            status="failed",
            progress=0,
            started_at=datetime.utcnow(),
            error=str(e),
            completed_at=datetime.utcnow()
        ))
        raise HTTPException(status_code=500, detail=str(e))


async def process_video_async(
    processing_id: str,
    video_path: Path,
    damage_types: List[str]
):
    """
    Async video processing with progress tracking
    """
    status = _load_status(processing_id) or VideoProcessingStatus(
        processing_id=processing_id,
        status="queued",
        progress=0,
        started_at=datetime.utcnow(),
    )
    try:
        # Update status to processing
        status.status = "processing"
        status.message = "Extracting frames from video"
        _save_status(status)

        # Process the video. wait_for puts a hard ceiling on a hung model —
        # the processor awaits between frame batches, so cancellation fires
        # at the next batch boundary (audit 2026-06-09 P2).
        result = await asyncio.wait_for(
            video_processor.process_video(
                video_path=video_path,
                damage_types=damage_types,
                progress_callback=lambda p, m: update_progress(processing_id, p, m)
            ),
            timeout=PROCESS_TIMEOUT_SECONDS,
        )

        # Store result and update status
        status = _load_status(processing_id) or status
        status.status = "completed"
        status.progress = 100
        status.completed_at = datetime.utcnow()
        status.result = result
        status.message = "Video processing completed successfully"
        _save_status(status)

        # Cleanup temporary video file
        if video_path.exists():
            video_path.unlink()

    except asyncio.TimeoutError:
        logger.error(
            f"Video processing timed out for {processing_id} "
            f"after {PROCESS_TIMEOUT_SECONDS}s"
        )
        status = _load_status(processing_id) or status
        status.status = "failed"
        status.error = (
            f"Processing exceeded the {PROCESS_TIMEOUT_SECONDS}s limit "
            "(SAM2_PROCESS_TIMEOUT_SECONDS)"
        )
        status.completed_at = datetime.utcnow()
        _save_status(status)

        if video_path.exists():
            video_path.unlink()

    except Exception as e:
        logger.error(f"Video processing failed for {processing_id}: {e}")
        status = _load_status(processing_id) or status
        status.status = "failed"
        status.error = str(e)
        status.completed_at = datetime.utcnow()
        _save_status(status)

        # Cleanup on failure
        if video_path.exists():
            video_path.unlink()


def update_progress(processing_id: str, progress: int, message: str):
    """Update processing progress"""
    status = _load_status(processing_id)
    if status is not None:
        status.progress = progress
        status.message = message
        _save_status(status)


@app.get("/processing-status/{processing_id}")
async def get_processing_status(processing_id: str):
    """
    Get current processing status for a video

    Args:
        processing_id: UUID of the processing job

    Returns:
        Current processing status and results if completed
    """
    _validate_processing_id(processing_id)

    status = _load_status(processing_id)
    if status is None:
        raise HTTPException(
            status_code=404,
            detail="Processing ID not found"
        )

    return {
        "processing_id": status.processing_id,
        "status": status.status,
        "progress": status.progress,
        "message": status.message,
        "started_at": status.started_at,
        "completed_at": status.completed_at,
        "error": status.error,
        "result": status.result
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
    _save_status(VideoProcessingStatus(
        processing_id=processing_id,
        status="queued",
        progress=0,
        started_at=datetime.utcnow(),
        message="Downloading video from URL"
    ))

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
        status = _load_status(processing_id)
        if status is not None:
            status.status = "downloading"
            status.message = "Downloading video"
            _save_status(status)

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
        status = _load_status(processing_id)
        if status is not None:
            status.status = "failed"
            status.error = str(e)
            status.completed_at = datetime.utcnow()
            _save_status(status)


@app.get("/aggregated-assessment/{processing_id}")
async def get_aggregated_assessment(processing_id: str):
    """
    Get aggregated damage assessment from completed video processing

    Args:
        processing_id: UUID of completed processing job

    Returns:
        AggregatedDamageAssessment with comprehensive damage analysis
    """
    _validate_processing_id(processing_id)

    status = _load_status(processing_id)
    if status is None:
        raise HTTPException(
            status_code=404,
            detail="Processing ID not found"
        )

    if status.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Processing not completed. Current status: {status.status}"
        )

    if not status.result:
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
    _validate_processing_id(processing_id)

    if status_store.get(processing_id) is not None:
        status_store.delete(processing_id)
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
    for pid, raw in status_store.list_active().items():
        if raw.get("status") in ["queued", "processing", "downloading"]:
            active.append({
                "processing_id": pid,
                "status": raw.get("status"),
                "progress": raw.get("progress"),
                "started_at": raw.get("started_at"),
                "message": raw.get("message")
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