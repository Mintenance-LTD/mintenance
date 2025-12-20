/**
 * Download training images and prepare complete YOLO dataset
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

async function prepareTrainingDataset() {
  console.log('📦 Preparing Complete YOLO Training Dataset\n');
  console.log('='.repeat(60));

  const outputDir = path.join(__dirname, '../training_data');
  const imagesDir = path.join(outputDir, 'images');
  const labelsDir = path.join(outputDir, 'labels');

  // Ensure directories exist
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  if (!fs.existsSync(labelsDir)) fs.mkdirSync(labelsDir, { recursive: true });

  // Step 1: Download all training images
  console.log('📥 Downloading training images from storage...\n');

  const { data: files, error } = await supabase.storage
    .from('training-images')
    .list('', {
      limit: 1000
    });

  if (error) {
    console.error('Error listing files:', error);
    return;
  }

  if (!files || files.length === 0) {
    console.log('❌ No training images found in storage');
    return;
  }

  console.log(`Found ${files.length} images to download\n`);

  let downloadCount = 0;
  let errorCount = 0;

  // Download images in batches
  for (const file of files) {
    if (!file.name.match(/\.(jpg|jpeg|png|webp)$/i)) continue;

    const { data: urlData } = supabase.storage
      .from('training-images')
      .getPublicUrl(file.name);

    if (urlData) {
      const imagePath = path.join(imagesDir, file.name);

      try {
        if (!fs.existsSync(imagePath)) {
          await downloadFile(urlData.publicUrl, imagePath);
          downloadCount++;

          if (downloadCount % 10 === 0) {
            console.log(`  Downloaded ${downloadCount} images...`);
          }
        }
      } catch (err) {
        console.error(`  ❌ Failed to download ${file.name}:`, err);
        errorCount++;
      }
    }
  }

  console.log(`\n✅ Downloaded ${downloadCount} images`);
  if (errorCount > 0) {
    console.log(`❌ Failed to download ${errorCount} images`);
  }

  // Step 2: Verify label files exist for each image
  console.log('\n🏷️ Verifying label files...\n');

  const imageFiles = fs.readdirSync(imagesDir);
  let missingLabels = 0;

  for (const imageFile of imageFiles) {
    const labelFile = imageFile.replace(/\.[^/.]+$/, '.txt');
    const labelPath = path.join(labelsDir, labelFile);

    if (!fs.existsSync(labelPath)) {
      // Create a default label if missing
      const defaultLabel = '14 0.5 0.5 0.4 0.4'; // General damage, centered
      fs.writeFileSync(labelPath, defaultLabel);
      missingLabels++;
    }
  }

  if (missingLabels > 0) {
    console.log(`  ⚠️ Created ${missingLabels} default labels for images without labels`);
  }

  // Step 3: Split into train/val sets
  console.log('\n📊 Splitting dataset into train/val sets...\n');

  const trainDir = path.join(outputDir, 'train');
  const valDir = path.join(outputDir, 'val');
  const trainImagesDir = path.join(trainDir, 'images');
  const trainLabelsDir = path.join(trainDir, 'labels');
  const valImagesDir = path.join(valDir, 'images');
  const valLabelsDir = path.join(valDir, 'labels');

  // Create directories
  [trainImagesDir, trainLabelsDir, valImagesDir, valLabelsDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // Split 80/20
  const splitIndex = Math.floor(imageFiles.length * 0.8);
  const trainFiles = imageFiles.slice(0, splitIndex);
  const valFiles = imageFiles.slice(splitIndex);

  // Copy files to train/val directories
  trainFiles.forEach(file => {
    const imageSrc = path.join(imagesDir, file);
    const imageDest = path.join(trainImagesDir, file);
    const labelFile = file.replace(/\.[^/.]+$/, '.txt');
    const labelSrc = path.join(labelsDir, labelFile);
    const labelDest = path.join(trainLabelsDir, labelFile);

    if (fs.existsSync(imageSrc)) fs.copyFileSync(imageSrc, imageDest);
    if (fs.existsSync(labelSrc)) fs.copyFileSync(labelSrc, labelDest);
  });

  valFiles.forEach(file => {
    const imageSrc = path.join(imagesDir, file);
    const imageDest = path.join(valImagesDir, file);
    const labelFile = file.replace(/\.[^/.]+$/, '.txt');
    const labelSrc = path.join(labelsDir, labelFile);
    const labelDest = path.join(valLabelsDir, labelFile);

    if (fs.existsSync(imageSrc)) fs.copyFileSync(imageSrc, imageDest);
    if (fs.existsSync(labelSrc)) fs.copyFileSync(labelSrc, labelDest);
  });

  console.log(`  ✅ Train set: ${trainFiles.length} images`);
  console.log(`  ✅ Val set: ${valFiles.length} images`);

  // Step 4: Update data.yaml
  const dataYaml = `# Maintenance Issue Detection Dataset
# YOLO v11 Training Configuration

path: ${outputDir}
train: train/images
val: val/images

nc: 15  # number of classes
names: ['pipe_leak', 'water_damage', 'wall_crack', 'roof_damage', 'electrical_fault',
        'mold_damp', 'fire_damage', 'window_broken', 'door_damaged', 'floor_damage',
        'ceiling_damage', 'foundation_crack', 'hvac_issue', 'gutter_blocked', 'general_damage']

# Training parameters
batch_size: 16
epochs: 100
imgsz: 640
patience: 50
workers: 4

# Augmentation
augment: true
hsv_h: 0.015
hsv_s: 0.7
hsv_v: 0.4
degrees: 10
translate: 0.1
scale: 0.5
shear: 0.0
perspective: 0.0
flipud: 0.0
fliplr: 0.5
mosaic: 1.0
mixup: 0.0
copy_paste: 0.0
`;

  fs.writeFileSync(path.join(outputDir, 'data.yaml'), dataYaml);
  console.log('\n📄 Updated data.yaml configuration');

  // Step 5: Create requirements.txt for Python dependencies
  const requirements = `ultralytics>=8.0.0
opencv-python>=4.8.0
pillow>=10.0.0
numpy>=1.24.0
torch>=2.0.0
torchvision>=0.15.0
pyyaml>=6.0
matplotlib>=3.7.0
seaborn>=0.12.0
pandas>=2.0.0
tensorboard>=2.13.0
onnx>=1.14.0
onnxruntime>=1.15.0
`;

  fs.writeFileSync(path.join(outputDir, 'requirements.txt'), requirements);
  console.log('📋 Created requirements.txt');

  // Step 6: Create improved training script
  const trainScript = `#!/usr/bin/env python3
"""
Train YOLO v11 for Maintenance Issue Detection
Optimized for limited data with augmentation
"""

import os
import yaml
from ultralytics import YOLO
from pathlib import Path

def train_maintenance_detector():
    # Set paths
    data_path = Path('data.yaml')

    # Check if data exists
    if not data_path.exists():
        print("Error: data.yaml not found!")
        return

    # Load data config
    with open(data_path, 'r') as f:
        data_config = yaml.safe_load(f)

    print(f"Training with {data_config['nc']} classes")
    print(f"Train images: {data_config['train']}")
    print(f"Val images: {data_config['val']}")

    # Initialize model (using small model for limited data)
    model = YOLO('yolov8n.pt')  # Nano model for speed

    # Training parameters optimized for small dataset
    results = model.train(
        data=str(data_path),
        epochs=200,  # More epochs for small dataset
        imgsz=640,
        batch=8,  # Smaller batch for limited data
        patience=100,  # More patience
        save=True,
        device='0' if os.path.exists('/dev/nvidia0') else 'cpu',
        pretrained=True,
        optimizer='AdamW',
        lr0=0.001,
        lrf=0.01,  # Final learning rate
        momentum=0.937,
        weight_decay=0.0005,
        warmup_epochs=5,
        warmup_momentum=0.8,
        warmup_bias_lr=0.1,
        box=0.05,
        cls=0.5,
        cls_pw=1.0,
        obj=1.0,
        obj_pw=1.0,
        iou_t=0.20,
        anchor_t=4.0,
        fl_gamma=0.0,
        label_smoothing=0.1,
        nbs=64,
        augment=True,

        # Strong augmentation for small dataset
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=15,
        translate=0.2,
        scale=0.5,
        shear=5.0,
        perspective=0.001,
        flipud=0.1,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.2,
        copy_paste=0.1,

        # Other settings
        close_mosaic=10,
        resume=False,
        amp=True,  # Automatic mixed precision
        fraction=1.0,
        profile=False,
        freeze=None,
        multi_scale=False,
        overlap_mask=True,
        mask_ratio=4,
        dropout=0.1,
        val=True,
        save_period=-1,
        cache=True,  # Cache images
        project='maintenance_detection',
        name='yolo_maintenance_v1',
        exist_ok=True,
        verbose=True,
        seed=0,
        deterministic=True,
        single_cls=False,
        rect=False,
        cos_lr=False,
        save_json=False,
        save_hybrid=False,
        half=False,
        dnn=False,
        plots=True,
        show=False,
        save_txt=False,
        save_conf=False,
        save_crop=False,
        show_labels=True,
        show_conf=True,
        vid_stride=1,
        stream_buffer=False,
        line_width=3,
        visualize=False,
        augment_val=False,
        agnostic_nms=False,
        retina_masks=False,
        max_det=300,
    )

    # Validate the model
    print("\\nValidating model...")
    metrics = model.val()

    # Export to ONNX for deployment
    print("\\nExporting to ONNX...")
    model.export(format='onnx', opset=11, simplify=True, dynamic=False, imgsz=640)

    # Print results
    print("\\n" + "="*60)
    print("TRAINING COMPLETE!")
    print("="*60)
    print(f"mAP50: {metrics.box.map50:.3f}")
    print(f"mAP50-95: {metrics.box.map:.3f}")
    print(f"Precision: {metrics.box.mp:.3f}")
    print(f"Recall: {metrics.box.mr:.3f}")
    print("\\nModel saved to: maintenance_detection/yolo_maintenance_v1/")
    print("ONNX model: maintenance_detection/yolo_maintenance_v1/weights/best.onnx")

    return model

if __name__ == "__main__":
    model = train_maintenance_detector()
`;

  fs.writeFileSync(path.join(outputDir, 'train.py'), trainScript);
  console.log('🐍 Created optimized training script: train.py');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ DATASET PREPARATION COMPLETE!\n');
  console.log(`📁 Dataset location: ${outputDir}`);
  console.log(`📊 Total images: ${imageFiles.length}`);
  console.log(`   - Train: ${trainFiles.length} (80%)`);
  console.log(`   - Val: ${valFiles.length} (20%)`);
  console.log('\n🚀 TO START TRAINING:');
  console.log(`1. cd ${outputDir}`);
  console.log('2. pip install -r requirements.txt');
  console.log('3. python train.py');
  console.log('\n⚠️ IMPORTANT:');
  console.log(`Current dataset size (${imageFiles.length} images) is below recommended minimum.`);
  console.log('For production-quality results, you need:');
  console.log('- Minimum: 500 images per class');
  console.log('- Recommended: 1000+ images per class');
  console.log('\nConsider using the contractor contribution portal to collect more data!');
}

// Run the preparation
prepareTrainingDataset()
  .then(() => {
    console.log('\n✨ Dataset preparation complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });