/**
 * Upload ONNX Model to Supabase Storage
 *
 * This script uploads your trained YOLO ONNX model to Supabase storage
 * so it can be used by the InternalDamageClassifier for production inference.
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

// Load environment variables
import dotenv from 'dotenv';

// Try loading from .env.local first (has real credentials), then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials!');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    process.exit(1);
}

// Initialize Supabase client with service role key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function uploadONNXModel(modelPath: string, modelVersion: string = 'v1.0.0') {
    try {
        console.log('🚀 Starting ONNX model upload to Supabase...\n');

        // Check if file exists
        const modelStats = await fs.stat(modelPath);
        const fileSizeMB = (modelStats.size / (1024 * 1024)).toFixed(2);
        console.log(`📦 Model file: ${modelPath}`);
        console.log(`📏 File size: ${fileSizeMB} MB`);

        // Read the model file
        const modelBuffer = await fs.readFile(modelPath);

        // Create bucket if it doesn't exist
        console.log('\n🪣 Checking storage bucket...');
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

        if (bucketsError) {
            console.error('❌ Error listing buckets:', bucketsError);
            throw bucketsError;
        }

        const bucketExists = buckets?.some(bucket => bucket.name === 'yolo-models');

        if (!bucketExists) {
            console.log('📝 Creating yolo-models bucket...');
            const { error: createError } = await supabase.storage.createBucket('yolo-models', {
                public: false, // Keep models private
                allowedMimeTypes: ['application/octet-stream', 'application/x-binary'],
                fileSizeLimit: 104857600 // 100MB limit
            });

            if (createError && !createError.message.includes('already exists')) {
                console.error('❌ Error creating bucket:', createError);
                throw createError;
            }
            console.log('✅ Bucket created successfully');
        } else {
            console.log('✅ Bucket already exists');
        }

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `yolo-building-damage-${modelVersion}-${timestamp}.onnx`;
        const latestFilename = `latest.onnx`; // Always keep a "latest" version

        console.log(`\n📤 Uploading model as: ${filename}`);

        // Upload the versioned model
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('yolo-models')
            .upload(filename, modelBuffer, {
                contentType: 'application/octet-stream',
                upsert: false
            });

        if (uploadError) {
            console.error('❌ Upload error:', uploadError);
            throw uploadError;
        }

        console.log('✅ Versioned model uploaded successfully');

        // Also upload/update as "latest.onnx" for easy access
        console.log(`📤 Updating latest model: ${latestFilename}`);

        const { error: latestError } = await supabase.storage
            .from('yolo-models')
            .upload(latestFilename, modelBuffer, {
                contentType: 'application/octet-stream',
                upsert: true // Overwrite if exists
            });

        if (latestError) {
            console.error('⚠️ Warning: Could not update latest.onnx:', latestError);
        } else {
            console.log('✅ Latest model updated successfully');
        }

        // Store model metadata in database
        console.log('\n💾 Storing model metadata...');

        const { error: metadataError } = await supabase
            .from('yolo_models')
            .insert({
                version: modelVersion,
                filename: filename,
                storage_path: `yolo-models/${filename}`,
                file_size: modelStats.size,
                metrics: {
                    mAP50: 0.45, // Update with your actual metrics
                    mAP50_95: 0.30,
                    precision: 0.60,
                    recall: 0.55
                },
                training_config: {
                    epochs: 60,
                    batch_size: 16,
                    image_size: 640,
                    technique: 'progressive_unfreezing'
                },
                is_active: true, // Mark as the active model
                created_at: new Date().toISOString()
            });

        if (metadataError) {
            // Table might not exist yet, that's okay
            if (metadataError.code !== '42P01') {
                console.warn('⚠️ Could not store metadata:', metadataError.message);
            }
        } else {
            console.log('✅ Metadata stored successfully');
        }

        // Get public URL (requires authentication to access)
        const { data: urlData } = supabase.storage
            .from('yolo-models')
            .getPublicUrl(filename);

        console.log('\n' + '='.repeat(60));
        console.log('🎉 SUCCESS! Model uploaded to Supabase');
        console.log('='.repeat(60));
        console.log(`\n📦 Model Details:`);
        console.log(`  Version: ${modelVersion}`);
        console.log(`  Filename: ${filename}`);
        console.log(`  Size: ${fileSizeMB} MB`);
        console.log(`  Bucket: yolo-models`);
        console.log(`  Path: yolo-models/${filename}`);

        console.log(`\n🔗 Access URLs:`);
        console.log(`  Storage Path: ${urlData.publicUrl}`);
        console.log(`  Latest Model: yolo-models/latest.onnx`);

        console.log(`\n✨ Next Steps:`);
        console.log(`  1. The InternalDamageClassifier will automatically use this model`);
        console.log(`  2. Monitor performance at /api/admin/ai-monitoring`);
        console.log(`  3. Check drift detection for model quality`);

        return {
            success: true,
            filename,
            url: urlData.publicUrl,
            size: fileSizeMB
        };

    } catch (error) {
        console.error('\n❌ Failed to upload model:', error);
        throw error;
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: npm run upload-onnx <path-to-model.onnx> [version]');
        console.log('Example: npm run upload-onnx ./best_model.onnx v1.0.0');
        process.exit(1);
    }

    const modelPath = args[0];
    const modelVersion = args[1] || 'v1.0.0';

    // Check if file exists
    try {
        await fs.access(modelPath);
    } catch {
        console.error(`❌ Model file not found: ${modelPath}`);
        process.exit(1);
    }

    // Upload the model
    try {
        await uploadONNXModel(modelPath, modelVersion);
        process.exit(0);
    } catch (error) {
        console.error('Upload failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

export { uploadONNXModel };