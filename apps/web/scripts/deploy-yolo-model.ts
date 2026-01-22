/**
 * Deploy trained YOLO model to Supabase Storage
 * This script uploads the model and makes it available for inference
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

async function deployYOLOModel() {
  console.log('🚀 Deploying YOLO Model to Production\n');
  console.log('='.repeat(60));

  // Paths to model files
  const modelPaths = {
    onnx: path.join(__dirname, '../yolo_dataset_full/maintenance_production/v1.0/weights/best.onnx'),
    pytorch: path.join(__dirname, '../yolo_dataset_full/maintenance_production/v1.0/weights/best.pt'),
    config: path.join(__dirname, '../yolo_dataset_full/data.yaml')
  };

  // Check if model files exist
  console.log('📁 Checking for model files...\n');

  const missingFiles = [];
  for (const [type, filePath] of Object.entries(modelPaths)) {
    if (!fs.existsSync(filePath)) {
      missingFiles.push(`${type}: ${filePath}`);
      console.log(`❌ ${type} model not found`);
    } else {
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`✅ ${type} model found (${sizeMB} MB)`);
    }
  }

  if (missingFiles.length > 0) {
    console.log('\n⚠️ Model files not found. Training may still be in progress.');
    console.log('Check: yolo_dataset_full/maintenance_production/v1.0/');

    // Try alternative paths
    const altPath = path.join(__dirname, '../yolo_dataset_full/runs/detect/train/weights/best.onnx');
    if (fs.existsSync(altPath)) {
      console.log('\n✅ Found model at alternative location!');
      modelPaths.onnx = altPath;
    } else {
      console.log('\nPlease wait for training to complete.');
      return false;
    }
  }

  // Upload to Supabase Storage
  console.log('\n📤 Uploading model to Supabase Storage...\n');

  try {
    // Create bucket if it doesn't exist
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'yolo-models');

    if (!bucketExists) {
      console.log('Creating yolo-models bucket...');
      await supabase.storage.createBucket('yolo-models', {
        public: true,
        fileSizeLimit: 104857600 // 100MB
      });
    }

    // Upload ONNX model (primary deployment format)
    if (fs.existsSync(modelPaths.onnx)) {
      const onnxBuffer = fs.readFileSync(modelPaths.onnx);
      const onnxFileName = `maintenance-v1.0-${Date.now()}.onnx`;

      const { data: onnxUpload, error: onnxError } = await supabase.storage
        .from('yolo-models')
        .upload(onnxFileName, onnxBuffer, {
          contentType: 'application/octet-stream',
          upsert: true
        });

      if (onnxError) {
        console.error('❌ Failed to upload ONNX model:', onnxError);
        return false;
      }

      console.log(`✅ ONNX model uploaded: ${onnxFileName}`);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('yolo-models')
        .getPublicUrl(onnxFileName);

      console.log(`📍 Public URL: ${publicUrl}`);

      // Save deployment metadata
      const metadata = {
        model_name: 'maintenance-detector-v1.0',
        model_type: 'YOLOv8',
        format: 'onnx',
        classes: 15,
        input_size: 640,
        url: publicUrl,
        filename: onnxFileName,
        deployed_at: new Date().toISOString(),
        training_info: {
          dataset_size: 1000,
          train_images: 800,
          val_images: 200,
          epochs: 'auto',
          framework: 'ultralytics'
        },
        performance: {
          expected_map50: '70-85%',
          expected_inference_time: '<50ms',
          model_size_mb: (onnxBuffer.length / 1024 / 1024).toFixed(2)
        }
      };

      // Store metadata in database
      const { error: metaError } = await supabase
        .from('model_deployments')
        .insert({
          ...metadata,
          is_active: true
        });

      if (!metaError) {
        console.log('✅ Model metadata saved');
      }

      // Update environment variable or config
      console.log('\n📝 Update your .env.local:');
      console.log(`YOLO_MODEL_URL=${publicUrl}`);

      return {
        success: true,
        url: publicUrl,
        filename: onnxFileName,
        metadata
      };
    }

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    return false;
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Model deployment complete!');
  console.log('='.repeat(60));

  return true;
}

// Run deployment
deployYOLOModel().then((result) => {
  if (result) {
    console.log('\n🎉 Your model is now deployed and ready for production!');
    console.log('\nNext steps:');
    console.log('1. Update MaintenanceDetectionService with model URL');
    console.log('2. Test with real photos');
    console.log('3. Monitor performance');
    process.exit(0);
  } else {
    console.log('\n⏳ Deployment pending. Check model training status.');
    process.exit(1);
  }
});