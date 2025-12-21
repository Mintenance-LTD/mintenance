"""
Video Processor Service
Main orchestrator for video damage detection using SAM 2
"""

from pathlib import Path
from typing import List, Dict, Any, Optional, Callable
import asyncio
import aiohttp
import logging
import tempfile
from urllib.parse import urlparse

from app.models.sam2_video_client import SAM2VideoClient
from app.services.frame_extractor import FrameExtractor
from app.services.trajectory_tracker import TrajectoryTracker
from app.services.damage_aggregator import DamageAggregator

logger = logging.getLogger(__name__)


class VideoProcessor:
    """
    Main video processing orchestrator

    Coordinates:
    - Frame extraction
    - SAM 2 segmentation
    - Trajectory tracking
    - Damage aggregation
    """

    def __init__(
        self,
        sam2_client: SAM2VideoClient,
        frame_extractor: FrameExtractor,
        trajectory_tracker: TrajectoryTracker,
        damage_aggregator: DamageAggregator
    ):
        self.sam2_client = sam2_client
        self.frame_extractor = frame_extractor
        self.trajectory_tracker = trajectory_tracker
        self.damage_aggregator = damage_aggregator

        # Processing configuration
        self.config = {
            "batch_size": 8,  # Frames to process in batch
            "max_video_size_mb": 100,
            "supported_formats": [".mp4", ".avi", ".mov", ".webm", ".mkv"],
            "min_video_duration": 1.0,  # seconds
            "max_video_duration": 300.0  # 5 minutes
        }

        # Temporary directory for downloads
        self.temp_dir = Path(tempfile.gettempdir()) / "sam2_videos"
        self.temp_dir.mkdir(exist_ok=True)

    def is_ready(self) -> bool:
        """Check if all components are ready"""
        return (self.sam2_client and self.sam2_client.is_ready() and
                self.frame_extractor is not None and
                self.trajectory_tracker is not None and
                self.damage_aggregator is not None)

    async def process_video(
        self,
        video_path: Path,
        damage_types: List[str],
        extraction_fps: float = 2.0,
        max_duration: int = 60,
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """
        Process video for damage detection

        Args:
            video_path: Path to video file
            damage_types: List of damage types to detect
            extraction_fps: Frame extraction rate
            max_duration: Maximum duration to process
            progress_callback: Optional progress callback

        Returns:
            Complete assessment with trajectories and aggregation
        """
        if not self.is_ready():
            raise RuntimeError("Video processor not ready")

        if not video_path.exists():
            raise FileNotFoundError(f"Video not found: {video_path}")

        # Check video format
        if video_path.suffix.lower() not in self.config["supported_formats"]:
            raise ValueError(f"Unsupported video format: {video_path.suffix}")

        try:
            # Reset tracker for new video
            self.trajectory_tracker.reset()

            # Step 1: Extract frames (20% of progress)
            if progress_callback:
                progress_callback(0, "Extracting frames from video")

            extraction_result = await self.frame_extractor.extract_frames(
                video_path=video_path,
                extraction_fps=extraction_fps,
                max_duration=max_duration,
                progress_callback=lambda p, m: progress_callback(int(p * 0.2), m) if progress_callback else None
            )

            frames = extraction_result["frames"]
            frame_numbers = extraction_result["frame_numbers"]
            timestamps = extraction_result["timestamps"]
            video_metadata = extraction_result["metadata"]

            logger.info(f"Extracted {len(frames)} frames from video")

            if not frames:
                raise ValueError("No frames extracted from video")

            # Step 2: Process frames in batches (60% of progress)
            if progress_callback:
                progress_callback(20, f"Processing {len(frames)} frames with SAM 2")

            all_frame_detections = []
            batch_size = self.config["batch_size"]
            total_batches = (len(frames) + batch_size - 1) // batch_size

            for batch_idx in range(0, len(frames), batch_size):
                batch_end = min(batch_idx + batch_size, len(frames))
                batch_frames = frames[batch_idx:batch_end]
                batch_numbers = frame_numbers[batch_idx:batch_end]
                batch_timestamps = timestamps[batch_idx:batch_end]

                # Process batch with SAM 2
                batch_result = await self.sam2_client.process_frame_sequence(
                    frames=batch_frames,
                    text_prompts=damage_types,
                    frame_numbers=batch_numbers,
                    timestamps=batch_timestamps
                )

                # Update tracker with detections
                for frame_detection in batch_result["frame_detections"]:
                    # Update trajectory tracker
                    updated_tracks = self.trajectory_tracker.update(
                        frame_detection["detections"],
                        frame_detection["frame_number"],
                        frame_detection["timestamp_seconds"]
                    )

                    all_frame_detections.append(frame_detection)

                # Progress update
                if progress_callback:
                    batch_progress = (batch_idx + batch_size) / len(frames)
                    overall_progress = 20 + int(batch_progress * 60)
                    progress_callback(
                        overall_progress,
                        f"Processed batch {batch_idx // batch_size + 1}/{total_batches}"
                    )

            # Step 3: Get final trajectories (10% of progress)
            if progress_callback:
                progress_callback(80, "Analyzing damage trajectories")

            trajectories = self.trajectory_tracker.get_trajectories()
            tracking_stats = self.trajectory_tracker.get_statistics()

            logger.info(f"Tracked {len(trajectories)} damage trajectories")

            # Step 4: Aggregate assessment (10% of progress)
            if progress_callback:
                progress_callback(90, "Aggregating damage assessment")

            # Add processing ID to metadata
            video_metadata["processing_id"] = str(video_path.stem)

            aggregated_assessment = self.damage_aggregator.aggregate_assessment(
                trajectories=trajectories,
                frame_detections=all_frame_detections,
                video_metadata=video_metadata
            )

            # Final progress
            if progress_callback:
                progress_callback(100, "Video processing completed")

            # Compile final result
            result = {
                "success": True,
                "video_path": str(video_path),
                "damage_types_searched": damage_types,
                "frame_detections": all_frame_detections,
                "trajectories": trajectories,
                "tracking_statistics": tracking_stats,
                "aggregated_assessment": aggregated_assessment,
                "processing_metadata": {
                    "total_frames_extracted": len(frames),
                    "extraction_fps": extraction_fps,
                    "video_duration": video_metadata["duration_seconds"],
                    "processed_duration": video_metadata["actual_duration"],
                    "quality_stats": extraction_result.get("quality_stats", {})
                }
            }

            return result

        except Exception as e:
            logger.error(f"Video processing failed: {e}")
            raise

    async def download_video(
        self,
        video_url: str,
        processing_id: str
    ) -> Path:
        """
        Download video from URL

        Args:
            video_url: URL to video file
            processing_id: Processing job ID

        Returns:
            Path to downloaded video
        """
        try:
            # Parse URL to get filename
            parsed = urlparse(video_url)
            filename = Path(parsed.path).name or f"{processing_id}.mp4"

            # Ensure valid extension
            if not any(filename.endswith(ext) for ext in self.config["supported_formats"]):
                filename = f"{processing_id}.mp4"

            video_path = self.temp_dir / filename

            # Download video
            async with aiohttp.ClientSession() as session:
                async with session.get(video_url) as response:
                    response.raise_for_status()

                    # Check file size
                    content_length = response.headers.get('Content-Length')
                    if content_length:
                        size_mb = int(content_length) / (1024 * 1024)
                        if size_mb > self.config["max_video_size_mb"]:
                            raise ValueError(f"Video too large: {size_mb:.1f}MB > {self.config['max_video_size_mb']}MB")

                    # Download to file
                    with open(video_path, 'wb') as f:
                        async for chunk in response.content.iter_chunked(8192):
                            f.write(chunk)

            logger.info(f"Downloaded video to {video_path}")
            return video_path

        except Exception as e:
            logger.error(f"Failed to download video from {video_url}: {e}")
            raise

    async def process_video_stream(
        self,
        stream_url: str,
        damage_types: List[str],
        buffer_seconds: int = 10,
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """
        Process live video stream (future enhancement)

        Args:
            stream_url: URL to video stream
            damage_types: Damage types to detect
            buffer_seconds: Seconds to buffer before processing
            progress_callback: Progress callback

        Returns:
            Stream processing results
        """
        # Placeholder for future stream processing
        raise NotImplementedError("Stream processing not yet implemented")

    def cleanup_temp_files(self, processing_id: str):
        """
        Clean up temporary files for a processing job

        Args:
            processing_id: Processing job ID
        """
        try:
            # Find and delete temp files
            for file_path in self.temp_dir.glob(f"*{processing_id}*"):
                file_path.unlink()
                logger.debug(f"Deleted temp file: {file_path}")

        except Exception as e:
            logger.warning(f"Error cleaning up temp files: {e}")