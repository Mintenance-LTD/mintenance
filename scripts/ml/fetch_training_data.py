#!/usr/bin/env python3
"""
Fetch and prepare training data from Supabase for ML model training.
"""

import os
import json
import argparse
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
import aiohttp
import aiofiles
from supabase import create_client, Client
import yaml
import hashlib
from tqdm import tqdm
import numpy as np
from PIL import Image
import io

class TrainingDataFetcher:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def fetch_validated_assessments(
        self,
        min_samples: int = 100,
        include_auto_validated: bool = True,
        days_back: int = 90
    ) -> List[Dict[str, Any]]:
        """Fetch validated building assessments from Supabase."""

        # Calculate date threshold
        date_threshold = (datetime.now() - timedelta(days=days_back)).isoformat()

        # Build query
        query = self.supabase.table('building_assessments').select(
            """
            id,
            assessment_data,
            damage_type,
            severity,
            confidence,
            validation_status,
            auto_validated,
            validated_at,
            images:assessment_images(image_url, image_index)
            """
        ).eq('validation_status', 'validated')

        if not include_auto_validated:
            query = query.eq('auto_validated', False)

        query = query.gte('validated_at', date_threshold).limit(min_samples * 2)

        response = query.execute()
        assessments = response.data if response.data else []

        print(f"Fetched {len(assessments)} validated assessments")
        return assessments[:min_samples] if len(assessments) > min_samples else assessments

    async def fetch_yolo_corrections(self, status: str = 'approved') -> List[Dict[str, Any]]:
        """Fetch YOLO corrections from Supabase."""

        response = self.supabase.table('yolo_corrections').select(
            """
            id,
            assessment_id,
            image_url,
            image_index,
            original_detections,
            corrected_labels,
            corrections_made,
            confidence_score,
            correction_quality
            """
        ).eq('status', status).eq('used_in_training', False).execute()

        corrections = response.data if response.data else []
        print(f"Fetched {len(corrections)} approved YOLO corrections")
        return corrections

    async def fetch_sam3_masks(self, assessment_ids: List[str]) -> Dict[str, List[Dict[str, Any]]]:
        """Fetch SAM3 segmentation masks for given assessments."""

        if not assessment_ids:
            return {}

        response = self.supabase.table('sam3_masks').select(
            """
            id,
            assessment_id,
            image_url,
            damage_type,
            masks,
            boxes,
            scores,
            num_instances,
            segmentation_quality
            """
        ).in_('assessment_id', assessment_ids).execute()

        masks_by_assessment = {}
        for mask in response.data or []:
            assessment_id = mask['assessment_id']
            if assessment_id not in masks_by_assessment:
                masks_by_assessment[assessment_id] = []
            masks_by_assessment[assessment_id].append(mask)

        print(f"Fetched SAM3 masks for {len(masks_by_assessment)} assessments")
        return masks_by_assessment

    async def download_image(self, url: str, output_path: Path) -> bool:
        """Download an image from URL and save to disk."""

        if not self.session:
            raise RuntimeError("Session not initialized")

        try:
            async with self.session.get(url) as response:
                if response.status == 200:
                    content = await response.read()

                    # Verify it's a valid image
                    try:
                        img = Image.open(io.BytesIO(content))
                        img.verify()
                    except Exception:
                        print(f"Invalid image from {url}")
                        return False

                    # Save image
                    async with aiofiles.open(output_path, 'wb') as f:
                        await f.write(content)
                    return True
                else:
                    print(f"Failed to download {url}: HTTP {response.status}")
                    return False
        except Exception as e:
            print(f"Error downloading {url}: {e}")
            return False

    async def prepare_yolo_dataset(
        self,
        assessments: List[Dict[str, Any]],
        corrections: List[Dict[str, Any]],
        output_dir: Path,
        train_split: float = 0.8,
        val_split: float = 0.1
    ) -> Dict[str, Any]:
        """Prepare YOLO format dataset from assessments and corrections."""

        # Create directory structure
        for split in ['train', 'valid', 'test']:
            (output_dir / split / 'images').mkdir(parents=True, exist_ok=True)
            (output_dir / split / 'labels').mkdir(parents=True, exist_ok=True)

        # Load class names
        class_names = self.get_class_names()

        # Process assessments
        dataset_stats = {
            'total_images': 0,
            'train_count': 0,
            'val_count': 0,
            'test_count': 0,
            'class_distribution': {},
            'failed_downloads': 0
        }

        all_data = []

        # Process validated assessments
        for assessment in tqdm(assessments, desc="Processing assessments"):
            images = assessment.get('images', [])
            for image_data in images:
                image_url = image_data['image_url']
                image_index = image_data.get('image_index', 0)

                # Generate unique filename
                image_hash = hashlib.md5(f"{assessment['id']}_{image_index}".encode()).hexdigest()
                image_filename = f"assessment_{image_hash}.jpg"

                # Extract labels from assessment data
                assessment_data = assessment.get('assessment_data', {})
                damage_type = assessment.get('damage_type', 'unknown')

                all_data.append({
                    'image_url': image_url,
                    'image_filename': image_filename,
                    'labels': self.extract_yolo_labels(assessment_data, damage_type, class_names),
                    'source': 'assessment'
                })

        # Process corrections
        for correction in tqdm(corrections, desc="Processing corrections"):
            image_url = correction['image_url']
            image_index = correction.get('image_index', 0)

            # Generate unique filename
            image_hash = hashlib.md5(f"correction_{correction['id']}".encode()).hexdigest()
            image_filename = f"correction_{image_hash}.jpg"

            all_data.append({
                'image_url': image_url,
                'image_filename': image_filename,
                'labels': correction.get('corrected_labels', ''),
                'source': 'correction'
            })

        # Shuffle and split data
        np.random.shuffle(all_data)
        n = len(all_data)
        train_end = int(n * train_split)
        val_end = int(n * (train_split + val_split))

        splits = {
            'train': all_data[:train_end],
            'valid': all_data[train_end:val_end],
            'test': all_data[val_end:]
        }

        # Download images and save labels
        for split_name, split_data in splits.items():
            for item in tqdm(split_data, desc=f"Downloading {split_name} images"):
                image_path = output_dir / split_name / 'images' / item['image_filename']
                label_path = output_dir / split_name / 'labels' / item['image_filename'].replace('.jpg', '.txt')

                # Download image
                success = await self.download_image(item['image_url'], image_path)
                if success:
                    # Save labels
                    async with aiofiles.open(label_path, 'w') as f:
                        await f.write(item['labels'])

                    dataset_stats[f'{split_name}_count'] += 1
                    dataset_stats['total_images'] += 1

                    # Update class distribution
                    for line in item['labels'].split('\n'):
                        if line.strip():
                            class_id = int(line.split()[0])
                            if class_id < len(class_names):
                                class_name = class_names[class_id]
                                dataset_stats['class_distribution'][class_name] = \
                                    dataset_stats['class_distribution'].get(class_name, 0) + 1
                else:
                    dataset_stats['failed_downloads'] += 1

        # Create data.yaml
        data_yaml = {
            'train': str(output_dir / 'train' / 'images'),
            'val': str(output_dir / 'valid' / 'images'),
            'test': str(output_dir / 'test' / 'images'),
            'nc': len(class_names),
            'names': class_names
        }

        with open(output_dir / 'data.yaml', 'w') as f:
            yaml.dump(data_yaml, f)

        return dataset_stats

    def extract_yolo_labels(
        self,
        assessment_data: Dict[str, Any],
        damage_type: str,
        class_names: List[str]
    ) -> str:
        """Extract YOLO format labels from assessment data."""

        # This is a simplified version - in production, you'd extract
        # actual bounding boxes from the assessment data
        labels = []

        # Map damage type to class ID
        if damage_type in class_names:
            class_id = class_names.index(damage_type)
            # Default to center of image with 0.5 width/height
            # In production, use actual detection boxes
            labels.append(f"{class_id} 0.5 0.5 0.5 0.5")

        return '\n'.join(labels)

    def get_class_names(self) -> List[str]:
        """Get YOLO class names from configuration."""

        # These should match your data.yaml
        return [
            'bare_electrical_wire', 'broken_window', 'broken_timber_floor',
            'building', 'crack', 'cracked_skirting', 'damage', 'damaged_brick',
            'damaged_tower', 'damaged_plaster_board', 'damaged_roof', 'damaged_wall',
            'damp', 'damp_damage', 'dangerous_electrical_socket', 'defective_paving',
            'expansion_crack', 'fissure', 'leaking_damage_on_wood', 'leaking_radiator',
            'loose_coping', 'loose_pipes', 'minor_crack', 'mold', 'mould_on_wall',
            'normal_wall', 'other', 'plaster_board', 'plaster_coverring_to_stop_leaking',
            'radiator', 'radiator_conner', 'roof', 'rotten', 'rotten_timber',
            'rust_on_radiator', 'spalling', 'stepped_cracking_on_brick', 'sunken_block',
            'trou', 'uncracked_wall', 'unstable', 'wall_leaking', 'whole_cause_by_damp',
            'window', 'bad_coupler', 'bad_line', 'bath', 'brack_crack', 'burst',
            'closed_valve', 'crack_mold_damp_spalling_cor', 'designradiator', 'douche',
            'good_bolt', 'good_coupler', 'good_line', 'good_valve', 'hole', 'leak',
            'opened_valve', 'pipe', 'rusty_bolt', 'rusty_valve', 'toilet', 'wall_flange',
            'wall_corrosion', 'wall_crack', 'wall_deterioration', 'wall_mold', 'wall_stain',
            'wastafel'
        ]

    async def prepare_sam3_dataset(
        self,
        masks_data: Dict[str, List[Dict[str, Any]]],
        output_dir: Path
    ) -> Dict[str, Any]:
        """Prepare SAM3 segmentation dataset."""

        sam3_dir = output_dir / 'sam3_masks'
        sam3_dir.mkdir(parents=True, exist_ok=True)

        stats = {
            'total_masks': 0,
            'by_damage_type': {},
            'by_quality': {}
        }

        for assessment_id, masks in masks_data.items():
            for mask in masks:
                # Save mask data
                mask_filename = f"{assessment_id}_{mask['id']}.json"
                mask_path = sam3_dir / mask_filename

                mask_data = {
                    'assessment_id': assessment_id,
                    'image_url': mask['image_url'],
                    'damage_type': mask['damage_type'],
                    'masks': mask['masks'],
                    'boxes': mask['boxes'],
                    'scores': mask['scores'],
                    'num_instances': mask['num_instances']
                }

                async with aiofiles.open(mask_path, 'w') as f:
                    await f.write(json.dumps(mask_data, indent=2))

                # Update stats
                stats['total_masks'] += 1
                damage_type = mask['damage_type']
                stats['by_damage_type'][damage_type] = \
                    stats['by_damage_type'].get(damage_type, 0) + 1

                quality = mask.get('segmentation_quality', 'unknown')
                stats['by_quality'][quality] = \
                    stats['by_quality'].get(quality, 0) + 1

        return stats


