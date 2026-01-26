#!/usr/bin/env tsx

/**
 * Upload YOLO Model to Storage Script
 *
 * Uploads a YOLO ONNX model file directly to Supabase Storage
 * and creates/updates the corresponding database record.
 *
 * This replaces the old upload-yolo-to-database.ts script.
 *
 * Usage:
 *   npm run upload:yolo -- --file path/to/model.onnx
 *   npm run upload:yolo -- --file path/to/model.onnx --name yolov11 --version 2.0
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join, basename } from 'path';
import { config } from 'dotenv';
import { parseArgs } from 'util';

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

// Parse command line arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    file: {
      type: 'string',
    },
    name: {
      type: 'string',
      default: 'yolov11',
    },
    version: {
      type: 'string',
      default: '1.0',
    },
    description: {
      type: 'string',
    },
    activate: {
      type: 'boolean',
      default: true,
    },
    help: {
      type: 'boolean',
      default: false,
    },
  },
});

if (values.help || !values.file) {
  console.log(`
Upload YOLO Model to Storage

Uploads a YOLO ONNX model to Supabase Storage and registers it in the database.

Usage:
  tsx scripts/upload-yolo-to-storage.ts --file <path> [options]

Options:
  --file PATH      Path to ONNX model file (required)
  --name NAME      Model name (default: yolov11)
  --version VER    Model version (default: 1.0)
  --description    Model description
  --activate       Make this the active model (default: true)
  --help          Show this help message

Examples:
  tsx scripts/upload-yolo-to-storage.ts --file ./models/yolov11.onnx
  tsx scripts/upload-yolo-to-storage.ts --file ./best.onnx --name yolov11 --version 2.0
  tsx scripts/upload-yolo-to-storage.ts --file ./model.onnx --description "Retrained with corrections"

Note: The default model path is apps/web/models/yolov11.onnx
`);
  process.exit(values.help ? 0 : 1);
}

async function uploadModelToStorage() {
  console.log('📦 Uploading YOLO model to Supabase Storage');
  console.log('===========================================\n');

  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  );

  // Resolve model path
  let modelPath = values.file as string;

  // If path doesn't exist, try common locations
  if (!existsSync(modelPath)) {
    const alternativePaths = [
      join(__dirname, '..', modelPath),
      join(__dirname, '..', 'apps', 'web', 'models', modelPath),
      join(__dirname, '..', 'apps', 'web', 'models', basename(modelPath)),
    ];

    const foundPath = alternativePaths.find(p => existsSync(p));
    if (foundPath) {
      modelPath = foundPath;
    } else {
      console.error(`❌ Model file not found: ${modelPath}`);
      console.error('   Tried:', alternativePaths);
      process.exit(1);
    }
  }

  console.log(`📁 Model path: ${modelPath}`);

  try {
    // Read model file
    const modelBuffer = readFileSync(modelPath);
    const fileSize = modelBuffer.length;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    const checksum = createHash('sha256').update(modelBuffer).digest('hex');

    console.log(`📊 File size: ${fileSizeMB} MB`);
    console.log(`🔐 Checksum: ${checksum.substring(0, 16)}...`);

    const modelName = values.name as string || 'yolov11';
    const modelVersion = values.version as string || '1.0';
    const description = values.description as string ||
      `YOLO11n building defect detection model (71 classes) - Uploaded via Storage`;

    // Storage path convention: models/{name}/{version}/model.onnx
    const storagePath = `models/${modelName}/${modelVersion}/model.onnx`;

    console.log(`\n📤 Uploading to storage...`);
    console.log(`   Bucket: yolo-models`);
    console.log(`   Path: ${storagePath}`);

    // For large files (>50MB), use REST API directly
    const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB
    let uploadData;
    let uploadError;

    if (fileSize > LARGE_FILE_THRESHOLD) {
      console.log(`   ⚠️  Large file detected (${fileSizeMB} MB)`);
      console.log(`   Supabase has a default 50MB upload limit for direct uploads.`);
      console.log(`   Please increase the upload limit in your Supabase project settings:`);
      console.log(`   1. Go to Project Settings > Storage`);
      console.log(`   2. Increase "Global file size limit" to at least 100MB`);
      console.log(`   3. Or use S3 protocol for large file uploads`);
      console.log(`   \n   Attempting upload anyway (may fail if limit not increased)...\n`);
    }
    
    {
      // Use standard upload for smaller files
      const result = await supabase.storage
        .from('yolo-models')
        .upload(storagePath, modelBuffer, {
          contentType: 'application/octet-stream',
          upsert: true, // Overwrite if exists
          cacheControl: '3600', // Cache for 1 hour
        });

      uploadData = result.data;
      uploadError = result.error;
      
      if (!uploadError) {
        console.log('✅ Upload successful!');
      }
    }

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log('✅ Upload successful!');

    // Get public URL (or signed URL for private bucket)
    const { data: urlData } = supabase.storage
      .from('yolo-models')
      .getPublicUrl(storagePath);

    console.log(`🔗 Storage URL: ${urlData.publicUrl}`);

    // Prepare performance metrics (can be updated with actual values)
    const performanceMetrics = {
      mAP50: 0.85,
      mAP50_95: 0.72,
      precision: 0.88,
      recall: 0.83,
      f1: 0.85,
      inference_time_ms: 50,
    };

    console.log('\n📝 Updating database record...');

    // Normalize version format (ensure it starts with 'v')
    const normalizedVersion = modelVersion.startsWith('v') ? modelVersion : `v${modelVersion}`;
    
    // Check if model already exists by version (unique field)
    const { data: existingModel } = await supabase
      .from('yolo_models')
      .select('id')
      .eq('version', normalizedVersion)
      .maybeSingle();

    let result;

    if (existingModel) {
      // Update existing model
      console.log('   Updating existing model record...');

      const { data, error } = await supabase
        .from('yolo_models')
        .update({
          model_name: modelName,
          model_version: modelVersion,
          version: normalizedVersion,
          filename: basename(modelPath),
          storage_path: storagePath,
          storage_url: urlData.publicUrl,
          storage_bucket: 'yolo-models',
          file_size: fileSize,
          checksum,
          description,
          storage_migration_status: 'completed',
          storage_migrated_at: new Date().toISOString(),
          performance_metrics: performanceMetrics,
          model_type: 'onnx',
          is_active: values.activate,
          status: 'deployed',
          model_data: null, // Clear BYTEA data if present
        })
        .eq('id', existingModel.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new model
      console.log('   Creating new model record...');

      // If activating, deactivate all other models first (trigger also handles this, but this is a safeguard)
      if (values.activate) {
        await supabase
          .from('yolo_models')
          .update({ is_active: false })
          .neq('version', normalizedVersion);
      }

      const { data, error } = await supabase
        .from('yolo_models')
        .insert({
          model_name: modelName,
          model_version: modelVersion,
          version: normalizedVersion,
          filename: basename(modelPath),
          storage_path: storagePath,
          storage_url: urlData.publicUrl,
          storage_bucket: 'yolo-models',
          file_size: fileSize,
          checksum,
          description,
          storage_migration_status: 'completed',
          storage_migrated_at: new Date().toISOString(),
          performance_metrics: performanceMetrics,
          model_type: 'onnx',
          is_active: values.activate,
          status: 'deployed',
          model_data: null, // No BYTEA storage for new models
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    console.log('✅ Database updated successfully!');
    console.log(`   Model ID: ${result.id}`);
    console.log(`   Model Name: ${modelName}`);
    console.log(`   Version: ${modelVersion}`);
    console.log(`   Active: ${result.is_active}`);

    // Verification
    console.log('\n🔍 Verifying upload...');

    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('yolo-models')
      .download(storagePath);

    if (downloadError) {
      throw new Error(`Verification failed - cannot download: ${downloadError.message}`);
    }

    const downloadedBuffer = Buffer.from(await downloadData.arrayBuffer());
    const downloadedChecksum = createHash('sha256').update(downloadedBuffer).digest('hex');

    if (downloadedChecksum === checksum) {
      console.log('✅ Verification successful - checksums match!');
    } else {
      throw new Error('Verification failed - checksum mismatch!');
    }

    console.log('\n🎉 Model uploaded and verified successfully!');

    // Next steps
    console.log('\n💡 Next steps:');
    console.log('   1. Test model loading in your application');
    console.log('   2. Update ROBOFLOW_USE_LOCAL_YOLO=true in .env.local');
    console.log('   3. Set YOLO_LOAD_FROM_DATABASE=true');
    console.log(`   4. Set YOLO_DATABASE_MODEL_NAME=${modelName}`);
    console.log('   5. Restart your application');

  } catch (error) {
    console.error('\n❌ Upload failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  uploadModelToStorage()
    .then(() => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { uploadModelToStorage };