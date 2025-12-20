#!/usr/bin/env node
/**
 * SAM3 Auto-Labeling Script
 *
 * Recovers 4,193 filtered Dataset 6 images by auto-labeling with SAM3
 *
 * Usage:
 *   npm run sam3:auto-label -- --test        # Test on 100 images
 *   npm run sam3:auto-label -- --full        # Process all 4,193 images
 *   npm run sam3:auto-label -- --start 0 --end 1000  # Custom range
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// SAM3 Configuration
const SAM3_SERVICE_URL = process.env.SAM3_SERVICE_URL || 'http://localhost:8001';
const SAM3_TIMEOUT_MS = 30000; // 30 seconds per image
const MIN_CONFIDENCE = 0.6; // 60% confidence threshold
const MIN_BOX_AREA = 0.01; // 1% of image
const MAX_BOX_AREA = 0.9; // 90% of image
const IMAGE_WIDTH = 640;
const IMAGE_HEIGHT = 640;

// Dataset paths
const DATASET_6_PATH = 'C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/Building Defect Detection 6.v1i.yolov12';
const OUTPUT_PATH = './yolo_dataset_sam3_labeled';
const PROGRESS_FILE = './sam3_progress.json';

// 15 Defect classes with text prompts for SAM3
const DEFECT_PROMPTS: Record<number, string[]> = {
  0: ['structural crack', 'crack in wall', 'crack in concrete', 'crack', 'wall crack'],
  1: ['water damage', 'water stain', 'water leak', 'damp', 'dampness', 'moisture damage'],
  2: ['mold', 'mould', 'fungus', 'mildew', 'black mold'],
  3: ['rot', 'rotten wood', 'wood decay', 'timber rot', 'decay'],
  4: ['electrical fault', 'exposed wire', 'bare wire', 'dangerous electrical socket'],
  5: ['spalling', 'concrete spalling', 'brick spalling', 'surface damage'],
  6: ['broken window', 'cracked glass', 'damaged window', 'shattered glass'],
  7: ['roof damage', 'roof leak', 'missing tiles', 'damaged roof'],
  8: ['foundation issue', 'foundation crack', 'sunken foundation', 'loose coping'],
  9: ['wall crack', 'wall damage', 'damaged wall', 'hole in wall'],
  10: ['floor damage', 'broken floor', 'floor crack', 'damaged floor', 'broken timber floor'],
  11: ['ceiling damage', 'ceiling crack', 'damaged ceiling', 'damaged plaster board'],
  12: ['pest damage', 'termite damage', 'insect damage', 'wood damage'],
  13: ['HVAC issue', 'radiator rust', 'HVAC damage', 'rust on radiator'],
  14: ['plumbing issue', 'pipe leak', 'burst pipe', 'leaking radiator', 'loose pipes']
};

const CLASS_NAMES = [
  'structural_crack', 'water_damage', 'mold', 'rot', 'electrical_fault',
  'spalling', 'window_broken', 'roof_damage', 'foundation_issue', 'wall_crack',
  'floor_damage', 'ceiling_damage', 'pest_damage', 'hvac_issue', 'plumbing_issue'
];

interface YOLOLabel {
  classId: number;
  x_center: number;
  y_center: number;
  width: number;
  height: number;
  confidence: number;
}

interface SAM3Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SAM3Response {
  success: boolean;
  masks?: number[][][];
  boxes?: SAM3Box[];
  scores?: number[];
  num_instances?: number;
  error?: string;
}

interface ProcessingStats {
  totalImages: number;
  processed: number;
  successful: number;
  failed: number;
  noDefects: number;
  totalLabelsGenerated: number;
  labelsPerClass: Record<number, number>;
  startTime: number;
  endTime?: number;
  errors: Array<{ image: string; error: string }>;
}

// Global stats
const stats: ProcessingStats = {
  totalImages: 0,
  processed: 0,
  successful: 0,
  failed: 0,
  noDefects: 0,
  totalLabelsGenerated: 0,
  labelsPerClass: {},
  startTime: Date.now(),
  errors: []
};

// Initialize class counters
for (let i = 0; i < 15; i++) {
  stats.labelsPerClass[i] = 0;
}

/**
 * Check SAM3 service health
 */
