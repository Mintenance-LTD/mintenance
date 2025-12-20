#!/usr/bin/env node
/**
 * Create Colab Upload ZIPs for Dataset v4.0
 *
 * Creates ZIP files optimized for Google Colab upload
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const DATASET = './yolo_dataset_v4';
const OUTPUT_DIR = './colab_upload_v4';

console.log('Creating ZIP files for Colab v4.0 training...\n');

// Check dataset exists
if (!fs.existsSync(DATASET)) {
  console.error(`❌ Dataset v4.0 not found: ${DATASET}`);
  console.log('\n💡 Run merge first:');
  console.log('   npm run merge-datasets-v4');
  process.exit(1);
}

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

/**
 * Create ZIP file using PowerShell
 */
function createZip(sourcePath: string, zipName: string): void {
  const fullZipPath = path.resolve(OUTPUT_DIR, zipName);
  const fullSourcePath = path.resolve(sourcePath);

  console.log(`Creating ${zipName}...`);

  try {
    execSync(
      `powershell -Command "Compress-Archive -Path '${fullSourcePath}\\*' -DestinationPath '${fullZipPath}' -Force"`,
      { stdio: 'pipe', maxBuffer: 500 * 1024 * 1024 }
    );

    const stats = fs.statSync(`${fullZipPath}.zip`);
    console.log(`  ✓ ${zipName}.zip (${(stats.size / 1024 / 1024).toFixed(1)} MB)\n`);
  } catch (error) {
    console.error(`  ✗ Failed to create ${zipName}:`, error instanceof Error ? error.message : String(error));
  }
}

// Create ZIP files
createZip(path.join(DATASET, 'train', 'images'), 'train_images');
createZip(path.join(DATASET, 'train', 'labels'), 'train_labels');
createZip(path.join(DATASET, 'val', 'images'), 'val_images');
createZip(path.join(DATASET, 'val', 'labels'), 'val_labels');

// Copy data.yaml
fs.copyFileSync(
  path.join(DATASET, 'data.yaml'),
  path.join(OUTPUT_DIR, 'data.yaml')
);
console.log('Copied data.yaml\n');

// Copy best model from v2.0 as starting point (transfer learning)
const v2Model = './best_model_final.pt';
if (fs.existsSync(v2Model)) {
  fs.copyFileSync(v2Model, path.join(OUTPUT_DIR, 'best_model_v2.pt'));
  console.log('Copied best_model_v2.pt (v2.0 checkpoint for transfer learning)\n');
}

// Print summary
console.log('='.repeat(70));
console.log('Colab Upload Files Ready - Dataset v4.0');
console.log('='.repeat(70));
console.log('Files created in colab_upload_v4/:');
console.log('  - train_images.zip');
console.log('  - train_labels.zip');
console.log('  - val_images.zip');
console.log('  - val_labels.zip');
console.log('  - data.yaml');
console.log('  - best_model_v2.pt (optional transfer learning)');
console.log('\nUpload to Google Drive: yolo-training-v4/ folder');
console.log('Ready for Colab training 🚀');
console.log('='.repeat(70) + '\n');
