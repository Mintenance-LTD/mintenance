/**
 * Upload YOLO ONNX Model to Supabase
 * 
 * This script uploads best_model_final_v2.onnx to the yolo_models table
 * so the hybrid inference system can use it.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadModel() {
  const modelPath = path.join(process.cwd(), 'best_model_final_v2.onnx');
  
  console.log('\n🔍 Checking for model file...');
  if (!fs.existsSync(modelPath)) {
    console.error(`❌ Model file not found: ${modelPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(modelPath);
  console.log(`✅ Found model: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  // Step 1: Upload to Supabase Storage
  console.log('\n📤 Uploading to Supabase Storage...');
  const modelFile = fs.readFileSync(modelPath);
  const fileName = `production/v2.0/best_model_final_v2.onnx`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('yolo-models')
    .upload(fileName, modelFile, {
      contentType: 'application/octet-stream',
      upsert: true
    });

  if (uploadError) {
    console.error('❌ Upload failed:', uploadError.message);
    process.exit(1);
  }

  console.log(`✅ Uploaded to storage: ${fileName}`);

  // Step 2: Insert/Update yolo_models table
  console.log('\n📝 Updating yolo_models table...');
  
  // Deactivate old models
  await supabase
    .from('yolo_models')
    .update({ is_active: false, status: 'inactive' })
    .eq('is_active', true);

  const { data: modelRecord, error: dbError } = await supabase
    .from('yolo_models')
    .insert({
      model_name: 'yolo11n-damage-detection',
      model_version: 'v2.0',
      model_type: 'onnx',
      storage_bucket: 'yolo-models',
      storage_path: fileName,
      file_size_bytes: stats.size,
      is_active: true,
      status: 'active',
      training_samples_count: 500, // Update with actual count
      performance_metrics: {
        mAP50: 0.85, // Update with actual metrics
        mAP50_95: 0.75,
        precision: 0.82,
        recall: 0.80,
        accuracy: 0.85
      },
      model_config: {
        input_size: 640,
        num_classes: 15, // Update with actual class count
        architecture: 'yolo11n'
      },
      created_by: 'system'
    })
    .select()
    .single();

  if (dbError) {
    console.error('❌ Database insert failed:', dbError.message);
    process.exit(1);
  }

  console.log('✅ Model record created:', modelRecord.id);

  console.log('\n🎉 SUCCESS! Hybrid inference system ready.');
  console.log('\n📋 Next steps:');
  console.log('1. Set USE_HYBRID_INFERENCE=true in your .env file');
  console.log('2. Restart your development server');
  console.log('3. Monitor logs for hybrid routing decisions');
}

uploadModel().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