async def main():
    parser = argparse.ArgumentParser(description='Fetch and prepare ML training data')
    parser.add_argument('--output-dir', required=True, help='Output directory for training data')
    parser.add_argument('--min-samples', type=int, default=100, help='Minimum number of samples')
    parser.add_argument('--include-corrections', action='store_true', help='Include YOLO corrections')
    parser.add_argument('--include-sam3-masks', action='store_true', help='Include SAM3 masks')
    parser.add_argument('--include-auto-validated', action='store_true', help='Include auto-validated assessments')
    parser.add_argument('--days-back', type=int, default=90, help='Days to look back for data')

    args = parser.parse_args()

    # Get Supabase credentials from environment
    supabase_url = os.environ['SUPABASE_URL']
    supabase_key = os.environ['SUPABASE_SERVICE_KEY']

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    async with TrainingDataFetcher(supabase_url, supabase_key) as fetcher:
        # Fetch validated assessments
        assessments = await fetcher.fetch_validated_assessments(
            min_samples=args.min_samples,
            include_auto_validated=args.include_auto_validated,
            days_back=args.days_back
        )

        corrections = []
        if args.include_corrections:
            corrections = await fetcher.fetch_yolo_corrections()

        # Prepare YOLO dataset
        dataset_stats = await fetcher.prepare_yolo_dataset(
            assessments=assessments,
            corrections=corrections,
            output_dir=output_dir
        )

        # Fetch and prepare SAM3 masks if requested
        if args.include_sam3_masks:
            assessment_ids = [a['id'] for a in assessments]
            masks_data = await fetcher.fetch_sam3_masks(assessment_ids)
            sam3_stats = await fetcher.prepare_sam3_dataset(masks_data, output_dir)
            dataset_stats['sam3'] = sam3_stats

        # Save dataset statistics
        stats_path = output_dir / 'dataset_stats.json'
        with open(stats_path, 'w') as f:
            json.dump(dataset_stats, f, indent=2)

        print(f"\nDataset preparation complete!")
        print(f"Total images: {dataset_stats['total_images']}")
        print(f"Train: {dataset_stats['train_count']}")
        print(f"Validation: {dataset_stats['val_count']}")
        print(f"Test: {dataset_stats['test_count']}")
        if dataset_stats['failed_downloads'] > 0:
            print(f"Failed downloads: {dataset_stats['failed_downloads']}")


if __name__ == '__main__':
    asyncio.run(main())