#!/usr/bin/env tsx
/**
 * Create GCP Cloud Storage Buckets for ML Training
 * 
 * Creates the required buckets for training data and model artifacts
 * Uses @google-cloud/storage client library with retry logic
 * 
 * Required GCP Permissions:
 * - storage.buckets.create
 * - storage.buckets.get
 * - storage.buckets.update
 * - storage.buckets.setIamPolicy
 * 
 * See docs/GCP_BUCKET_SETUP.md for detailed permission requirements
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Storage } from '@google-cloud/storage';
import { gcpConfig } from '../apps/web/lib/config/gcp.config';
import { GCPAuthService } from '../apps/web/lib/services/gcp/GCPAuthService';

// Load environment variables
config({ path: resolve(__dirname, '../apps/web/.env.local') });

interface BucketConfig {
  name: string;
  description: string;
  lifecycleDays?: number;
  versioning?: boolean;
  location?: string;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

const buckets: BucketConfig[] = [
  {
    name: gcpConfig.storage.trainingDataBucket,
    description: 'Training datasets and JSONL files',
    lifecycleDays: 365, // Auto-delete after 1 year
    versioning: false, // Training data doesn't need versioning
  },
  {
    name: gcpConfig.storage.modelArtifactsBucket,
    description: 'Model artifacts, checkpoints, and trained models',
    lifecycleDays: 730, // Auto-delete after 2 years
    versioning: true, // Model artifacts should be versioned
  },
];

/**
 * Check if an error is retryable (transient GCP API error)
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;

  const code = error.code || error.status || error.statusCode;
  const message = String(error.message || error).toLowerCase();

  // Retry on these HTTP status codes
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  if (retryableStatusCodes.includes(code)) {
    return true;
  }

  // Retry on these error messages
  const retryableMessages = [
    'timeout',
    'network',
    'connection',
    'econnreset',
    'etimedout',
    'rate limit',
    'quota exceeded',
    'service unavailable',
    'internal error',
    'deadline exceeded',
  ];

  return retryableMessages.some((msg) => message.includes(msg));
}

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context: string = 'operation'
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retryable or last attempt
      if (!isRetryableError(error) || attempt >= config.maxAttempts) {
        if (attempt > 1) {
          console.log(`   ⚠️  Failed after ${attempt} attempts`);
        }
        throw error;
      }

      // Calculate delay with exponential backoff
      const delayMs = Math.min(
        config.baseDelayMs * Math.pow(2, attempt - 1),
        config.maxDelayMs
      );

      console.log(
        `   ⚠️  Retrying ${context} (attempt ${attempt + 1}/${config.maxAttempts}) after ${delayMs}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Create a GCP Cloud Storage bucket with all configurations
 */
async function createBucket(
  bucket: BucketConfig,
  storage: Storage
): Promise<boolean> {
  const projectId = gcpConfig.projectId;
  const region = bucket.location || gcpConfig.region;

  if (!projectId) {
    console.error('❌ GOOGLE_CLOUD_PROJECT_ID is not set');
    return false;
  }

  try {
    console.log(`\n📦 Creating bucket: ${bucket.name}...`);

    // Check if bucket already exists
    const [exists] = await withRetry(
      async () => {
        const bucketHandle = storage.bucket(bucket.name);
        return await bucketHandle.exists();
      },
      DEFAULT_RETRY_CONFIG,
      'bucket existence check'
    );

    if (exists) {
      console.log(`   ⚠️  Bucket ${bucket.name} already exists, updating configuration...`);
      
      // Update existing bucket configuration
      await updateBucketConfiguration(bucket, storage);
      return true;
    }

    // Create bucket with retry logic
    await withRetry(
      async () => {
        await storage.createBucket(bucket.name, {
          location: region,
          projectId: projectId,
          metadata: {
            labels: {
              description: bucket.description,
              createdBy: 'mintenance-bucket-setup-script',
            },
          },
        });
      },
      DEFAULT_RETRY_CONFIG,
      'bucket creation'
    );

    console.log(`   ✅ Created bucket: ${bucket.name}`);

    // Configure bucket settings
    await updateBucketConfiguration(bucket, storage);

    return true;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error(`   ❌ Failed to create bucket: ${errorMessage}`);
    
    // Provide helpful error messages
    if (errorMessage.includes('permission') || errorMessage.includes('403')) {
      console.error(`   💡 Check that you have 'storage.buckets.create' permission`);
    } else if (errorMessage.includes('already exists')) {
      console.log(`   ℹ️  Bucket already exists (this is OK)`);
      return true;
    }
    
    return false;
  }
}

/**
 * Update bucket configuration (versioning, lifecycle, IAM)
 */
