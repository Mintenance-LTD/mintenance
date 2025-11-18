#!/usr/bin/env ts-node
/**
 * Upload YOLO Model to Database
 * 
 * This script uploads the ONNX model file to PostgreSQL as BYTEA.
 * 
 * Usage:
 *   ts-node scripts/upload-yolo-to-database.ts
 * 
 * Prerequisites:
 *   - Model file exists at: apps/web/models/yolov11.onnx
 *   - Supabase connection configured in environment
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { serverSupabase } from '../apps/web/lib/api/supabaseServer';

async function uploadModelToDatabase() {
  const modelPath = join(__dirname, '..', 'apps', 'web', 'models', 'yolov11.onnx');
  
  console.log('📦 Uploading YOLO model to database...');
  console.log(`   Model path: ${modelPath}`);

  try {
    // Read model file
    const modelBuffer = readFileSync(modelPath);
    const fileSize = modelBuffer.length;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

    console.log(`   File size: ${fileSizeMB} MB`);

    if (fileSize > 50 * 1024 * 1024) {
      console.warn('⚠️  WARNING: Model file is large (>50MB). Database storage is not recommended.');
      console.warn('   Consider using Supabase Storage instead.');
    }

    // Upload to database
    const { data, error } = await serverSupabase
      .from('yolo_models')
      .upsert({
        model_name: 'yolov11',
        model_version: '1.0',
        model_data: modelBuffer,
        file_size: fileSize,
        description: 'YOLO11n building defect detection model (71 classes)',
      }, {
        onConflict: 'model_name',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Upload failed:', error);
      process.exit(1);
    }

    console.log('✅ Model uploaded successfully!');
    console.log(`   Model ID: ${data.id}`);
    console.log(`   Model Name: ${data.model_name}`);
    console.log(`   Version: ${data.model_version}`);
    console.log(`   Size: ${fileSizeMB} MB`);
    console.log(`   Created: ${data.created_at}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  uploadModelToDatabase()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

export { uploadModelToDatabase };

