/**
 * Upload ONNX model to Supabase Storage
 *
 * This script uploads the converted YOLO ONNX model to the yolo-models bucket
 * and outputs the public URL for use in environment variables.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, 'apps', 'web', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MODEL_PATH = './best_model_final_v2.onnx';
const BUCKET_NAME = 'yolo-models';
const FILE_NAME = `maintenance-yolo-v2-${Date.now()}.onnx`;

async function uploadModelToSupabase() {
  console.log('=== UPLOADING YOLO MODEL TO SUPABASE ===\n');

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials');
    console.error('Required:');
    console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Check if model file exists
  if (!fs.existsSync(MODEL_PATH)) {
    console.error(`❌ Model file not found: ${MODEL_PATH}`);
    console.error('Run convert-pt-to-onnx.py first');
    process.exit(1);
  }

  const fileSizeMB = fs.statSync(MODEL_PATH).size / (1024 * 1024);
  console.log(`✅ Model file found: ${MODEL_PATH}`);
  console.log(`✅ File size: ${fileSizeMB.toFixed(2)} MB\n`);

  try {
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔄 Connecting to Supabase...');
    console.log(`   URL: ${SUPABASE_URL}`);
    console.log(`   Bucket: ${BUCKET_NAME}\n`);

    // Read the model file
    console.log('📂 Reading model file...');
    const fileBuffer = fs.readFileSync(MODEL_PATH);
    console.log(`✅ File read: ${fileBuffer.length} bytes\n`);

    // Upload to Supabase Storage
    console.log(`🔄 Uploading to bucket: ${BUCKET_NAME}/${FILE_NAME}...`);
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(FILE_NAME, fileBuffer, {
        contentType: 'application/octet-stream',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Upload failed:', error.message);
      console.error('Details:', error);
      process.exit(1);
    }

    console.log('✅ Upload successful!\n');

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(FILE_NAME);

    console.log('=== UPLOAD COMPLETE ===');
    console.log(`✅ Model uploaded: ${FILE_NAME}`);
    console.log(`✅ Size: ${fileSizeMB.toFixed(2)} MB`);
    console.log(`✅ Public URL: ${publicUrl}\n`);

    console.log('=== NEXT STEPS ===');
    console.log('1. Update apps/web/.env.local:');
    console.log(`   NEXT_PUBLIC_YOLO_MODEL_URL=${publicUrl}`);
    console.log('   # Remove or comment out: USE_LOCAL_YOLO=true');
    console.log('   # Remove or comment out: YOLO_MODEL_PATH=./best_model_final_v2.pt\n');
    console.log('2. Restart Next.js dev server:');
    console.log('   cd apps/web && npm run dev\n');
    console.log('3. Test by uploading a building damage image\n');

    console.log('=== ENVIRONMENT VARIABLE TO ADD ===');
    console.log(`NEXT_PUBLIC_YOLO_MODEL_URL=${publicUrl}`);

  } catch (error) {
    console.error('❌ Error during upload:', error);
    process.exit(1);
  }
}

uploadModelToSupabase();