async function checkSAM3Health(): Promise<boolean> {
  try {
    console.log('🔍 Checking SAM3 service health...');
    const response = await fetch(`${SAM3_SERVICE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      console.error(`❌ SAM3 service returned status ${response.status}`);
      return false;
    }

    const data = await response.json();
    if (data.status === 'healthy' && data.model_loaded === true) {
      console.log('✅ SAM3 service is healthy and model is loaded');
      return true;
    }

    console.error('❌ SAM3 service is not ready:', data);
    return false;
  } catch (error) {
    console.error('❌ Failed to connect to SAM3 service:', error instanceof Error ? error.message : String(error));
    console.log('\n💡 Make sure SAM3 microservice is running:');
    console.log('   cd apps/sam3-service');
    console.log('   venv\\Scripts\\activate');
    console.log('   python app/main.py');
    return false;
  }
}

/**
 * Convert image to base64
 */
function imageToBase64(imagePath: string): string {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

/**
 * Run SAM3 segmentation for a single defect type
 */
async function runSAM3Segmentation(
  imageBase64: string,
  prompts: string[]
): Promise<SAM3Response> {
  try {
    // Try each prompt until one succeeds
    for (const prompt of prompts) {
      const response = await fetch(`${SAM3_SERVICE_URL}/segment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imageBase64,
          text_prompt: prompt,
          threshold: MIN_CONFIDENCE
        }),
        signal: AbortSignal.timeout(SAM3_TIMEOUT_MS)
      });

      if (!response.ok) continue;

      const data = await response.json() as SAM3Response;
      if (data.success && data.num_instances && data.num_instances > 0) {
        return data;
      }
    }

    // No instances found with any prompt
    return { success: true, num_instances: 0 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Convert SAM3 boxes to YOLO format
 */
function sam3BoxToYOLO(
  box: SAM3Box,
  classId: number,
  confidence: number
): YOLOLabel | null {
  // Normalize coordinates
  const x_center = (box.x + box.w / 2) / IMAGE_WIDTH;
  const y_center = (box.y + box.h / 2) / IMAGE_HEIGHT;
  const width = box.w / IMAGE_WIDTH;
  const height = box.h / IMAGE_HEIGHT;

  // Filter by area
  const area = width * height;
  if (area < MIN_BOX_AREA || area > MAX_BOX_AREA) {
    return null;
  }

  // Ensure values are in [0, 1]
  if (x_center < 0 || x_center > 1 || y_center < 0 || y_center > 1) {
    return null;
  }
  if (width <= 0 || width > 1 || height <= 0 || height > 1) {
    return null;
  }

  return {
    classId,
    x_center,
    y_center,
    width,
    height,
    confidence
  };
}

/**
 * Apply Non-Maximum Suppression to remove overlapping boxes
 */
function applyNMS(labels: YOLOLabel[], iouThreshold: number = 0.5): YOLOLabel[] {
  if (labels.length === 0) return [];

  // Sort by confidence (descending)
  const sorted = [...labels].sort((a, b) => b.confidence - a.confidence);
  const keep: YOLOLabel[] = [];

  while (sorted.length > 0) {
    const current = sorted.shift()!;
    keep.push(current);

    // Remove boxes with high IoU
    const remaining: YOLOLabel[] = [];
    for (const label of sorted) {
      const iou = calculateIoU(current, label);
      if (iou < iouThreshold) {
        remaining.push(label);
      }
    }
    sorted.length = 0;
    sorted.push(...remaining);
  }

  return keep;
}

/**
 * Calculate Intersection over Union
 */
function calculateIoU(box1: YOLOLabel, box2: YOLOLabel): number {
  const x1_min = box1.x_center - box1.width / 2;
  const y1_min = box1.y_center - box1.height / 2;
  const x1_max = box1.x_center + box1.width / 2;
  const y1_max = box1.y_center + box1.height / 2;

  const x2_min = box2.x_center - box2.width / 2;
  const y2_min = box2.y_center - box2.height / 2;
  const x2_max = box2.x_center + box2.width / 2;
  const y2_max = box2.y_center + box2.height / 2;

  const inter_x_min = Math.max(x1_min, x2_min);
  const inter_y_min = Math.max(y1_min, y2_min);
  const inter_x_max = Math.min(x1_max, x2_max);
  const inter_y_max = Math.min(y1_max, y2_max);

  if (inter_x_max < inter_x_min || inter_y_max < inter_y_min) {
    return 0;
  }

  const inter_area = (inter_x_max - inter_x_min) * (inter_y_max - inter_y_min);
  const box1_area = box1.width * box1.height;
  const box2_area = box2.width * box2.height;
  const union_area = box1_area + box2_area - inter_area;

  return inter_area / union_area;
}

/**
 * Process a single image with SAM3
 */
async function processImage(imagePath: string): Promise<YOLOLabel[]> {
  try {
    // Convert image to base64
    const imageBase64 = imageToBase64(imagePath);
    const allLabels: YOLOLabel[] = [];

    // Run SAM3 for each defect class
    for (const [classIdStr, prompts] of Object.entries(DEFECT_PROMPTS)) {
      const classId = parseInt(classIdStr);

      const result = await runSAM3Segmentation(imageBase64, prompts);

      if (!result.success || !result.num_instances || result.num_instances === 0) {
        continue;
      }

      // Convert SAM3 boxes to YOLO format
      for (let i = 0; i < result.num_instances; i++) {
        const box = result.boxes![i];
        const confidence = result.scores![i];

        if (confidence < MIN_CONFIDENCE) continue;

        const yoloLabel = sam3BoxToYOLO(box, classId, confidence);
        if (yoloLabel) {
          allLabels.push(yoloLabel);
        }
      }
    }

    // Apply NMS to remove overlapping detections
    const filteredLabels = applyNMS(allLabels, 0.5);

    return filteredLabels;
  } catch (error) {
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Save YOLO labels to file
 */
function saveYOLOLabels(labels: YOLOLabel[], outputPath: string): void {
  const lines = labels.map(label =>
    `${label.classId} ${label.x_center.toFixed(6)} ${label.y_center.toFixed(6)} ${label.width.toFixed(6)} ${label.height.toFixed(6)}`
  );
  fs.writeFileSync(outputPath, lines.join('\n') + '\n');
}

/**
 * Save progress to file
 */
function saveProgress(): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(stats, null, 2));
}

/**
 * Load progress from file
 */
function loadProgress(): number {
  if (fs.existsSync(PROGRESS_FILE)) {
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    Object.assign(stats, data);
    console.log(`📂 Resuming from image ${stats.processed}/${stats.totalImages}`);
    return stats.processed;
  }
  return 0;
}

/**
 * Print progress
 */
function printProgress(): void {
  const elapsed = Date.now() - stats.startTime;
  const rate = stats.processed / (elapsed / 1000);
  const remaining = (stats.totalImages - stats.processed) / rate;
  const eta = new Date(Date.now() + remaining * 1000);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Progress: ${stats.processed}/${stats.totalImages} (${((stats.processed / stats.totalImages) * 100).toFixed(1)}%)`);
  console.log(`Success: ${stats.successful} | Failed: ${stats.failed} | No defects: ${stats.noDefects}`);
  console.log(`Labels generated: ${stats.totalLabelsGenerated}`);
  console.log(`Rate: ${rate.toFixed(2)} images/sec`);
  console.log(`ETA: ${eta.toLocaleTimeString()}`);
  console.log(`${'='.repeat(70)}\n`);
}

/**
 * Print final statistics
 */
function printFinalStats(): void {
  stats.endTime = Date.now();
  const duration = (stats.endTime - stats.startTime) / 1000 / 60; // minutes

  console.log(`\n${'='.repeat(70)}`);
  console.log('SAM3 AUTO-LABELING COMPLETE');
  console.log(`${'='.repeat(70)}`);
  console.log(`Total images: ${stats.totalImages}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`Successful: ${stats.successful} (${((stats.successful / stats.processed) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`No defects found: ${stats.noDefects}`);
  console.log(`Total labels: ${stats.totalLabelsGenerated}`);
  console.log(`Duration: ${duration.toFixed(1)} minutes`);
  console.log(`Rate: ${(stats.processed / duration).toFixed(2)} images/min`);
  console.log(`\nLabels per class:`);
  for (let i = 0; i < 15; i++) {
    const count = stats.labelsPerClass[i];
    if (count > 0) {
      console.log(`  ${i}: ${CLASS_NAMES[i]}: ${count}`);
    }
  }
  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`);
    stats.errors.slice(0, 10).forEach(e => console.log(`  ${e.image}: ${e.error}`));
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more`);
    }
  }
  console.log(`${'='.repeat(70)}\n`);

  // Save final stats
  saveProgress();
}

/**
 * Main processing function
 */
async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const isFull = args.includes('--full');

  let startIdx = 0;
  let endIdx = -1;

  const startArg = args.indexOf('--start');
  if (startArg !== -1) {
    startIdx = parseInt(args[startArg + 1]);
  }

  const endArg = args.indexOf('--end');
  if (endArg !== -1) {
    endIdx = parseInt(args[endArg + 1]);
  }

  console.log('SAM3 AUTO-LABELING SCRIPT');
  console.log('='.repeat(70));
  console.log(`Mode: ${isTest ? 'TEST (100 images)' : isFull ? 'FULL (all images)' : 'CUSTOM'}`);
  console.log(`Dataset: ${DATASET_6_PATH}`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log(`Min confidence: ${MIN_CONFIDENCE}`);
  console.log(`SAM3 service: ${SAM3_SERVICE_URL}`);
  console.log('='.repeat(70) + '\n');

  // Check SAM3 service
  const isHealthy = await checkSAM3Health();
  if (!isHealthy) {
    console.error('❌ SAM3 service is not available. Exiting.');
    process.exit(1);
  }

  // Create output directories
  const trainImagesDir = path.join(OUTPUT_PATH, 'train', 'images');
  const trainLabelsDir = path.join(OUTPUT_PATH, 'train', 'labels');
  const valImagesDir = path.join(OUTPUT_PATH, 'val', 'images');
  const valLabelsDir = path.join(OUTPUT_PATH, 'val', 'labels');

  [trainImagesDir, trainLabelsDir, valImagesDir, valLabelsDir].forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
  });

  // Get all images from Dataset 6
  const trainImages = fs.readdirSync(path.join(DATASET_6_PATH, 'train', 'images'))
    .filter(f => f.endsWith('.jpg'));
  const valImages = fs.readdirSync(path.join(DATASET_6_PATH, 'valid', 'images'))
    .filter(f => f.endsWith('.jpg'));

  // Combine and filter
  let allImages = [
    ...trainImages.map(f => ({ file: f, split: 'train' })),
    ...valImages.map(f => ({ file: f, split: 'valid' }))
  ];

  if (isTest) {
    allImages = allImages.slice(0, 100);
  } else if (endIdx > 0) {
    allImages = allImages.slice(startIdx, endIdx);
  } else if (startIdx > 0) {
    allImages = allImages.slice(startIdx);
  }

  stats.totalImages = allImages.length;
  console.log(`Processing ${stats.totalImages} images...\n`);

  // Load progress if resuming
  const resumeIdx = loadProgress();

  // Process images
  for (let i = resumeIdx; i < allImages.length; i++) {
    const { file, split } = allImages[i];
    const imagePath = path.join(DATASET_6_PATH, split === 'train' ? 'train' : 'valid', 'images', file);

    try {
      // Process with SAM3
      const labels = await processImage(imagePath);

      if (labels.length === 0) {
        stats.noDefects++;
      } else {
        // Save image and labels
        const outputSplit = split === 'train' ? 'train' : 'val';
        const outputImagePath = path.join(OUTPUT_PATH, outputSplit, 'images', `sam3_${file}`);
        const outputLabelPath = path.join(OUTPUT_PATH, outputSplit, 'labels', `sam3_${file.replace('.jpg', '.txt')}`);

        fs.copyFileSync(imagePath, outputImagePath);
        saveYOLOLabels(labels, outputLabelPath);

        stats.successful++;
        stats.totalLabelsGenerated += labels.length;

        // Update class counts
        labels.forEach(label => {
          stats.labelsPerClass[label.classId]++;
        });
      }

      stats.processed++;

      // Print progress every 50 images
      if (stats.processed % 50 === 0) {
        printProgress();
        saveProgress();
      }

    } catch (error) {
      stats.failed++;
      stats.processed++;
      stats.errors.push({
        image: file,
        error: error instanceof Error ? error.message : String(error)
      });
      console.error(`❌ Failed to process ${file}:`, error instanceof Error ? error.message : String(error));
    }
  }

  // Print final statistics
  printFinalStats();

  // Create data.yaml
  const dataYaml = `train: ../train/images
val: ../val/images

nc: 15
names: ['structural_crack', 'water_damage', 'mold', 'rot', 'electrical_fault', 'spalling', 'window_broken', 'roof_damage', 'foundation_issue', 'wall_crack', 'floor_damage', 'ceiling_damage', 'pest_damage', 'hvac_issue', 'plumbing_issue']

# SAM3 Auto-Labeled Dataset
# Source: Building Defect Detection 6 v1 (filtered images)
# Total: ${stats.successful} images with defects
# Labels: ${stats.totalLabelsGenerated} instances
# Auto-labeled with SAM3 (min confidence: ${MIN_CONFIDENCE})
`;

  fs.writeFileSync(path.join(OUTPUT_PATH, 'data.yaml'), dataYaml);

  console.log(`✅ Dataset saved to: ${OUTPUT_PATH}`);
  console.log(`✅ Ready to merge with v3.0 dataset`);
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
