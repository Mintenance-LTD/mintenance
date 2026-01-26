#!/usr/bin/env node
/**
 * Merge Datasets Script - Create v4.0
 *
 * Combines:
 * - v3.0 dataset (3,061 images)
 * - SAM3 auto-labeled dataset (2,000-3,000 images)
 *
 * Output: Dataset v4.0 (5,061-6,061 images)
 */

import * as fs from 'fs';
import * as path from 'path';

const V3_DATASET = './yolo_dataset_v3';
const SAM3_DATASET = './yolo_dataset_sam3_labeled';
const OUTPUT_DATASET = './yolo_dataset_v4';

interface MergeStats {
  v3_train: number;
  v3_val: number;
  sam3_train: number;
  sam3_val: number;
  total_train: number;
  total_val: number;
  total: number;
}

console.log('Dataset v4.0 Merge');
console.log('='.repeat(70));
console.log(`Source 1: ${V3_DATASET} (v3.0)`);
console.log(`Source 2: ${SAM3_DATASET} (SAM3 auto-labeled)`);
console.log(`Output: ${OUTPUT_DATASET} (v4.0)`);
console.log('='.repeat(70) + '\n');

// Check input datasets exist
if (!fs.existsSync(V3_DATASET)) {
  console.error(`❌ v3.0 dataset not found: ${V3_DATASET}`);
  process.exit(1);
}

if (!fs.existsSync(SAM3_DATASET)) {
  console.error(`❌ SAM3 dataset not found: ${SAM3_DATASET}`);
  console.log('\n💡 Run SAM3 auto-labeling first:');
  console.log('   npm run sam3:auto-label:test');
  process.exit(1);
}

// Create output directories
const outputDirs = [
  path.join(OUTPUT_DATASET, 'train', 'images'),
  path.join(OUTPUT_DATASET, 'train', 'labels'),
  path.join(OUTPUT_DATASET, 'val', 'images'),
  path.join(OUTPUT_DATASET, 'val', 'labels')
];

outputDirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

const stats: MergeStats = {
  v3_train: 0,
  v3_val: 0,
  sam3_train: 0,
  sam3_val: 0,
  total_train: 0,
  total_val: 0,
  total: 0
};

/**
 * Copy dataset split
 */
function copyDatasetSplit(
  sourceDataset: string,
  sourceSplit: string,
  targetSplit: string,
  prefix: string = ''
): number {
  const sourceImagesDir = path.join(sourceDataset, sourceSplit, 'images');
  const sourceLabelsDir = path.join(sourceDataset, sourceSplit, 'labels');
  const targetImagesDir = path.join(OUTPUT_DATASET, targetSplit, 'images');
  const targetLabelsDir = path.join(OUTPUT_DATASET, targetSplit, 'labels');

  if (!fs.existsSync(sourceImagesDir)) {
    return 0;
  }

  const images = fs.readdirSync(sourceImagesDir).filter(f => f.endsWith('.jpg'));
  let copied = 0;

  images.forEach((img, i) => {
    if (i % 500 === 0) {
      process.stdout.write(`  ${sourceSplit}: ${i}/${images.length}\r`);
    }

    const sourceImagePath = path.join(sourceImagesDir, img);
    const sourceLabelPath = path.join(sourceLabelsDir, img.replace('.jpg', '.txt'));

    // Add prefix to avoid name collisions
    const outputName = prefix ? `${prefix}_${img}` : img;
    const targetImagePath = path.join(targetImagesDir, outputName);
    const targetLabelPath = path.join(targetLabelsDir, outputName.replace('.jpg', '.txt'));

    // Copy image
    fs.copyFileSync(sourceImagePath, targetImagePath);

    // Copy label if exists
    if (fs.existsSync(sourceLabelPath)) {
      fs.copyFileSync(sourceLabelPath, targetLabelPath);
      copied++;
    }
  });

  console.log(`  ${sourceSplit}: ${images.length}/${images.length} ✓`);
  return copied;
}

// Step 1: Copy v3.0 dataset
console.log('Step 1/2: Copying v3.0 dataset...\n');
stats.v3_train = copyDatasetSplit(V3_DATASET, 'train', 'train', 'v3');
stats.v3_val = copyDatasetSplit(V3_DATASET, 'val', 'val', 'v3');

// Step 2: Copy SAM3 auto-labeled dataset
console.log('\nStep 2/2: Adding SAM3 auto-labeled dataset...\n');
stats.sam3_train = copyDatasetSplit(SAM3_DATASET, 'train', 'train', 'sam3');
stats.sam3_val = copyDatasetSplit(SAM3_DATASET, 'val', 'val', 'sam3');

// Calculate totals
stats.total_train = stats.v3_train + stats.sam3_train;
stats.total_val = stats.v3_val + stats.sam3_val;
stats.total = stats.total_train + stats.total_val;

// Create data.yaml
const dataYaml = `train: ../train/images
val: ../val/images

nc: 15
names: ['structural_crack', 'water_damage', 'mold', 'rot', 'electrical_fault', 'spalling', 'window_broken', 'roof_damage', 'foundation_issue', 'wall_crack', 'floor_damage', 'ceiling_damage', 'pest_damage', 'hvac_issue', 'plumbing_issue']

# Dataset v4.0 - SAM3 Auto-Labeled
# Sources:
#   - Original dataset: 998 images
#   - Building Defect Detection 7 v3: 1,630 images
#   - Building Defect Detection 6 v1: 433 images (manually labeled)
#   - Building Defect Detection 6 v1: ${stats.sam3_train + stats.sam3_val} images (SAM3 auto-labeled)
# Total: ${stats.total} images (${stats.total_train} train, ${stats.total_val} val)
# Labeling: Human + SAM3 (min confidence: 0.6)
`;

fs.writeFileSync(path.join(OUTPUT_DATASET, 'data.yaml'), dataYaml);

// Print final statistics
const v3Total = stats.v3_train + stats.v3_val;
const percentageIncrease = ((stats.total / v3Total - 1) * 100).toFixed(0);

console.log('\n' + '='.repeat(70));
console.log('MERGE COMPLETE - Dataset v4.0');
console.log('='.repeat(70));
console.log(`Train: ${stats.v3_train.toLocaleString()} (v3) + ${stats.sam3_train.toLocaleString()} (SAM3) = ${stats.total_train.toLocaleString()} total`);
console.log(`Val:   ${stats.v3_val.toLocaleString()} (v3) + ${stats.sam3_val.toLocaleString()} (SAM3) = ${stats.total_val.toLocaleString()} total`);
console.log(`TOTAL: ${stats.total.toLocaleString()} images (+${percentageIncrease}% from v3.0)`);
console.log(`\nDataset saved to: ${path.resolve(OUTPUT_DATASET)}`);
console.log(`Ready for Colab training v4.0 🚀`);
console.log('='.repeat(70) + '\n');

// Print next steps
console.log('Next Steps:');
console.log('1. Create Colab upload ZIPs: npm run create-colab-zips-v4');
console.log('2. Upload to Google Drive: yolo-training-v4/ folder');
console.log('3. Train YOLO v4.0 on Google Colab (300 epochs)');
console.log('4. Target: mAP@50 > 45% (production-grade)\n');
