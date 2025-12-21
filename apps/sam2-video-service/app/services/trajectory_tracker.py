"""
Trajectory Tracking Service
Tracks damage instances across video frames to avoid duplicate detections
"""

import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field
import uuid
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class TrackingObject:
    """Represents a tracked damage object"""
    track_id: str
    damage_type: str
    first_frame: int
    last_frame: int
    detections: List[Dict[str, Any]] = field(default_factory=list)
    confidence_scores: List[float] = field(default_factory=list)
    bounding_boxes: List[Dict[str, float]] = field(default_factory=list)
    timestamps: List[float] = field(default_factory=list)
    areas: List[int] = field(default_factory=list)


class TrajectoryTracker:
    """
    Tracks damage instances across frames using IoU matching and temporal consistency

    Features:
    - IoU-based object matching
    - Temporal consistency scoring
    - Trajectory smoothing
    - Duplicate detection elimination
    """

    def __init__(self):
        self.tracks: Dict[str, TrackingObject] = {}
        self.active_tracks: Dict[str, str] = {}  # damage_type -> track_ids mapping
        self.completed_tracks: List[TrackingObject] = []

        # Tracking configuration
        self.config = {
            "iou_threshold": 0.3,  # Minimum IoU for matching
            "max_frames_missing": 3,  # Max frames object can be missing
            "min_track_length": 2,  # Minimum frames for valid track
            "confidence_decay": 0.9,  # Confidence decay for missing frames
            "spatial_threshold": 100,  # Max pixel distance for matching
            "consistency_threshold": 0.5  # Minimum temporal consistency score
        }

        # Track ID counter
        self.next_track_id = 0

    def update(
        self,
        frame_detections: List[Dict[str, Any]],
        frame_number: int,
        timestamp: float
    ) -> List[str]:
        """
        Update tracks with new frame detections

        Args:
            frame_detections: List of detections in current frame
            frame_number: Current frame number
            timestamp: Frame timestamp in seconds

        Returns:
            List of track IDs updated in this frame
        """
        updated_tracks = []

        # Group detections by damage type
        detections_by_type = defaultdict(list)
        for detection in frame_detections:
            detections_by_type[detection["damage_type"]].append(detection)

        # Process each damage type separately
        for damage_type, detections in detections_by_type.items():
            # Get active tracks for this damage type
            active_track_ids = [
                track_id for track_id, track in self.tracks.items()
                if track.damage_type == damage_type and
                (frame_number - track.last_frame) <= self.config["max_frames_missing"]
            ]

            # Match detections to existing tracks
            matches = self._match_detections_to_tracks(
                detections,
                active_track_ids,
                frame_number
            )

            # Update matched tracks
            for detection, track_id in matches:
                self._update_track(
                    track_id,
                    detection,
                    frame_number,
                    timestamp
                )
                updated_tracks.append(track_id)

            # Create new tracks for unmatched detections
            unmatched_detections = [
                det for det in detections
                if det not in [m[0] for m in matches]
            ]

            for detection in unmatched_detections:
                track_id = self._create_new_track(
                    detection,
                    damage_type,
                    frame_number,
                    timestamp
                )
                updated_tracks.append(track_id)

        # Move inactive tracks to completed
        self._finalize_inactive_tracks(frame_number)

        return updated_tracks

    def _match_detections_to_tracks(
        self,
        detections: List[Dict[str, Any]],
        track_ids: List[str],
        frame_number: int
    ) -> List[Tuple[Dict[str, Any], str]]:
        """
        Match detections to existing tracks using IoU and spatial distance

        Args:
            detections: Current frame detections
            track_ids: Active track IDs to match against
            frame_number: Current frame number

        Returns:
            List of (detection, track_id) matches
        """
        if not detections or not track_ids:
            return []

        matches = []
        used_detections = set()
        used_tracks = set()

        # Calculate cost matrix (IoU + spatial distance)
        cost_matrix = np.zeros((len(detections), len(track_ids)))

        for i, detection in enumerate(detections):
            det_box = detection["bounding_box"]

            for j, track_id in enumerate(track_ids):
                track = self.tracks[track_id]

                # Get last known position
                if track.bounding_boxes:
                    last_box = track.bounding_boxes[-1]

                    # Calculate IoU
                    iou = self._calculate_iou(det_box, last_box)

                    # Calculate spatial distance
                    distance = self._calculate_spatial_distance(det_box, last_box)

                    # Combine metrics (higher is better)
                    if iou >= self.config["iou_threshold"] or distance <= self.config["spatial_threshold"]:
                        cost_matrix[i, j] = iou + (1.0 - distance / 1000.0)
                    else:
                        cost_matrix[i, j] = 0

        # Greedy matching (could use Hungarian algorithm for optimal matching)
        while cost_matrix.max() > 0:
            i, j = np.unravel_index(cost_matrix.argmax(), cost_matrix.shape)

            if i not in used_detections and j not in used_tracks:
                matches.append((detections[i], track_ids[j]))
                used_detections.add(i)
                used_tracks.add(j)

            # Zero out used rows and columns
            cost_matrix[i, :] = 0
            cost_matrix[:, j] = 0

        return matches

    def _calculate_iou(self, box1: Dict[str, float], box2: Dict[str, float]) -> float:
        """
        Calculate Intersection over Union between two bounding boxes

        Args:
            box1, box2: Bounding box dictionaries with x, y, width, height

        Returns:
            IoU score between 0 and 1
        """
        # Convert to coordinates
        x1_min, y1_min = box1["x"], box1["y"]
        x1_max = x1_min + box1["width"]
        y1_max = y1_min + box1["height"]

        x2_min, y2_min = box2["x"], box2["y"]
        x2_max = x2_min + box2["width"]
        y2_max = y2_min + box2["height"]

        # Calculate intersection
        inter_xmin = max(x1_min, x2_min)
        inter_ymin = max(y1_min, y2_min)
        inter_xmax = min(x1_max, x2_max)
        inter_ymax = min(y1_max, y2_max)

        if inter_xmax < inter_xmin or inter_ymax < inter_ymin:
            return 0.0

        inter_area = (inter_xmax - inter_xmin) * (inter_ymax - inter_ymin)

        # Calculate union
        area1 = box1["width"] * box1["height"]
        area2 = box2["width"] * box2["height"]
        union_area = area1 + area2 - inter_area

        if union_area == 0:
            return 0.0

        return inter_area / union_area

    def _calculate_spatial_distance(
        self,
        box1: Dict[str, float],
        box2: Dict[str, float]
    ) -> float:
        """
        Calculate spatial distance between box centers

        Args:
            box1, box2: Bounding box dictionaries

        Returns:
            Euclidean distance between centers
        """
        center1_x = box1["x"] + box1["width"] / 2
        center1_y = box1["y"] + box1["height"] / 2

        center2_x = box2["x"] + box2["width"] / 2
        center2_y = box2["y"] + box2["height"] / 2

        distance = np.sqrt(
            (center2_x - center1_x) ** 2 +
            (center2_y - center1_y) ** 2
        )

        return float(distance)

    def _update_track(
        self,
        track_id: str,
        detection: Dict[str, Any],
        frame_number: int,
        timestamp: float
    ):
        """Update existing track with new detection"""
        track = self.tracks[track_id]

        track.last_frame = frame_number
        track.detections.append(detection)
        track.confidence_scores.append(detection["confidence"])
        track.bounding_boxes.append(detection["bounding_box"])
        track.timestamps.append(timestamp)

        if "area_pixels" in detection:
            track.areas.append(detection["area_pixels"])

    def _create_new_track(
        self,
        detection: Dict[str, Any],
        damage_type: str,
        frame_number: int,
        timestamp: float
    ) -> str:
        """Create new track for unmatched detection"""
        track_id = f"track_{self.next_track_id:04d}"
        self.next_track_id += 1

        track = TrackingObject(
            track_id=track_id,
            damage_type=damage_type,
            first_frame=frame_number,
            last_frame=frame_number,
            detections=[detection],
            confidence_scores=[detection["confidence"]],
            bounding_boxes=[detection["bounding_box"]],
            timestamps=[timestamp],
            areas=[detection.get("area_pixels", 0)]
        )

        self.tracks[track_id] = track

        logger.debug(f"Created new track {track_id} for {damage_type} at frame {frame_number}")

        return track_id

    def _finalize_inactive_tracks(self, current_frame: int):
        """Move inactive tracks to completed list"""
        tracks_to_complete = []

        for track_id, track in self.tracks.items():
            frames_missing = current_frame - track.last_frame

            if frames_missing > self.config["max_frames_missing"]:
                # Check if track meets minimum length requirement
                track_length = len(track.detections)

                if track_length >= self.config["min_track_length"]:
                    tracks_to_complete.append(track_id)
                else:
                    logger.debug(f"Discarding short track {track_id} with {track_length} detections")

        # Move tracks to completed
        for track_id in tracks_to_complete:
            track = self.tracks.pop(track_id)
            self.completed_tracks.append(track)
            logger.debug(f"Completed track {track_id} with {len(track.detections)} detections")

    def get_trajectories(self) -> List[Dict[str, Any]]:
        """
        Get all trajectories (active and completed)

        Returns:
            List of trajectory dictionaries
        """
        all_tracks = list(self.tracks.values()) + self.completed_tracks
        trajectories = []

        for track in all_tracks:
            if len(track.detections) < self.config["min_track_length"]:
                continue

            # Calculate trajectory statistics
            duration = track.timestamps[-1] - track.timestamps[0] if len(track.timestamps) > 1 else 0
            avg_confidence = np.mean(track.confidence_scores)
            max_confidence = np.max(track.confidence_scores)

            # Calculate consistency score
            expected_frames = track.last_frame - track.first_frame + 1
            actual_frames = len(track.detections)
            consistency_score = actual_frames / expected_frames if expected_frames > 0 else 0

            # Build tracking points
            tracking_points = []
            for i in range(len(track.detections)):
                tracking_points.append({
                    "frame_number": track.first_frame + i,
                    "timestamp_seconds": track.timestamps[i],
                    "bounding_box": track.bounding_boxes[i],
                    "confidence": track.confidence_scores[i],
                    "area_pixels": track.areas[i] if i < len(track.areas) else None
                })

            trajectory = {
                "track_id": track.track_id,
                "damage_type": track.damage_type,
                "first_frame": track.first_frame,
                "last_frame": track.last_frame,
                "duration_seconds": duration,
                "average_confidence": float(avg_confidence),
                "max_confidence": float(max_confidence),
                "tracking_points": tracking_points,
                "is_consistent": consistency_score >= self.config["consistency_threshold"],
                "consistency_score": float(consistency_score)
            }

            trajectories.append(trajectory)

        return trajectories

    def reset(self):
        """Reset tracker state"""
        self.tracks = {}
        self.active_tracks = {}
        self.completed_tracks = []
        self.next_track_id = 0
        logger.info("Trajectory tracker reset")

    def get_statistics(self) -> Dict[str, Any]:
        """Get tracking statistics"""
        all_tracks = list(self.tracks.values()) + self.completed_tracks

        if not all_tracks:
            return {
                "total_tracks": 0,
                "active_tracks": 0,
                "completed_tracks": 0,
                "average_track_length": 0,
                "damage_type_distribution": {}
            }

        # Calculate statistics
        damage_type_counts = defaultdict(int)
        track_lengths = []

        for track in all_tracks:
            damage_type_counts[track.damage_type] += 1
            track_lengths.append(len(track.detections))

        return {
            "total_tracks": len(all_tracks),
            "active_tracks": len(self.tracks),
            "completed_tracks": len(self.completed_tracks),
            "average_track_length": float(np.mean(track_lengths)),
            "max_track_length": int(np.max(track_lengths)),
            "min_track_length": int(np.min(track_lengths)),
            "damage_type_distribution": dict(damage_type_counts)
        }