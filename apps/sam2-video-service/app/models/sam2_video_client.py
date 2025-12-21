"""
SAM 2 Video Client
Handles SAM 2 model loading and video segmentation with temporal tracking
"""

import torch
import numpy as np
from PIL import Image
from typing import Dict, List, Optional, Any, Tuple
import asyncio
from concurrent.futures import ThreadPoolExecutor
import os
import json
import hashlib
from pathlib import Path
import time
import logging

logger = logging.getLogger(__name__)

try:
    # Import SAM 2 video components
    from sam2.model.sam2_model import build_sam2_video_model
    from sam2.model.video_processor import VideoStreamProcessor
    from sam2.model.memory_bank import StreamingMemoryBank
    from sam2.model.tracker import ObjectTracker
except ImportError:
    # Graceful degradation if SAM 2 not installed
    build_sam2_video_model = None
    VideoStreamProcessor = None
    StreamingMemoryBank = None
    ObjectTracker = None
    logger.warning("SAM 2 not installed. Install with: pip install sam2-video")


class SAM2VideoClient:
    """
    SAM 2 Video Model Client with Streaming Memory Architecture

    Key Features:
    - Streaming memory bank for temporal consistency
    - Object tracking across frames
    - Damage trajectory tracking
    - Memory-efficient frame processing
    """

    def __init__(self):
        self.model = None
        self.processor = None
        self.memory_bank = None
        self.tracker = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.executor = ThreadPoolExecutor(max_workers=4)
        self._ready = False

        # Model configuration
        self.model_config = {
            "model_size": os.getenv("SAM2_MODEL_SIZE", "base"),  # base, large, or huge
            "memory_window": int(os.getenv("SAM2_MEMORY_WINDOW", "8")),  # frames
            "max_objects": int(os.getenv("SAM2_MAX_OBJECTS", "50")),
            "confidence_threshold": float(os.getenv("SAM2_CONFIDENCE_THRESHOLD", "0.5"))
        }

        # Cache directory
        self.cache_dir = Path(os.getenv('SAM2_CACHE_DIR', './model_cache/sam2'))
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Performance tracking
        self.frame_times = []
        self.memory_usage = []

        # Damage type configurations
        self.damage_configs = {
            "water damage": {
                "presence_threshold": 0.25,
                "tracking_threshold": 0.4,
                "min_frames": 3
            },
            "crack": {
                "presence_threshold": 0.35,
                "tracking_threshold": 0.5,
                "min_frames": 2
            },
            "rot": {
                "presence_threshold": 0.30,
                "tracking_threshold": 0.45,
                "min_frames": 3
            },
            "mold": {
                "presence_threshold": 0.25,
                "tracking_threshold": 0.4,
                "min_frames": 4
            },
            "structural damage": {
                "presence_threshold": 0.40,
                "tracking_threshold": 0.55,
                "min_frames": 2
            }
        }

    async def initialize(self):
        """Initialize SAM 2 video model asynchronously"""
        if build_sam2_video_model is None:
            raise RuntimeError(
                "SAM 2 not installed. Please install with: pip install sam2-video"
            )

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(self.executor, self._load_model)

    def _load_model(self):
        """Load SAM 2 video model with streaming memory support"""
        try:
            logger.info(f"Loading SAM 2 video model ({self.model_config['model_size']}) on {self.device}")

            # Check for cached model
            cache_info_path = self.cache_dir / 'model_info.json'
            use_cache = False

            if cache_info_path.exists():
                with open(cache_info_path, 'r') as f:
                    cache_info = json.load(f)
                    if (cache_info.get('model_size') == self.model_config['model_size'] and
                        cache_info.get('version') == '2.0'):
                        use_cache = True
                        logger.info(f"Using cached SAM 2 model")

            # Build model
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    if use_cache and (self.cache_dir / 'checkpoints').exists():
                        # Load from cache
                        self.model = build_sam2_video_model(
                            model_size=self.model_config['model_size'],
                            checkpoint_path=str(self.cache_dir / 'checkpoints'),
                            device=self.device
                        )
                    else:
                        # Download from Hugging Face
                        logger.info(f"Downloading SAM 2 model (attempt {attempt + 1}/{max_retries})")
                        self.model = build_sam2_video_model(
                            model_size=self.model_config['model_size'],
                            device=self.device,
                            download=True
                        )

                        # Cache the model
                        with open(cache_info_path, 'w') as f:
                            json.dump({
                                'model_size': self.model_config['model_size'],
                                'version': '2.0',
                                'device': self.device,
                                'timestamp': time.time()
                            }, f)

                    break

                except Exception as e:
                    if attempt < max_retries - 1:
                        logger.warning(f"Retry {attempt + 1} failed: {e}")
                        time.sleep(5)
                    else:
                        raise e

            self.model.to(self.device)
            self.model.eval()

            # Initialize streaming memory bank
            self.memory_bank = StreamingMemoryBank(
                window_size=self.model_config['memory_window'],
                max_objects=self.model_config['max_objects'],
                device=self.device
            )

            # Initialize video processor
            self.processor = VideoStreamProcessor(
                model=self.model,
                memory_bank=self.memory_bank,
                device=self.device
            )

            # Initialize object tracker
            self.tracker = ObjectTracker(
                max_objects=self.model_config['max_objects'],
                memory_window=self.model_config['memory_window']
            )

            self._ready = True
            logger.info(f"SAM 2 video model loaded successfully on {self.device}")

            # Log GPU memory if using CUDA
            if self.device == "cuda":
                allocated = torch.cuda.memory_allocated() / 1024**3
                reserved = torch.cuda.memory_reserved() / 1024**3
                logger.info(f"GPU Memory: {allocated:.2f}GB allocated, {reserved:.2f}GB reserved")

        except Exception as e:
            logger.error(f"Error loading SAM 2 model: {e}")
            raise

    def is_ready(self) -> bool:
        """Check if model is ready for inference"""
        return self._ready and self.model is not None

    async def process_frame_sequence(
        self,
        frames: List[np.ndarray],
        text_prompts: List[str],
        frame_numbers: List[int],
        timestamps: List[float]
    ) -> Dict[str, Any]:
        """
        Process a sequence of frames with temporal tracking

        Args:
            frames: List of frame arrays (H, W, 3)
            text_prompts: Damage types to detect
            frame_numbers: Frame numbers in video
            timestamps: Timestamps in seconds

        Returns:
            Dictionary with detections and trajectories
        """
        if not self.is_ready():
            raise RuntimeError("SAM 2 model not initialized")

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            self.executor,
            self._process_frames_sync,
            frames,
            text_prompts,
            frame_numbers,
            timestamps
        )

        return result

    def _process_frames_sync(
        self,
        frames: List[np.ndarray],
        text_prompts: List[str],
        frame_numbers: List[int],
        timestamps: List[float]
    ) -> Dict[str, Any]:
        """Synchronous frame sequence processing with streaming memory"""

        start_time = time.time()
        frame_detections = []
        object_memories = {}

        # Initialize streaming state
        self.processor.reset_state()
        self.tracker.reset()
        self.memory_bank.clear()

        for idx, (frame, frame_num, timestamp) in enumerate(zip(frames, frame_numbers, timestamps)):
            frame_start = time.time()

            # Convert frame to tensor
            frame_tensor = torch.from_numpy(frame).permute(2, 0, 1).unsqueeze(0).to(self.device)

            # Process frame with memory bank
            frame_results = {}

            for prompt in text_prompts:
                # Get damage configuration
                config = self.damage_configs.get(
                    prompt.lower(),
                    {"presence_threshold": 0.3, "tracking_threshold": 0.45, "min_frames": 3}
                )

                # Set text prompt for current frame
                prompt_encoding = self.processor.encode_text_prompt(prompt)

                # Run segmentation with memory context
                outputs = self.processor.process_frame(
                    frame_tensor,
                    prompt_encoding,
                    frame_idx=idx,
                    use_memory=(idx > 0)  # Use memory after first frame
                )

                # Extract masks, boxes, and scores
                masks = outputs.get("masks", [])
                boxes = outputs.get("boxes", [])
                scores = outputs.get("scores", [])
                presence_score = outputs.get("presence_score", 0.0)

                # Check presence threshold
                if presence_score < config["presence_threshold"]:
                    continue

                # Filter by tracking threshold
                valid_detections = []
                for mask, box, score in zip(masks, boxes, scores):
                    if score >= config["tracking_threshold"]:
                        # Calculate mask area
                        area = np.sum(mask > 0.5) if isinstance(mask, np.ndarray) else mask.sum().item()

                        detection = {
                            "damage_type": prompt,
                            "confidence": float(score),
                            "bounding_box": {
                                "x": float(box[0]),
                                "y": float(box[1]),
                                "width": float(box[2]),
                                "height": float(box[3])
                            },
                            "mask": mask.tolist() if isinstance(mask, np.ndarray) else mask.cpu().numpy().tolist(),
                            "area_pixels": int(area)
                        }

                        valid_detections.append(detection)

                        # Update memory bank with detection
                        object_id = self.tracker.track_object(
                            detection,
                            frame_num,
                            timestamp
                        )

                        # Store in memory for next frames
                        self.memory_bank.update(
                            object_id=object_id,
                            frame_idx=idx,
                            features=outputs.get("features"),
                            mask=mask
                        )

                if valid_detections:
                    frame_results[prompt] = {
                        "detections": valid_detections,
                        "presence_score": presence_score
                    }

            # Store frame detection
            frame_detection = {
                "frame_number": frame_num,
                "timestamp_seconds": timestamp,
                "detections": [
                    det for prompt_results in frame_results.values()
                    for det in prompt_results["detections"]
                ],
                "presence_scores": {
                    prompt: results["presence_score"]
                    for prompt, results in frame_results.items()
                }
            }

            frame_detections.append(frame_detection)

            # Track frame processing time
            frame_time = time.time() - frame_start
            self.frame_times.append(frame_time)

            # Log progress periodically
            if idx % 10 == 0:
                logger.debug(f"Processed frame {idx + 1}/{len(frames)} in {frame_time:.3f}s")

        # Get trajectories from tracker
        trajectories = self.tracker.get_trajectories()

        # Calculate processing statistics
        total_time = time.time() - start_time
        avg_frame_time = np.mean(self.frame_times[-len(frames):]) if self.frame_times else 0

        logger.info(f"Processed {len(frames)} frames in {total_time:.2f}s (avg: {avg_frame_time:.3f}s/frame)")

        return {
            "frame_detections": frame_detections,
            "trajectories": trajectories,
            "statistics": {
                "total_frames": len(frames),
                "processing_time": total_time,
                "avg_frame_time": avg_frame_time,
                "memory_usage_mb": self._get_memory_usage()
            }
        }

    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB"""
        if self.device == "cuda":
            return torch.cuda.memory_allocated() / 1024**2
        else:
            import psutil
            process = psutil.Process(os.getpid())
            return process.memory_info().rss / 1024**2

    async def cleanup(self):
        """Cleanup resources"""
        if self.model is not None:
            del self.model
        if self.memory_bank is not None:
            self.memory_bank.clear()
            del self.memory_bank
        if self.tracker is not None:
            self.tracker.reset()
            del self.tracker
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        self._ready = False
        logger.info("SAM 2 video client cleaned up")


# Fallback implementations if SAM 2 not installed
if build_sam2_video_model is None:

    class StreamingMemoryBank:
        """Fallback memory bank implementation"""
        def __init__(self, window_size=8, max_objects=50, device="cpu"):
            self.window_size = window_size
            self.max_objects = max_objects
            self.device = device
            self.memory = {}

        def update(self, object_id, frame_idx, features, mask):
            if object_id not in self.memory:
                self.memory[object_id] = []
            self.memory[object_id].append({
                "frame_idx": frame_idx,
                "features": features,
                "mask": mask
            })
            # Keep only window_size frames
            if len(self.memory[object_id]) > self.window_size:
                self.memory[object_id].pop(0)

        def clear(self):
            self.memory = {}

    class VideoStreamProcessor:
        """Fallback video processor"""
        def __init__(self, model=None, memory_bank=None, device="cpu"):
            self.model = model
            self.memory_bank = memory_bank
            self.device = device

        def reset_state(self):
            pass

        def encode_text_prompt(self, prompt):
            return {"text": prompt}

        def process_frame(self, frame_tensor, prompt_encoding, frame_idx=0, use_memory=False):
            # Fallback: return empty results
            return {
                "masks": [],
                "boxes": [],
                "scores": [],
                "presence_score": 0.0,
                "features": None
            }

    class ObjectTracker:
        """Fallback object tracker"""
        def __init__(self, max_objects=50, memory_window=8):
            self.max_objects = max_objects
            self.memory_window = memory_window
            self.tracks = {}
            self.next_id = 0

        def reset(self):
            self.tracks = {}
            self.next_id = 0

        def track_object(self, detection, frame_num, timestamp):
            # Simple tracking: assign new ID
            object_id = f"object_{self.next_id}"
            self.next_id += 1

            if object_id not in self.tracks:
                self.tracks[object_id] = []

            self.tracks[object_id].append({
                "frame_number": frame_num,
                "timestamp": timestamp,
                "detection": detection
            })

            return object_id

        def get_trajectories(self):
            return self.tracks