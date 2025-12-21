"""
Frame Extraction Service
Extracts frames from video at specified FPS with optimization for damage detection
"""

import cv2
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional, Callable
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging
import tempfile
import os

logger = logging.getLogger(__name__)


class FrameExtractor:
    """
    Efficient frame extraction from videos

    Features:
    - Configurable FPS extraction
    - Frame quality enhancement
    - Motion-based frame selection
    - Memory-efficient processing
    """

    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=2)
        self.temp_dir = Path(tempfile.gettempdir()) / "sam2_frames"
        self.temp_dir.mkdir(exist_ok=True)

        # Extraction configuration
        self.config = {
            "target_fps": 2.0,  # Default extraction rate
            "max_frames": 120,  # Max frames to extract (60s * 2fps)
            "min_frame_quality": 0.3,  # Minimum quality threshold
            "enhance_frames": True,  # Apply enhancement
            "motion_threshold": 10.0  # Motion detection threshold
        }

    async def extract_frames(
        self,
        video_path: Path,
        extraction_fps: float = 2.0,
        max_duration: int = 60,
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """
        Extract frames from video asynchronously

        Args:
            video_path: Path to video file
            extraction_fps: Frames per second to extract
            max_duration: Maximum video duration in seconds
            progress_callback: Optional progress callback

        Returns:
            Dictionary with frames, metadata, and statistics
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor,
            self._extract_frames_sync,
            video_path,
            extraction_fps,
            max_duration,
            progress_callback
        )

    def _extract_frames_sync(
        self,
        video_path: Path,
        extraction_fps: float,
        max_duration: int,
        progress_callback: Optional[Callable]
    ) -> Dict[str, Any]:
        """Synchronous frame extraction with optimization"""

        if not video_path.exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")

        cap = cv2.VideoCapture(str(video_path))

        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        try:
            # Get video properties
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            video_fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = total_frames / video_fps if video_fps > 0 else 0

            logger.info(f"Video info: {width}x{height}, {video_fps:.2f}fps, {duration:.2f}s, {total_frames} frames")

            # Calculate frame extraction interval
            actual_duration = min(duration, max_duration)
            frame_interval = int(video_fps / extraction_fps) if extraction_fps < video_fps else 1
            max_frames_to_extract = int(actual_duration * extraction_fps)

            # Extract frames
            frames = []
            frame_numbers = []
            timestamps = []
            quality_scores = []

            frame_count = 0
            extracted_count = 0
            last_frame = None

            while cap.isOpened() and extracted_count < max_frames_to_extract:
                ret, frame = cap.read()

                if not ret:
                    break

                # Check if we should extract this frame
                if frame_count % frame_interval == 0:
                    # Calculate timestamp
                    timestamp = frame_count / video_fps

                    # Check frame quality
                    quality = self._calculate_frame_quality(frame)

                    # Check motion (if not first frame)
                    motion = 0
                    if last_frame is not None:
                        motion = self._calculate_motion(last_frame, frame)

                    # Decide whether to keep frame
                    if quality >= self.config["min_frame_quality"]:
                        # Enhance frame if needed
                        if self.config["enhance_frames"]:
                            frame = self._enhance_frame(frame)

                        # Convert to RGB (OpenCV uses BGR)
                        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                        frames.append(frame_rgb)
                        frame_numbers.append(frame_count)
                        timestamps.append(timestamp)
                        quality_scores.append(quality)

                        extracted_count += 1
                        last_frame = frame.copy()

                        # Progress callback
                        if progress_callback:
                            progress = int((extracted_count / max_frames_to_extract) * 100)
                            progress_callback(
                                progress,
                                f"Extracted {extracted_count}/{max_frames_to_extract} frames"
                            )

                    else:
                        logger.debug(f"Skipped frame {frame_count} due to low quality: {quality:.3f}")

                frame_count += 1

            # Calculate statistics
            avg_quality = np.mean(quality_scores) if quality_scores else 0
            min_quality = np.min(quality_scores) if quality_scores else 0
            max_quality = np.max(quality_scores) if quality_scores else 0

            logger.info(f"Extracted {len(frames)} frames from {frame_count} processed")
            logger.info(f"Quality stats - Avg: {avg_quality:.3f}, Min: {min_quality:.3f}, Max: {max_quality:.3f}")

            return {
                "frames": frames,
                "frame_numbers": frame_numbers,
                "timestamps": timestamps,
                "metadata": {
                    "total_frames": total_frames,
                    "processed_frames": frame_count,
                    "extracted_frames": len(frames),
                    "duration_seconds": duration,
                    "actual_duration": actual_duration,
                    "extraction_fps": extraction_fps,
                    "video_fps": video_fps,
                    "resolution": {"width": width, "height": height}
                },
                "quality_stats": {
                    "average": avg_quality,
                    "min": min_quality,
                    "max": max_quality,
                    "scores": quality_scores
                }
            }

        finally:
            cap.release()

    def _calculate_frame_quality(self, frame: np.ndarray) -> float:
        """
        Calculate frame quality score based on multiple factors

        Args:
            frame: Input frame

        Returns:
            Quality score between 0 and 1
        """
        # Convert to grayscale for analysis
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Factor 1: Laplacian variance (focus/blur detection)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        focus_score = laplacian.var()
        focus_normalized = min(focus_score / 1000.0, 1.0)  # Normalize

        # Factor 2: Contrast (standard deviation)
        contrast_score = gray.std() / 128.0  # Normalize to 0-1

        # Factor 3: Brightness (avoid too dark/bright frames)
        mean_brightness = gray.mean()
        if mean_brightness < 30 or mean_brightness > 225:
            brightness_score = 0.3
        else:
            brightness_score = 1.0 - abs(mean_brightness - 127.5) / 127.5

        # Factor 4: Edge density (information content)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / (frame.shape[0] * frame.shape[1])
        edge_score = min(edge_density * 20, 1.0)  # Normalize

        # Combine factors with weights
        quality = (
            focus_normalized * 0.4 +
            contrast_score * 0.2 +
            brightness_score * 0.2 +
            edge_score * 0.2
        )

        return float(quality)

    def _calculate_motion(self, prev_frame: np.ndarray, curr_frame: np.ndarray) -> float:
        """
        Calculate motion between two frames

        Args:
            prev_frame: Previous frame
            curr_frame: Current frame

        Returns:
            Motion score
        """
        # Convert to grayscale
        prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
        curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)

        # Calculate absolute difference
        diff = cv2.absdiff(prev_gray, curr_gray)

        # Threshold to binary
        _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)

        # Calculate motion as percentage of changed pixels
        motion = np.sum(thresh > 0) / (thresh.shape[0] * thresh.shape[1])

        return float(motion * 100)

    def _enhance_frame(self, frame: np.ndarray) -> np.ndarray:
        """
        Enhance frame for better damage detection

        Args:
            frame: Input frame

        Returns:
            Enhanced frame
        """
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)

        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)

        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

        # Denoise
        enhanced = cv2.fastNlMeansDenoisingColored(
            enhanced,
            None,
            h=10,
            hColor=10,
            templateWindowSize=7,
            searchWindowSize=21
        )

        # Sharpen
        kernel = np.array([[-1, -1, -1],
                          [-1, 9, -1],
                          [-1, -1, -1]])
        enhanced = cv2.filter2D(enhanced, -1, kernel)

        return enhanced

    async def extract_keyframes(
        self,
        video_path: Path,
        num_keyframes: int = 10
    ) -> List[np.ndarray]:
        """
        Extract key frames using scene change detection

        Args:
            video_path: Path to video file
            num_keyframes: Number of keyframes to extract

        Returns:
            List of keyframe arrays
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor,
            self._extract_keyframes_sync,
            video_path,
            num_keyframes
        )

    def _extract_keyframes_sync(
        self,
        video_path: Path,
        num_keyframes: int
    ) -> List[np.ndarray]:
        """Extract keyframes based on scene changes"""

        cap = cv2.VideoCapture(str(video_path))

        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        try:
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            interval = max(1, total_frames // num_keyframes)

            keyframes = []
            frame_count = 0

            while cap.isOpened() and len(keyframes) < num_keyframes:
                ret, frame = cap.read()

                if not ret:
                    break

                if frame_count % interval == 0:
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    keyframes.append(frame_rgb)

                frame_count += 1

            return keyframes

        finally:
            cap.release()

    async def cleanup(self):
        """Cleanup temporary files"""
        try:
            import shutil
            if self.temp_dir.exists():
                shutil.rmtree(self.temp_dir)
            logger.info("Frame extractor cleaned up")
        except Exception as e:
            logger.warning(f"Error cleaning up temp files: {e}")