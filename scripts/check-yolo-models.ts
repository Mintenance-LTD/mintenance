import { serverSupabase } from '../apps/web/lib/api/supabaseServer';

async function checkYOLOModels() {
  console.log('🔍 Checking for YOLO models in database...\n');

  // Check if yolo_models table exists
  const { data: models, error: modelsError } = await serverSupabase
    .from('yolo_models')
    .select('id, model_name, version, format, is_active, storage_path, created_at')
    .order('created_at', { ascending: false });

  if (modelsError) {
    console.error('❌ Error querying yolo_models table:', modelsError.message);
    console.log('\n💡 This might mean the yolo_models table does not exist yet.');
    console.log('Check if migration 20251217000003_create_yolo_models_metadata_table.sql has been applied.\n');
    return;
  }

  if (!models || models.length === 0) {
    console.log('❌ No YOLO models found in database\n');
    console.log('You have two options:\n');
    console.log('Option 1: Enable mock mode for testing');
    console.log('  Add to .env.local: ENABLE_MOCK_AI=true\n');
    console.log('Option 2: Deploy the YOLO model');
    console.log('  File: best_model_final_v2.onnx');
    console.log('  Upload to Supabase Storage "yolo-models" bucket');
    console.log('  Create record in yolo_models table\n');
    return;
  }

  console.log(`✅ Found ${models.length} YOLO model(s):\n`);
  models.forEach((model, idx) => {
    console.log(`Model ${idx + 1}:`);
    console.log(`  Name: ${model.model_name}`);
    console.log(`  Version: ${model.version}`);
    console.log(`  Format: ${model.format}`);
    console.log(`  Active: ${model.is_active ? '✅' : '❌'}`);
    console.log(`  Storage: ${model.storage_path || 'N/A'}`);
    console.log(`  Created: ${new Date(model.created_at).toLocaleString()}`);
    console.log('');
  });

  const activeModels = models.filter(m => m.is_active);
  if (activeModels.length === 0) {
    console.log('⚠️  Warning: No active models found. Set is_active=true for at least one model.\n');
  } else {
    console.log(`✅ ${activeModels.length} active model(s) ready for hybrid inference\n`);
  }
}

checkYOLOModels()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
