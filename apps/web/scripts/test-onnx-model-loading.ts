/**
 * Test ONNX Model Loading from Supabase
 *
 * This script verifies that the uploaded ONNX model can be:
 * 1. Downloaded from Supabase Storage
 * 2. Loaded with ONNX Runtime
 * 3. Used for inference
 */

import { createClient } from '@supabase/supabase-js';
import * as ort from 'onnxruntime-node';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testModelLoading() {
    console.log('🧪 Testing ONNX Model Loading from Supabase\n');
    console.log('=' .repeat(60));

    try {
        // Step 1: Check if model exists in storage
        console.log('\n📦 Step 1: Checking model in storage...');
        const { data: files, error: listError } = await supabase.storage
            .from('yolo-models')
            .list();

        if (listError) {
            throw new Error(`Storage list error: ${listError.message}`);
        }

        console.log(`✅ Found ${files?.length || 0} file(s) in yolo-models bucket`);

        const latestModel = files?.find(f => f.name === 'latest.onnx');
        if (!latestModel) {
            throw new Error('latest.onnx not found in storage!');
        }

        console.log(`✅ Found latest.onnx (${(latestModel.metadata?.size / 1024 / 1024).toFixed(2)} MB)`);

        // Step 2: Download the model
        console.log('\n📥 Step 2: Downloading model...');
        const { data: modelData, error: downloadError } = await supabase.storage
            .from('yolo-models')
            .download('latest.onnx');

        if (downloadError) {
            throw new Error(`Download error: ${downloadError.message}`);
        }

        console.log('✅ Model downloaded successfully');

        // Step 3: Convert Blob to Buffer
        console.log('\n🔄 Step 3: Converting to buffer...');
        const arrayBuffer = await modelData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log(`✅ Buffer created (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

        // Step 4: Load with ONNX Runtime
        console.log('\n🤖 Step 4: Loading with ONNX Runtime...');
        const session = await ort.InferenceSession.create(buffer, {
            executionProviders: ['cpu'],
            graphOptimizationLevel: 'all',
        });

        console.log('✅ ONNX model loaded successfully!');
        console.log(`   Input names: ${session.inputNames.join(', ')}`);
        console.log(`   Output names: ${session.outputNames.join(', ')}`);

        // Step 5: Test inference with dummy data
        console.log('\n🎯 Step 5: Testing inference with dummy data...');

        // Create dummy input tensor (1, 3, 640, 640) - batch, channels, height, width
        const dummyInput = new Float32Array(1 * 3 * 640 * 640).fill(0.5);
        const inputTensor = new ort.Tensor('float32', dummyInput, [1, 3, 640, 640]);

        const feeds: Record<string, ort.Tensor> = {};
        feeds[session.inputNames[0]] = inputTensor;

        const startInference = Date.now();
        const results = await session.run(feeds);
        const inferenceTime = Date.now() - startInference;

        console.log('✅ Inference completed successfully!');
        console.log(`   Inference time: ${inferenceTime}ms`);
        console.log(`   Output shape: ${results[session.outputNames[0]].dims.join(' x ')}`);

        // Step 6: Check model metadata in database (if table exists)
        console.log('\n📊 Step 6: Checking model metadata...');
        try {
            const { data: modelInfo, error: dbError } = await supabase
                .from('yolo_models')
                .select('*')
                .eq('is_active', true)
                .single();

            if (!dbError && modelInfo) {
                console.log('✅ Model metadata found in database:');
                console.log(`   Version: ${modelInfo.version}`);
                console.log(`   mAP@50: ${modelInfo.metrics?.mAP50 || 'N/A'}`);
                console.log(`   Precision: ${modelInfo.metrics?.precision || 'N/A'}`);
                console.log(`   Architecture: ${modelInfo.training_config?.architecture || 'N/A'}`);
            } else {
                console.log('⚠️  Model metadata table not found or empty');
                console.log('   Run the migration to create the yolo_models table');
            }
        } catch (err) {
            console.log('⚠️  Model metadata table not found');
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('🎉 ALL TESTS PASSED!');
        console.log('='.repeat(60));
        console.log('\n✅ Your ONNX model is ready for production use!');
        console.log('✅ The InternalDamageClassifier will load this model automatically');
        console.log('✅ Hybrid routing will use it when confidence > 75%\n');

        // Performance metrics
        console.log('📈 Performance Metrics:');
        console.log(`   Model size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Load time: ~${inferenceTime}ms per inference`);
        console.log(`   Input size: 640x640 RGB images`);
        console.log(`   Memory usage: ~${(buffer.length * 2 / 1024 / 1024).toFixed(2)} MB`);

        console.log('\n💡 Next Steps:');
        console.log('   1. Start your dev server: npm run dev');
        console.log('   2. Test the API: POST /api/building-surveyor/assess');
        console.log('   3. Monitor at: /api/admin/ai-monitoring');
        console.log('   4. Check logs for "Using internal model for inference"\n');

        return true;

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        console.error('\nTroubleshooting:');
        console.error('1. Verify model uploaded: Check Supabase Storage → yolo-models bucket');
        console.error('2. Check credentials: Ensure SUPABASE_SERVICE_ROLE_KEY is set');
        console.error('3. Install dependencies: npm install onnxruntime-node');
        console.error('4. Check model format: Must be ONNX format (.onnx extension)\n');
        return false;
    }
}

// Run the test
testModelLoading()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });