"""
Comprehensive tests for SAM3 presence detection functionality.
Tests the Python service's ability to detect damage presence and reduce false positives.
"""

import pytest
import asyncio
import base64
import json
import numpy as np
from PIL import Image
from io import BytesIO
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from typing import Dict, List, Optional
import time
from pathlib import Path

# Import the modules to test
import sys
sys.path.append('..')
from app.models.sam3_client import SAM3Client
from app.schemas.requests import SegmentationRequest, SegmentationResponse
from app.main import app, segment_image, check_damage_presence


class TestSAM3Client:
    """Test the SAM3Client class for presence detection functionality"""

    @pytest.fixture
    async def client(self):
        """Create a SAM3Client instance for testing"""
        client = SAM3Client()
        # Mock the model loading
        with patch.object(client, '_load_model'):
            client._ready = True
            client.model = Mock()
            client.processor = Mock()
        return client

    @pytest.fixture
    def test_images(self):
        """Generate test images for different scenarios"""
        # Create synthetic test images
        damaged_image = Image.new('RGB', (640, 480), color='white')
        # Add some dark patches to simulate damage
        pixels = damaged_image.load()
        for x in range(100, 200):
            for y in range(100, 150):
                pixels[x, y] = (50, 30, 20)  # Dark brown (water damage simulation)

        undamaged_image = Image.new('RGB', (640, 480), color='white')
        # Clean uniform surface

        borderline_image = Image.new('RGB', (640, 480), color='white')
        # Add very subtle marks
        pixels = borderline_image.load()
        for x in range(150, 170):
            for y in range(150, 160):
                pixels[x, y] = (230, 225, 220)  # Very light marks

        return {
            'damaged': damaged_image,
            'undamaged': undamaged_image,
            'borderline': borderline_image
        }

    @pytest.mark.asyncio
    async def test_presence_threshold_selection(self, client):
        """Test that correct thresholds are selected for different damage types"""

        # Test exact matches
        assert client.get_presence_threshold("water damage") == 0.25
        assert client.get_presence_threshold("crack") == 0.35
        assert client.get_presence_threshold("rot") == 0.30
        assert client.get_presence_threshold("mold") == 0.25
        assert client.get_presence_threshold("structural damage") == 0.40

        # Test partial matches
        assert client.get_presence_threshold("severe water damage") == 0.25
        assert client.get_presence_threshold("hairline crack") == 0.35

        # Test default fallback
        assert client.get_presence_threshold("unknown damage type") == 0.30

    @pytest.mark.asyncio
    async def test_segment_with_presence_detection(self, client, test_images):
        """Test segmentation with presence detection scores"""

        # Mock the actual segmentation
        async def mock_segment_internal(image_tensor, prompt):
            # Simulate different scores based on image type
            if "damaged" in str(prompt):
                return {
                    'masks': [[[1, 0], [0, 1]]],
                    'boxes': [[100, 100, 100, 50]],
                    'scores': [0.85],
                    'presence_score': 0.75
                }
            else:
                return {
                    'masks': [],
                    'boxes': [],
                    'scores': [],
                    'presence_score': 0.15
                }

        with patch.object(client, '_segment_internal', mock_segment_internal):
            # Test damaged image
            result = await client.segment(
                test_images['damaged'],
                "water damage",
                threshold=0.5
            )

            assert result['presence_score'] == 0.75
            assert result['damage_present'] is True
            assert result['num_instances'] == 1
            assert len(result['masks']) == 1

            # Test undamaged image
            result = await client.segment(
                test_images['undamaged'],
                "water damage",
                threshold=0.5
            )

            assert result['presence_score'] == 0.15
            assert result['damage_present'] is False
            assert result['num_instances'] == 0
            assert len(result['masks']) == 0

    @pytest.mark.asyncio
    async def test_presence_detection_accuracy(self, client):
        """Test presence detection accuracy across different scenarios"""

        test_cases = [
            # (presence_score, damage_type, expected_present)
            (0.80, "water damage", True),   # Clear damage
            (0.10, "water damage", False),  # No damage
            (0.26, "water damage", True),   # Just above threshold (0.25)
            (0.24, "water damage", False),  # Just below threshold
            (0.36, "crack", True),          # Above crack threshold (0.35)
            (0.34, "crack", False),         # Below crack threshold
        ]

        for score, damage_type, expected in test_cases:
            mock_result = {
                'masks': [[[1]]] if expected else [],
                'boxes': [[0, 0, 10, 10]] if expected else [],
                'scores': [score] if expected else [],
                'presence_score': score,
                'num_instances': 1 if expected else 0
            }

            with patch.object(client, '_segment_internal', AsyncMock(return_value=mock_result)):
                result = await client.segment(
                    Image.new('RGB', (100, 100)),
                    damage_type,
                    threshold=0.5
                )

                threshold = client.get_presence_threshold(damage_type)
                expected_present = score >= threshold

                assert result['damage_present'] == expected_present
                assert result['presence_threshold_used'] == threshold

    @pytest.mark.asyncio
    async def test_adaptive_threshold_learning(self, client):
        """Test adaptive threshold learning from feedback"""

        # Record feedback for threshold adjustment
        feedback_data = [
            ("water damage", 0.20, False, True),   # False negative
            ("water damage", 0.30, True, True),    # True positive
            ("water damage", 0.35, True, False),   # False positive
            ("crack", 0.40, True, True),          # True positive
            ("crack", 0.30, False, False),        # True negative
        ]

        for damage_type, score, predicted, actual in feedback_data:
            client.record_threshold_feedback(damage_type, score, predicted, actual)

        # Analyze feedback and adjust thresholds
        adjustments = client.analyze_threshold_performance()

        # Verify threshold adjustments are reasonable
        assert 'water damage' in adjustments
        assert 'crack' in adjustments

        # Water damage should lower threshold (had false negative)
        assert adjustments['water damage']['suggested_threshold'] < 0.25

        # Crack threshold should remain similar (good performance)
        assert abs(adjustments['crack']['suggested_threshold'] - 0.35) < 0.05


class TestPresenceCheckEndpoint:
    """Test the FastAPI presence check endpoint"""

    @pytest.fixture
    def test_client(self):
        """Create a test client for the FastAPI app"""
        from fastapi.testclient import TestClient
        return TestClient(app)

    @pytest.fixture
    def mock_sam3_client(self):
        """Mock SAM3Client for endpoint testing"""
        client = Mock(spec=SAM3Client)
        client.is_ready.return_value = True
        return client

    def test_presence_check_success(self, test_client, mock_sam3_client):
        """Test successful presence check endpoint"""

        # Create test image
        img = Image.new('RGB', (100, 100), color='white')
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()

        # Mock the SAM3 client
        mock_results = {
            "water damage": {
                "presence_score": 0.15,
                "damage_present": False,
                "threshold_used": 0.25
            },
            "crack": {
                "presence_score": 0.08,
                "damage_present": False,
                "threshold_used": 0.35
            }
        }

        async def mock_segment(image, prompt, threshold):
            result = mock_results.get(prompt, {})
            return {
                'masks': [],
                'boxes': [],
                'scores': [],
                'presence_score': result.get('presence_score', 0),
                'damage_present': result.get('damage_present', False),
                'presence_threshold_used': result.get('threshold_used', 0.3),
                'num_instances': 0
            }

        with patch('app.main.sam3_client', mock_sam3_client):
            mock_sam3_client.segment = AsyncMock(side_effect=mock_segment)

            response = test_client.post(
                "/presence-check",
                json={
                    "image_base64": img_base64,
                    "damage_types": ["water damage", "crack"]
                }
            )

            assert response.status_code == 200
            data = response.json()

            assert data['success'] is True
            assert len(data['damage_detected']) == 0
            assert len(data['damage_not_detected']) == 2
            assert data['summary']['total_checked'] == 2
            assert data['summary']['total_detected'] == 0
            assert data['summary']['average_presence_score'] < 0.2

    def test_presence_check_with_damage(self, test_client, mock_sam3_client):
        """Test presence check when damage is detected"""

        img = Image.new('RGB', (100, 100), color='white')
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()

        mock_results = {
            "water damage": {
                "presence_score": 0.85,
                "damage_present": True,
                "threshold_used": 0.25
            },
            "mold": {
                "presence_score": 0.65,
                "damage_present": True,
                "threshold_used": 0.25
            },
            "crack": {
                "presence_score": 0.10,
                "damage_present": False,
                "threshold_used": 0.35
            }
        }

        async def mock_segment(image, prompt, threshold):
            result = mock_results.get(prompt, {})
            return {
                'masks': [[[1, 0], [0, 1]]] if result.get('damage_present') else [],
                'boxes': [[0, 0, 50, 50]] if result.get('damage_present') else [],
                'scores': [result.get('presence_score', 0)] if result.get('damage_present') else [],
                'presence_score': result.get('presence_score', 0),
                'damage_present': result.get('damage_present', False),
                'presence_threshold_used': result.get('threshold_used', 0.3),
                'num_instances': 1 if result.get('damage_present') else 0
            }

        with patch('app.main.sam3_client', mock_sam3_client):
            mock_sam3_client.segment = AsyncMock(side_effect=mock_segment)

            response = test_client.post(
                "/presence-check",
                json={
                    "image_base64": img_base64,
                    "damage_types": ["water damage", "mold", "crack"]
                }
            )

            assert response.status_code == 200
            data = response.json()

            assert data['success'] is True
            assert set(data['damage_detected']) == {"water damage", "mold"}
            assert data['damage_not_detected'] == ["crack"]
            assert data['summary']['total_detected'] == 2
            assert data['summary']['detection_rate'] == 2/3

    def test_presence_check_model_not_ready(self, test_client):
        """Test presence check when model is not initialized"""

        img = Image.new('RGB', (10, 10), color='white')
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()

        with patch('app.main.sam3_client', None):
            response = test_client.post(
                "/presence-check",
                json={
                    "image_base64": img_base64,
                    "damage_types": ["water damage"]
                }
            )

            assert response.status_code == 503
            assert "not initialized" in response.json()['detail']


class TestPerformanceMetrics:
    """Test performance tracking and metrics for presence detection"""

    @pytest.fixture
    async def client_with_metrics(self):
        """Create SAM3Client with metrics tracking enabled"""
        client = SAM3Client()
        client._ready = True
        client.model = Mock()
        client.processor = Mock()
        return client

    @pytest.mark.asyncio
    async def test_inference_time_tracking(self, client_with_metrics):
        """Test that inference times are tracked correctly"""

        # Mock fast presence check
        async def mock_fast_segment(image, prompt, threshold):
            await asyncio.sleep(0.1)  # Simulate 100ms inference
            return {
                'masks': [],
                'boxes': [],
                'scores': [],
                'presence_score': 0.05,
                'damage_present': False,
                'num_instances': 0,
                'inference_time_ms': 100
            }

        with patch.object(client_with_metrics, '_segment_internal', mock_fast_segment):
            start = time.time()
            result = await client_with_metrics.segment(
                Image.new('RGB', (100, 100)),
                "water damage",
                threshold=0.5
            )
            elapsed = (time.time() - start) * 1000

            # Presence check should be fast
            assert elapsed < 200  # Should complete in under 200ms
            assert result['inference_time_ms'] == 100

    @pytest.mark.asyncio
    async def test_false_positive_reduction_metrics(self, client_with_metrics):
        """Test metrics for false positive reduction"""

        # Track results across multiple images
        results = []

        # Test scenarios: 3 undamaged, 2 damaged
        scenarios = [
            (0.05, False),  # No damage
            (0.08, False),  # No damage
            (0.12, False),  # No damage
            (0.75, True),   # Damage present
            (0.82, True),   # Damage present
        ]

        for score, has_damage in scenarios:
            async def mock_segment(image, prompt, threshold):
                return {
                    'masks': [[[1]]] if has_damage else [],
                    'boxes': [[0, 0, 10, 10]] if has_damage else [],
                    'scores': [score] if has_damage else [],
                    'presence_score': score,
                    'damage_present': has_damage,
                    'num_instances': 1 if has_damage else 0
                }

            with patch.object(client_with_metrics, '_segment_internal', mock_segment):
                result = await client_with_metrics.segment(
                    Image.new('RGB', (100, 100)),
                    "water damage",
                    threshold=0.5
                )
                results.append(result)

        # Calculate false positive reduction
        total_checked = len(results)
        true_negatives = sum(1 for r in results if not r['damage_present'])
        false_positive_reduction = true_negatives / total_checked

        assert false_positive_reduction == 0.6  # 60% were correctly identified as no damage

        # Without presence detection, all would have gone through YOLO
        # With presence detection, only 40% need YOLO
        yolo_skip_rate = true_negatives / total_checked
        assert yolo_skip_rate == 0.6

    @pytest.mark.asyncio
    async def test_batch_performance(self, client_with_metrics):
        """Test performance with batch processing of multiple damage types"""

        damage_types = [
            "water damage", "crack", "rot", "mold",
            "structural damage", "fire damage", "pest damage"
        ]

        async def mock_batch_segment(image, prompt, threshold):
            # Simulate varying presence scores
            scores = {
                "water damage": 0.05,
                "crack": 0.08,
                "rot": 0.02,
                "mold": 0.01,
                "structural damage": 0.03,
                "fire damage": 0.00,
                "pest damage": 0.04
            }
            score = scores.get(prompt, 0.05)
            return {
                'masks': [],
                'boxes': [],
                'scores': [],
                'presence_score': score,
                'damage_present': False,
                'num_instances': 0
            }

        with patch.object(client_with_metrics, '_segment_internal', mock_batch_segment):
            start = time.time()

            # Process all damage types
            results = []
            for damage_type in damage_types:
                result = await client_with_metrics.segment(
                    Image.new('RGB', (100, 100)),
                    damage_type,
                    threshold=0.5
                )
                results.append(result)

            elapsed = time.time() - start

            # Batch processing should be efficient
            assert elapsed < 2.0  # Should process 7 types in under 2 seconds

            # All should be identified as no damage
            assert all(not r['damage_present'] for r in results)

            # Average presence score should be low
            avg_score = sum(r['presence_score'] for r in results) / len(results)
            assert avg_score < 0.1


class TestEdgeCases:
    """Test edge cases and error handling"""

    @pytest.fixture
    async def client(self):
        client = SAM3Client()
        client._ready = True
        client.model = Mock()
        client.processor = Mock()
        return client

    @pytest.mark.asyncio
    async def test_blurry_image_handling(self, client):
        """Test handling of blurry/low-quality images"""

        # Create a blurry image (simulated with low contrast)
        blurry_image = Image.new('RGB', (100, 100), color=(128, 128, 128))

        async def mock_segment_blurry(image, prompt, threshold):
            # Low confidence due to blur
            return {
                'masks': [],
                'boxes': [],
                'scores': [],
                'presence_score': 0.15,  # Uncertain score
                'damage_present': False,
                'num_instances': 0,
                'quality_warning': 'Low image quality detected'
            }

        with patch.object(client, '_segment_internal', mock_segment_blurry):
            result = await client.segment(blurry_image, "crack", 0.5)

            assert result['presence_score'] == 0.15
            assert result['damage_present'] is False
            assert 'quality_warning' in result

    @pytest.mark.asyncio
    async def test_extreme_lighting_conditions(self, client):
        """Test presence detection under extreme lighting"""

        # Over-exposed image
        overexposed = Image.new('RGB', (100, 100), color=(250, 250, 250))

        # Under-exposed image
        underexposed = Image.new('RGB', (100, 100), color=(10, 10, 10))

        async def mock_segment_extreme(image, prompt, threshold):
            # Determine if image is extreme
            img_array = np.array(image)
            mean_brightness = img_array.mean()

            if mean_brightness > 240 or mean_brightness < 20:
                return {
                    'masks': [],
                    'boxes': [],
                    'scores': [],
                    'presence_score': 0.0,
                    'damage_present': False,
                    'num_instances': 0,
                    'lighting_warning': 'Extreme lighting conditions'
                }
            return {
                'masks': [],
                'boxes': [],
                'scores': [],
                'presence_score': 0.5,
                'damage_present': True,
                'num_instances': 1
            }

        with patch.object(client, '_segment_internal', mock_segment_extreme):
            # Test overexposed
            result = await client.segment(overexposed, "water damage", 0.5)
            assert 'lighting_warning' in result
            assert result['damage_present'] is False

            # Test underexposed
            result = await client.segment(underexposed, "water damage", 0.5)
            assert 'lighting_warning' in result
            assert result['damage_present'] is False

    @pytest.mark.asyncio
    async def test_partial_occlusion(self, client):
        """Test presence detection with partially occluded damage"""

        # Image with furniture blocking part of the damage
        occluded_image = Image.new('RGB', (200, 200), color='white')
        pixels = occluded_image.load()

        # Add damage pattern
        for x in range(50, 100):
            for y in range(50, 100):
                pixels[x, y] = (100, 80, 70)  # Damage

        # Add occlusion
        for x in range(70, 120):
            for y in range(70, 120):
                pixels[x, y] = (150, 100, 50)  # Furniture

        async def mock_segment_occluded(image, prompt, threshold):
            # Detect partial damage with lower confidence
            return {
                'masks': [[[1, 0], [0, 0]]],  # Partial mask
                'boxes': [[50, 50, 50, 50]],
                'scores': [0.45],  # Lower confidence due to occlusion
                'presence_score': 0.45,
                'damage_present': True,  # Still above threshold
                'num_instances': 1,
                'occlusion_detected': True
            }

        with patch.object(client, '_segment_internal', mock_segment_occluded):
            result = await client.segment(occluded_image, "water damage", 0.5)

            assert result['damage_present'] is True
            assert result['presence_score'] == 0.45
            assert result.get('occlusion_detected') is True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])