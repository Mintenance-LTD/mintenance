"""
Damage Aggregator Service
Aggregates frame-level detections and trajectories into comprehensive assessment
"""

import numpy as np
from typing import List, Dict, Any, Optional
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class DamageAggregator:
    """
    Aggregates temporal damage detections into comprehensive assessment

    Features:
    - Trajectory-based aggregation
    - Severity estimation from temporal consistency
    - Priority ranking based on multiple factors
    - Statistical analysis of damage progression
    """

    def __init__(self):
        # Severity thresholds
        self.severity_thresholds = {
            "early": {"consistency": 0.3, "confidence": 0.5, "coverage": 0.1},
            "midway": {"consistency": 0.5, "confidence": 0.6, "coverage": 0.2},
            "full": {"consistency": 0.7, "confidence": 0.7, "coverage": 0.3}
        }

        # Damage type priorities (higher = more urgent)
        self.damage_priorities = {
            "structural damage": 10,
            "water damage": 8,
            "fire damage": 9,
            "rot": 7,
            "mold": 6,
            "crack": 5,
            "pest damage": 4,
            "cosmetic damage": 2
        }

        # Confidence level thresholds
        self.confidence_levels = {
            "high": 0.8,
            "medium": 0.6,
            "low": 0.0
        }

    def aggregate_assessment(
        self,
        trajectories: List[Dict[str, Any]],
        frame_detections: List[Dict[str, Any]],
        video_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Aggregate all detections into comprehensive assessment

        Args:
            trajectories: List of damage trajectories
            frame_detections: List of frame-level detections
            video_metadata: Video processing metadata

        Returns:
            Aggregated damage assessment dictionary
        """
        # Group trajectories by damage type
        damage_groups = self._group_trajectories_by_type(trajectories)

        # Aggregate each damage type
        damage_summary = {}
        for damage_type, type_trajectories in damage_groups.items():
            damage_summary[damage_type] = self._aggregate_damage_type(
                damage_type,
                type_trajectories,
                frame_detections,
                video_metadata
            )

        # Calculate overall statistics
        total_unique_damages = sum(
            item["instance_count"] for item in damage_summary.values()
        )

        overall_severity = self._calculate_overall_severity(damage_summary)
        overall_confidence = self._calculate_overall_confidence(damage_summary)
        high_priority_damages = self._identify_high_priority(damage_summary)

        # Temporal analysis
        temporal_analysis = self._analyze_temporal_patterns(
            trajectories,
            frame_detections,
            video_metadata
        )

        return {
            "processing_id": video_metadata.get("processing_id", "unknown"),
            "video_metadata": video_metadata,
            "damage_summary": damage_summary,
            "total_unique_damages": total_unique_damages,
            "overall_severity": overall_severity,
            "confidence_level": overall_confidence,
            "high_priority_damages": high_priority_damages,
            "temporal_analysis": temporal_analysis
        }

    def _group_trajectories_by_type(
        self,
        trajectories: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Group trajectories by damage type"""
        groups = defaultdict(list)
        for trajectory in trajectories:
            groups[trajectory["damage_type"]].append(trajectory)
        return dict(groups)

    def _aggregate_damage_type(
        self,
        damage_type: str,
        trajectories: List[Dict[str, Any]],
        frame_detections: List[Dict[str, Any]],
        video_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Aggregate information for specific damage type

        Args:
            damage_type: Type of damage
            trajectories: Trajectories for this damage type
            frame_detections: All frame detections
            video_metadata: Video metadata

        Returns:
            Aggregated damage information
        """
        if not trajectories:
            return {
                "damage_type": damage_type,
                "instance_count": 0,
                "total_detections": 0,
                "average_confidence": 0,
                "max_confidence": 0,
                "temporal_coverage": 0,
                "severity_estimate": "none",
                "trajectories": []
            }

        # Count unique instances (trajectories)
        instance_count = len(trajectories)

        # Count total detections across all frames
        total_detections = sum(
            len(traj["tracking_points"]) for traj in trajectories
        )

        # Calculate confidence statistics
        all_confidences = []
        for traj in trajectories:
            all_confidences.extend([
                point["confidence"] for point in traj["tracking_points"]
            ])

        avg_confidence = float(np.mean(all_confidences)) if all_confidences else 0
        max_confidence = float(np.max(all_confidences)) if all_confidences else 0

        # Calculate temporal coverage
        frames_with_damage = set()
        for traj in trajectories:
            for point in traj["tracking_points"]:
                frames_with_damage.add(point["frame_number"])

        total_frames = video_metadata.get("processed_frames", 1)
        temporal_coverage = len(frames_with_damage) / total_frames if total_frames > 0 else 0

        # Calculate average consistency score
        avg_consistency = np.mean([
            traj["consistency_score"] for traj in trajectories
        ])

        # Estimate severity
        severity = self._estimate_severity(
            avg_consistency,
            avg_confidence,
            temporal_coverage
        )

        return {
            "damage_type": damage_type,
            "instance_count": instance_count,
            "total_detections": total_detections,
            "average_confidence": avg_confidence,
            "max_confidence": max_confidence,
            "temporal_coverage": float(temporal_coverage),
            "severity_estimate": severity,
            "trajectories": trajectories
        }

    def _estimate_severity(
        self,
        consistency: float,
        confidence: float,
        coverage: float
    ) -> str:
        """
        Estimate damage severity based on multiple factors

        Args:
            consistency: Temporal consistency score
            confidence: Average confidence score
            coverage: Temporal coverage percentage

        Returns:
            Severity level: "early", "midway", or "full"
        """
        # Check thresholds from highest to lowest severity
        for severity in ["full", "midway", "early"]:
            thresholds = self.severity_thresholds[severity]

            if (consistency >= thresholds["consistency"] and
                confidence >= thresholds["confidence"] and
                coverage >= thresholds["coverage"]):
                return severity

        # If no thresholds met, return early (minimal damage)
        return "early"

    def _calculate_overall_severity(
        self,
        damage_summary: Dict[str, Dict[str, Any]]
    ) -> str:
        """
        Calculate overall severity from all damage types

        Args:
            damage_summary: Aggregated damage by type

        Returns:
            Overall severity level
        """
        if not damage_summary:
            return "none"

        # Get worst severity
        severity_order = {"none": 0, "early": 1, "midway": 2, "full": 3}
        max_severity_score = 0
        overall_severity = "none"

        for damage_info in damage_summary.values():
            severity = damage_info.get("severity_estimate", "none")
            score = severity_order.get(severity, 0)

            # Weight by damage priority
            damage_type = damage_info["damage_type"]
            priority = self.damage_priorities.get(damage_type, 1)
            weighted_score = score * (priority / 10)

            if weighted_score > max_severity_score:
                max_severity_score = weighted_score
                overall_severity = severity

        return overall_severity

    def _calculate_overall_confidence(
        self,
        damage_summary: Dict[str, Dict[str, Any]]
    ) -> str:
        """
        Calculate overall confidence level

        Args:
            damage_summary: Aggregated damage by type

        Returns:
            Confidence level: "low", "medium", or "high"
        """
        if not damage_summary:
            return "low"

        # Calculate weighted average confidence
        total_weight = 0
        weighted_confidence = 0

        for damage_info in damage_summary.values():
            weight = damage_info["instance_count"]
            confidence = damage_info["average_confidence"]

            weighted_confidence += weight * confidence
            total_weight += weight

        if total_weight == 0:
            return "low"

        avg_confidence = weighted_confidence / total_weight

        # Determine level
        for level in ["high", "medium"]:
            if avg_confidence >= self.confidence_levels[level]:
                return level

        return "low"

    def _identify_high_priority(
        self,
        damage_summary: Dict[str, Dict[str, Any]]
    ) -> List[str]:
        """
        Identify high-priority damage types requiring immediate attention

        Args:
            damage_summary: Aggregated damage by type

        Returns:
            List of high-priority damage types
        """
        high_priority = []

        for damage_type, damage_info in damage_summary.items():
            # Check priority based on type
            priority_score = self.damage_priorities.get(damage_type, 1)

            # Check severity
            severity = damage_info.get("severity_estimate", "none")

            # High priority if:
            # 1. High priority damage type (score >= 7)
            # 2. Any structural damage
            # 3. Severe damage (midway or full) of any type
            if (priority_score >= 7 or
                damage_type == "structural damage" or
                severity in ["midway", "full"]):
                high_priority.append(damage_type)

        return high_priority

    def _analyze_temporal_patterns(
        self,
        trajectories: List[Dict[str, Any]],
        frame_detections: List[Dict[str, Any]],
        video_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze temporal patterns in damage detection

        Args:
            trajectories: All damage trajectories
            frame_detections: Frame-level detections
            video_metadata: Video metadata

        Returns:
            Temporal analysis insights
        """
        if not trajectories:
            return {
                "detection_timeline": [],
                "peak_detection_frame": None,
                "detection_density": 0,
                "temporal_clustering": "none"
            }

        # Build detection timeline
        timeline = defaultdict(int)
        for traj in trajectories:
            for point in traj["tracking_points"]:
                timeline[point["frame_number"]] += 1

        # Find peak detection frame
        if timeline:
            peak_frame = max(timeline, key=timeline.get)
            peak_count = timeline[peak_frame]
        else:
            peak_frame = None
            peak_count = 0

        # Calculate detection density
        total_frames = video_metadata.get("processed_frames", 1)
        frames_with_detection = len(timeline)
        detection_density = frames_with_detection / total_frames if total_frames > 0 else 0

        # Analyze clustering
        clustering = self._analyze_clustering(timeline, total_frames)

        # Calculate temporal spread
        if timeline:
            first_frame = min(timeline.keys())
            last_frame = max(timeline.keys())
            temporal_spread = (last_frame - first_frame + 1) / total_frames if total_frames > 0 else 0
        else:
            temporal_spread = 0

        return {
            "detection_timeline": [
                {"frame": frame, "count": count}
                for frame, count in sorted(timeline.items())
            ],
            "peak_detection_frame": peak_frame,
            "peak_detection_count": peak_count,
            "detection_density": float(detection_density),
            "temporal_clustering": clustering,
            "temporal_spread": float(temporal_spread),
            "frames_with_detection": frames_with_detection,
            "total_frames_analyzed": total_frames
        }

    def _analyze_clustering(
        self,
        timeline: Dict[int, int],
        total_frames: int
    ) -> str:
        """
        Analyze temporal clustering pattern

        Args:
            timeline: Frame -> detection count mapping
            total_frames: Total number of frames

        Returns:
            Clustering pattern: "clustered", "distributed", or "sparse"
        """
        if not timeline or total_frames == 0:
            return "none"

        frames = sorted(timeline.keys())

        if len(frames) < 2:
            return "sparse"

        # Calculate gaps between detections
        gaps = [frames[i + 1] - frames[i] for i in range(len(frames) - 1)]

        if not gaps:
            return "sparse"

        avg_gap = np.mean(gaps)
        std_gap = np.std(gaps)

        # Determine pattern
        coverage = len(frames) / total_frames

        if coverage < 0.1:
            return "sparse"
        elif std_gap < avg_gap * 0.5:  # Low variation in gaps
            return "distributed"
        else:  # High variation in gaps
            return "clustered"