async function updateBucketConfiguration(
  bucket: BucketConfig,
  storage: Storage
): Promise<void> {
  const bucketHandle = storage.bucket(bucket.name);

  try {
    // Set versioning if specified
    if (bucket.versioning !== undefined) {
      await withRetry(
        async () => {
          await bucketHandle.setMetadata({
            versioning: {
              enabled: bucket.versioning,
            },
          });
        },
        DEFAULT_RETRY_CONFIG,
        'versioning configuration'
      );
      console.log(
        `   ✅ Set versioning: ${bucket.versioning ? 'enabled' : 'disabled'}`
      );
    }

    // Make bucket private (remove public access)
    await withRetry(
      async () => {
        await bucketHandle.iam.setPolicy({
          bindings: [
            {
              role: 'roles/storage.objectViewer',
              members: [], // No public access
            },
          ],
        });
      },
      DEFAULT_RETRY_CONFIG,
      'IAM policy update'
    );
    console.log(`   ✅ Set bucket to private`);

    // Set lifecycle policy if specified
    if (bucket.lifecycleDays) {
      await withRetry(
        async () => {
          await bucketHandle.setMetadata({
            lifecycle: {
              rule: [
                {
                  action: { type: 'Delete' },
                  condition: { age: bucket.lifecycleDays },
                },
              ],
            },
          });
        },
        DEFAULT_RETRY_CONFIG,
        'lifecycle policy'
      );
      console.log(
        `   ✅ Set lifecycle policy (auto-delete after ${bucket.lifecycleDays} days)`
      );
    }
  } catch (error: any) {
    console.log(`   ⚠️  Some bucket configurations failed: ${error.message}`);
    // Don't fail the whole operation if optional configs fail
  }
}

/**
 * Verify buckets exist and display their configuration
 */
async function verifyBuckets(storage: Storage): Promise<void> {
  console.log('\n🔍 Verifying buckets...\n');

  try {
    const [bucketList] = await withRetry(
      async () => {
        return await storage.getBuckets();
      },
      DEFAULT_RETRY_CONFIG,
      'bucket listing'
    );

    const bucketNames = bucketList.map((b) => b.name);

    console.log('Found buckets:');
    for (const bucketName of bucketNames) {
      const isRequired = buckets.some((b) => b.name === bucketName);
      const marker = isRequired ? '✅' : '  ';
      console.log(`   ${marker} ${bucketName}${isRequired ? ' (required)' : ''}`);

      // Show configuration for required buckets
      if (isRequired) {
        try {
          const bucketHandle = storage.bucket(bucketName);
          const [metadata] = await bucketHandle.getMetadata();
          
          const versioning = metadata.versioning?.enabled ? 'enabled' : 'disabled';
          const lifecycle = metadata.lifecycle?.rule?.length > 0 
            ? `${metadata.lifecycle.rule[0].condition.age} days` 
            : 'none';
          
          console.log(`      Versioning: ${versioning}`);
          console.log(`      Lifecycle: ${lifecycle}`);
        } catch (error) {
          // Ignore metadata fetch errors
        }
      }
    }

    // Check if all required buckets exist
    const missingBuckets = buckets.filter(
      (b) => !bucketNames.includes(b.name)
    );

    if (missingBuckets.length > 0) {
      console.log('\n⚠️  Missing buckets:');
      missingBuckets.forEach((bucket) => {
        console.log(`   - ${bucket.name}`);
      });
    } else {
      console.log('\n✅ All required buckets exist!');
    }
  } catch (error: any) {
    console.error('❌ Failed to verify buckets:', error.message);
  }
}

async function main() {
  console.log('🚀 GCP Cloud Storage Bucket Setup\n');
  console.log('='.repeat(50));
  console.log(`Project: ${gcpConfig.projectId || 'NOT SET'}`);
  console.log(`Region: ${gcpConfig.region}`);
  console.log('='.repeat(50));

  // Validate config
  const configValidation = gcpConfig.validate();
  if (!configValidation.valid) {
    console.error('\n❌ Configuration errors:');
    configValidation.errors.forEach((error) => console.error(`   - ${error}`));
    process.exit(1);
  }

  // Initialize Storage client
  let storage: Storage;
  try {
    console.log('\n🔐 Initializing GCP Storage client...');
    await GCPAuthService.initialize();
    storage = await GCPAuthService.getStorageClient();
    console.log('   ✅ Storage client initialized');
  } catch (error: any) {
    console.error('❌ Failed to initialize Storage client:', error.message);
    console.error('\n💡 Make sure you have:');
    console.error('   1. Run: gcloud auth application-default login');
    console.error('   2. Set GOOGLE_CLOUD_PROJECT_ID in .env.local');
    console.error('   3. Enabled Cloud Storage API');
    process.exit(1);
  }

  // Create buckets
  console.log('\n📦 Creating buckets...\n');
  const results = await Promise.all(
    buckets.map((bucket) => createBucket(bucket, storage))
  );

  // Verify
  await verifyBuckets(storage);

  // Summary
  console.log('\n' + '='.repeat(50));
  const allCreated = results.every((r) => r === true);

  if (allCreated) {
    console.log('🎉 Bucket setup complete!');
    console.log('\n✅ You can now upload training data to:');
    buckets.forEach((bucket) => {
      console.log(`   - gs://${bucket.name}`);
      if (bucket.versioning) {
        console.log(`     (versioning enabled)`);
      }
    });
  } else {
    console.log('⚠️  Some buckets failed to create. Check errors above.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
