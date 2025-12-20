/**
 * Generate YOLO training data from available images and assessments
 * Creates labels in YOLO format for maintenance issue detection
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// YOLO class mappings for maintenance issues
const MAINTENANCE_CLASSES = {
  'pipe_leak': 0,
  'water_damage': 1,
  'wall_crack': 2,
  'roof_damage': 3,
  'electrical_fault': 4,
  'mold_damp': 5,
  'fire_damage': 6,
  'window_broken': 7,
  'door_damaged': 8,
  'floor_damage': 9,
  'ceiling_damage': 10,
  'foundation_crack': 11,
  'hvac_issue': 12,
  'gutter_blocked': 13,
  'general_damage': 14
};

// Map assessment damage types to YOLO classes
const DAMAGE_TO_CLASS: Record<string, number> = {
  'water leak': MAINTENANCE_CLASSES.pipe_leak,
  'pipe leak': MAINTENANCE_CLASSES.pipe_leak,
  'water damage': MAINTENANCE_CLASSES.water_damage,
  'structural crack': MAINTENANCE_CLASSES.wall_crack,
  'wall crack': MAINTENANCE_CLASSES.wall_crack,
  'roof damage': MAINTENANCE_CLASSES.roof_damage,
  'fire damage': MAINTENANCE_CLASSES.fire_damage,
  'mold': MAINTENANCE_CLASSES.mold_damp,
  'mold growth': MAINTENANCE_CLASSES.mold_damp,
  'electrical': MAINTENANCE_CLASSES.electrical_fault,
  'foundation': MAINTENANCE_CLASSES.foundation_crack
};

async function generateYOLOTrainingData() {
  console.log('🤖 Generating YOLO Training Data\n');
  console.log('='.repeat(60));

  // Create output directory structure
  const outputDir = path.join(__dirname, '../training_data');
  const imagesDir = path.join(outputDir, 'images');
  const labelsDir = path.join(outputDir, 'labels');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  if (!fs.existsSync(labelsDir)) fs.mkdirSync(labelsDir, { recursive: true });

  console.log(`📁 Output directory: ${outputDir}\n`);

  // Step 1: Get existing training images from storage
  const { data: trainingFiles, error: listError } = await supabase.storage
    .from('training-images')
    .list('', {
      limit: 100
    });

  if (listError) {
    console.error('Error listing training images:', listError);
    return;
  }

  console.log(`Found ${trainingFiles?.length || 0} training images in storage\n`);

  // Step 2: Process existing training images
  if (trainingFiles && trainingFiles.length > 0) {
    for (const file of trainingFiles.slice(0, 10)) { // Process first 10 for testing
      console.log(`Processing: ${file.name}`);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('training-images')
        .getPublicUrl(file.name);

      if (urlData) {
        // Generate synthetic labels based on filename patterns
        const label = generateSyntheticLabel(file.name);

        // Save label file
        const labelFilename = file.name.replace(/\.[^/.]+$/, '.txt');
        const labelPath = path.join(labelsDir, labelFilename);

        fs.writeFileSync(labelPath, label);
        console.log(`  ✅ Created label: ${labelFilename}`);
        console.log(`  📸 Image URL: ${urlData.publicUrl.substring(0, 50)}...`);
      }
    }
  }

  // Step 3: Generate synthetic training data from assessments
  console.log('\n📊 Generating synthetic labels from assessments...\n');

  const { data: assessments } = await supabase
    .from('building_assessments')
    .select('id, damage_type, severity, confidence')
    .not('damage_type', 'is', null)
    .in('damage_type', Object.keys(DAMAGE_TO_CLASS))
    .limit(50);

  if (assessments && assessments.length > 0) {
    console.log(`Processing ${assessments.length} assessments for synthetic labels\n`);

    let labelCount = 0;
    for (const assessment of assessments) {
      const classId = DAMAGE_TO_CLASS[assessment.damage_type.toLowerCase()];

      if (classId !== undefined) {
        // Generate synthetic bounding box based on damage type and severity
        const bbox = generateSyntheticBoundingBox(
          assessment.damage_type,
          assessment.severity,
          assessment.confidence
        );

        // Create YOLO format label: class_id x_center y_center width height
        const yoloLabel = `${classId} ${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`;

        // Save to labels directory
        const labelFile = `synthetic_${assessment.id.substring(0, 8)}.txt`;
        const labelPath = path.join(labelsDir, labelFile);

        fs.writeFileSync(labelPath, yoloLabel);
        labelCount++;

        if (labelCount % 10 === 0) {
          console.log(`  Generated ${labelCount} labels...`);
        }
      }
    }

    console.log(`\n✅ Generated ${labelCount} synthetic labels`);
  }

  // Step 4: Create data.yaml for YOLO training
  const dataYaml = `# Maintenance Issue Detection Dataset
# Generated for YOLO v11 training

path: ${outputDir}
train: images
val: images  # Using same for now, should split later

nc: ${Object.keys(MAINTENANCE_CLASSES).length}  # number of classes
names: [${Object.keys(MAINTENANCE_CLASSES).map(k => `'${k}'`).join(', ')}]

# Class descriptions
# 0: pipe_leak - Visible water leaking from pipes
# 1: water_damage - Water stains, dampness, water pooling
# 2: wall_crack - Cracks in walls, structural damage
# 3: roof_damage - Missing tiles, holes, roof deterioration
# 4: electrical_fault - Exposed wires, burnt outlets, electrical damage
# 5: mold_damp - Mold growth, damp patches
# 6: fire_damage - Burn marks, smoke damage, charring
# 7: window_broken - Cracked or shattered glass
# 8: door_damaged - Broken doors, damaged frames
# 9: floor_damage - Damaged flooring, holes, cracks
# 10: ceiling_damage - Ceiling cracks, water stains, holes
# 11: foundation_crack - Foundation damage, major structural cracks
# 12: hvac_issue - HVAC system damage, duct problems
# 13: gutter_blocked - Blocked or damaged gutters
# 14: general_damage - Other maintenance issues
`;

  const dataYamlPath = path.join(outputDir, 'data.yaml');
  fs.writeFileSync(dataYamlPath, dataYaml);
  console.log(`\n📄 Created data.yaml configuration`);

  // Step 5: Create training script
  const trainScript = `#!/usr/bin/env python3
"""
Train YOLO v11 model for maintenance issue detection
"""

from ultralytics import YOLO
import yaml

# Load configuration
with open('data.yaml', 'r') as f:
    data_config = yaml.safe_load(f)

# Initialize YOLO model
model = YOLO('yolov8n.pt')  # Start with nano model for speed

# Train the model
results = model.train(
    data='data.yaml',
    epochs=100,
    imgsz=640,
    batch=16,
    device='cpu',  # Change to 'cuda' if GPU available
    project='maintenance_detection',
    name='yolo_maintenance_v1',
    patience=50,
    save=True,
    pretrained=True,
    optimizer='AdamW',
    lr0=0.001,
    weight_decay=0.0005,
    warmup_epochs=3,
    augment=True,  # Enable augmentation
    cache=True,  # Cache images for faster training
)

# Validate the model
metrics = model.val()

# Export to ONNX for deployment
model.export(format='onnx', opset=11, simplify=True)

print(f"Training complete!")
print(f"mAP50: {metrics.box.map50:.3f}")
print(f"mAP50-95: {metrics.box.map:.3f}")
print(f"Model saved to: maintenance_detection/yolo_maintenance_v1/")
`;

  const trainScriptPath = path.join(outputDir, 'train_yolo.py');
  fs.writeFileSync(trainScriptPath, trainScript);
  console.log(`📝 Created training script: train_yolo.py`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TRAINING DATA SUMMARY:\n');
  console.log(`✅ Output directory: ${outputDir}`);
  console.log(`📁 Images directory: ${imagesDir}`);
  console.log(`📁 Labels directory: ${labelsDir}`);
  console.log(`📄 Configuration: ${dataYamlPath}`);
  console.log(`🐍 Training script: ${trainScriptPath}`);

  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Download actual training images to images/ directory');
  console.log('2. Ensure each image has corresponding .txt label file');
  console.log('3. Split data into train/val sets (80/20)');
  console.log('4. Run training: python train_yolo.py');
  console.log('5. Deploy trained model (.onnx) to production');

  console.log('\n⚠️ NOTE: You need more images for good results!');
  console.log('Current: ~50 synthetic labels');
  console.log('Recommended: 1000+ real labeled images');
  console.log('Use the contractor contribution portal to collect more data.');

  console.log('\n✨ YOLO training data generation complete!');
}

function generateSyntheticLabel(filename: string): string {
  // Generate synthetic YOLO label based on filename patterns
  // This is a placeholder - in reality, you'd need actual bounding boxes

  // Default to general damage class with centered box
  const classId = MAINTENANCE_CLASSES.general_damage;
  const x = 0.5; // Center x
  const y = 0.5; // Center y
  const width = 0.3 + Math.random() * 0.4; // Random width 30-70%
  const height = 0.3 + Math.random() * 0.4; // Random height 30-70%

  return `${classId} ${x.toFixed(4)} ${y.toFixed(4)} ${width.toFixed(4)} ${height.toFixed(4)}`;
}

function generateSyntheticBoundingBox(damageType: string, severity: string, confidence: number) {
  // Generate realistic bounding box based on damage characteristics

  // Base position (tend to center for most damage)
  let x = 0.5;
  let y = 0.5;
  let width = 0.3;
  let height = 0.3;

  // Adjust based on damage type
  if (damageType.includes('roof')) {
    y = 0.25; // Top of image
    width = 0.6;
    height = 0.3;
  } else if (damageType.includes('foundation') || damageType.includes('floor')) {
    y = 0.75; // Bottom of image
    width = 0.7;
    height = 0.25;
  } else if (damageType.includes('pipe') || damageType.includes('leak')) {
    // Pipes often in corners or along walls
    x = 0.3 + Math.random() * 0.4;
    width = 0.2;
    height = 0.3;
  } else if (damageType.includes('crack')) {
    // Cracks are often elongated
    width = 0.1 + Math.random() * 0.2;
    height = 0.4 + Math.random() * 0.3;
  }

  // Adjust size based on severity
  const severityMultiplier: Record<string, number> = {
    'minimal': 0.7,
    'minor': 0.8,
    'midway': 1.0,
    'moderate': 1.1,
    'major': 1.3,
    'severe': 1.5,
    'critical': 1.7
  };

  const multiplier = severityMultiplier[severity] || 1.0;
  width *= multiplier;
  height *= multiplier;

  // Add some randomness based on confidence
  const noise = (1 - confidence / 100) * 0.1;
  x += (Math.random() - 0.5) * noise;
  y += (Math.random() - 0.5) * noise;

  // Ensure bounds are valid
  x = Math.max(0.1, Math.min(0.9, x));
  y = Math.max(0.1, Math.min(0.9, y));
  width = Math.min(width, Math.min(2 * x, 2 * (1 - x)));
  height = Math.min(height, Math.min(2 * y, 2 * (1 - y)));

  return {
    x: x.toFixed(4),
    y: y.toFixed(4),
    width: width.toFixed(4),
    height: height.toFixed(4)
  };
}

// Run the generator
generateYOLOTrainingData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });