/**
 * Check and create storage buckets for job attachments
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', 'apps', 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndCreateBuckets() {
  console.log('🔍 Checking storage buckets...\n');

  // List existing buckets
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('❌ Error listing buckets:', listError);
    return;
  }

  console.log('📦 Existing buckets:');
  buckets?.forEach(bucket => {
    console.log(`  - ${bucket.name} (public: ${bucket.public})`);
  });

  // Check for job-attachments bucket
  const jobAttachmentsBucket = buckets?.find(b => b.name === 'job-attachments');
  const jobStorageBucket = buckets?.find(b => b.name === 'Job-storage');

  if (!jobAttachmentsBucket) {
    console.log('\n✅ Creating job-attachments bucket...');
    const { data, error } = await supabase.storage.createBucket('job-attachments', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (error) {
      console.error('❌ Error creating job-attachments bucket:', error);
    } else {
      console.log('✅ job-attachments bucket created successfully');
    }
  } else {
    console.log('\n✅ job-attachments bucket already exists');
  }

  // Also ensure Job-storage exists (for backward compatibility)
  if (!jobStorageBucket) {
    console.log('\n✅ Creating Job-storage bucket...');
    const { data, error } = await supabase.storage.createBucket('Job-storage', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (error && error.message !== 'The resource already exists') {
      console.error('❌ Error creating Job-storage bucket:', error);
    } else {
      console.log('✅ Job-storage bucket created successfully');
    }
  } else {
    console.log('✅ Job-storage bucket already exists');
  }

  // Test upload permission
  console.log('\n🔍 Testing upload permissions...');
  const testFile = new Blob(['test'], { type: 'text/plain' });
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('job-attachments')
    .upload('test/test.txt', testFile, { upsert: true });

  if (uploadError) {
    console.error('❌ Upload test failed:', uploadError);
  } else {
    console.log('✅ Upload test successful');

    // Clean up test file
    await supabase.storage.from('job-attachments').remove(['test/test.txt']);
  }
}

// Run the script
checkAndCreateBuckets().then(() => {
  console.log('\n✅ Storage bucket check complete');
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});