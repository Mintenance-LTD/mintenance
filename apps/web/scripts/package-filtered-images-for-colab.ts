/**
 * Package Filtered Images for SAM 3 Colab Auto-Labeling
 *
 * This script packages the 4,193 filtered images from Dataset 6 into a ZIP file
 * ready for upload to Google Drive and processing in Colab.
 */

import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

const DATASET6_PATH = 'C:\\Users\\Djodjo.Nkouka.ERICCOLE\\Downloads\\Building Defect Detection 6.v1i.yolov12';
const OUTPUT_ZIP = 'filtered_images.zip';
const OUTPUT_DIR = path.dirname(OUTPUT_ZIP);

interface Stats {
  totalImages: number;
  trainImages: number;
  validImages: number;
  zipSizeMB: number;
}

async function packageFilteredImages(): Promise<Stats> {
  const stats: Stats = {
    totalImages: 0,
    trainImages: 0,
    validImages: 0,
    zipSizeMB: 0
  };

  console.log('📦 Packaging Filtered Images for SAM 3 Auto-Labeling\n');
  console.log(`Dataset: ${DATASET6_PATH}`);
  console.log(`Output: ${OUTPUT_ZIP}\n`);

  // Create ZIP archive
  const output = fs.createWriteStream(OUTPUT_ZIP);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  // Track progress
  archive.on('progress', (progress) => {
    const percent = (progress.entries.processed / progress.entries.total * 100).toFixed(1);
    process.stdout.write(`\r📊 Progress: ${progress.entries.processed}/${progress.entries.total} files (${percent}%)`);
  });

  // Handle errors
  output.on('close', () => {
    stats.zipSizeMB = archive.pointer() / (1024 * 1024);
    console.log(`\n\n✅ ZIP created successfully!`);
    console.log(`   Size: ${stats.zipSizeMB.toFixed(2)} MB`);
    console.log(`   Total images: ${stats.totalImages}`);
    console.log(`   Train images: ${stats.trainImages}`);
    console.log(`   Valid images: ${stats.validImages}`);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);

  // Add train images (NO labels - we'll generate them with SAM 3)
  const trainDir = path.join(DATASET6_PATH, 'train', 'images');
  if (fs.existsSync(trainDir)) {
    const trainImages = fs.readdirSync(trainDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    console.log(`📂 Adding ${trainImages.length} train images...`);

    for (const img of trainImages) {
      const imgPath = path.join(trainDir, img);
      archive.file(imgPath, { name: `train/${img}` });
      stats.trainImages++;
    }
  }

  // Add valid images (NO labels)
  const validDir = path.join(DATASET6_PATH, 'valid', 'images');
  if (fs.existsSync(validDir)) {
    const validImages = fs.readdirSync(validDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    console.log(`📂 Adding ${validImages.length} valid images...`);

    for (const img of validImages) {
      const imgPath = path.join(validDir, img);
      archive.file(imgPath, { name: `valid/${img}` });
      stats.validImages++;
    }
  }

  stats.totalImages = stats.trainImages + stats.validImages;

  // Add class mapping for reference
  const classMapping = {
    classes: [
      'crack', 'water_damage', 'mold', 'rust', 'peeling_paint',
      'efflorescence', 'spalling', 'deterioration', 'structural_damage',
      'settlement', 'delamination', 'discoloration', 'biological_growth',
      'honeycomb', 'missing_grout'
    ],
    source_dataset: 'Building Defect Detection 6.v1i',
    note: 'These images were filtered out from Dataset 6 but may contain defects with wrong/missing labels'
  };

  archive.append(JSON.stringify(classMapping, null, 2), { name: 'class_mapping.json' });

  // Finalize archive
  await archive.finalize();

  return new Promise((resolve) => {
    output.on('close', () => resolve(stats));
  });
}

// Main execution
(async () => {
  try {
    const stats = await packageFilteredImages();

    console.log('\n\n📋 Next Steps:\n');
    console.log('1. Upload filtered_images.zip to Google Drive');
    console.log('2. Open SAM3_Auto_Labeling_Colab.ipynb in Google Colab');
    console.log('3. Update the ZIP_PATH in the notebook to your Drive location');
    console.log('4. Run all cells to auto-label with SAM 3 (2-4 hours)');
    console.log('5. Download sam3_auto_labels.zip from Colab');
    console.log('6. Run: npm run dataset:merge-v4\n');

    console.log('⚠️  Remember to:');
    console.log('   - Use GPU runtime in Colab (Runtime > Change runtime type > T4 GPU)');
    console.log('   - Authenticate with Hugging Face (need access to facebook/sam3)');
    console.log('   - Keep Colab tab open during processing\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
