/**
 * Find and link images using cache keys from building assessments
 * Cache keys are SHA256 hashes that may point to stored images
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findImagesFromCache() {
  console.log('🔍 Finding Images from Cache Keys\n');
  console.log('='.repeat(60));

  // Get assessments with cache keys
  const { data: assessments, error } = await supabase
    .from('building_assessments')
    .select('id, cache_key, damage_type, severity')
    .not('cache_key', 'is', null)
    .limit(10); // Start with a few to test

  if (error) {
    console.error('Error fetching assessments:', error);
    return;
  }

  if (!assessments || assessments.length === 0) {
    console.log('No assessments with cache keys found');
    return;
  }

  console.log(`Found ${assessments.length} assessments with cache keys\n`);

  // Check various storage buckets for images
  const bucketsToCheck = [
    'building-assessments',
    'job-attachments',
    'profile-images',
    'portfolio',
    'training-images'
  ];

  let imagesFound = 0;
  let imagesNotFound = 0;

  for (const assessment of assessments) {
    console.log(`\nChecking assessment ${assessment.id.substring(0, 8)}...`);
    console.log(`  Cache key: ${assessment.cache_key.substring(0, 16)}...`);
    console.log(`  Damage type: ${assessment.damage_type}`);

    let imageFound = false;

    // Strategy 1: Check if cache key is directly used as filename
    for (const bucket of bucketsToCheck) {
      const possiblePaths = [
        `${assessment.cache_key}.jpg`,
        `${assessment.cache_key}.png`,
        `${assessment.cache_key}.webp`,
        `assessments/${assessment.cache_key}.jpg`,
        `${assessment.id}/${assessment.cache_key}.jpg`,
        `${assessment.id}.jpg`
      ];

      for (const filePath of possiblePaths) {
        const { data: file } = await supabase.storage
          .from(bucket)
          .download(filePath);

        if (file) {
          console.log(`  ✅ Found image in ${bucket}: ${filePath}`);
          imageFound = true;
          imagesFound++;

          // Generate public URL
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

          if (urlData) {
            console.log(`  📸 Public URL: ${urlData.publicUrl}`);

            // Store the image URL in assessment_images table
            await linkImageToAssessment(assessment.id, urlData.publicUrl, 0);
          }
          break;
        }
      }

      if (imageFound) break;
    }

    // Strategy 2: Check assessment_images table
    if (!imageFound) {
      const { data: existingImages } = await supabase
        .from('assessment_images')
        .select('image_url')
        .eq('assessment_id', assessment.id);

      if (existingImages && existingImages.length > 0) {
        console.log(`  ✅ Found ${existingImages.length} images in assessment_images table`);
        existingImages.forEach(img => {
          console.log(`  📸 Image URL: ${img.image_url.substring(0, 50)}...`);
        });
        imageFound = true;
        imagesFound++;
      }
    }

    // Strategy 3: Check if cache key relates to a job with photos
    if (!imageFound) {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title')
        .or(`description.ilike.%${assessment.damage_type}%,title.ilike.%${assessment.damage_type}%`)
        .limit(1);

      if (jobs && jobs.length > 0) {
        const job = jobs[0];
        console.log(`  🔗 Possibly related to job: ${job.title}`);

        // Check job_photos_metadata
        const { data: jobPhotos } = await supabase
          .from('job_photos_metadata')
          .select('photo_url')
          .eq('job_id', job.id);

        if (jobPhotos && jobPhotos.length > 0) {
          console.log(`  ✅ Found ${jobPhotos.length} job photos`);
          imageFound = true;
          imagesFound++;

          // Link these photos to the assessment
          for (let i = 0; i < jobPhotos.length; i++) {
            await linkImageToAssessment(assessment.id, jobPhotos[i].photo_url, i);
          }
        }
      }
    }

    if (!imageFound) {
      console.log(`  ❌ No images found`);
      imagesNotFound++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SEARCH RESULTS:\n');
  console.log(`✅ Images found: ${imagesFound}`);
  console.log(`❌ Images not found: ${imagesNotFound}`);

  if (imagesFound === 0) {
    console.log('\n⚠️ No images found using cache keys.');
    console.log('\n📝 Alternative approach needed:');
    console.log('1. Use synthetic/sample images for initial training');
    console.log('2. Set up contractor contribution portal');
    console.log('3. Generate training data from stock images');
  } else {
    console.log('\n✅ Successfully found some images!');
    console.log('Next step: Generate YOLO training labels from these images');
  }

  // Let's also check if we can list files in storage buckets
  console.log('\n🗂️ Checking storage bucket contents...\n');

  for (const bucket of bucketsToCheck) {
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list('', {
        limit: 5,
        offset: 0
      });

    if (files && files.length > 0) {
      console.log(`📁 ${bucket} bucket (${files.length} files):`);
      files.forEach(file => {
        console.log(`   - ${file.name} (${file.metadata?.size || 'unknown'} bytes)`);
      });
    } else if (listError) {
      console.log(`❌ ${bucket} bucket: ${listError.message}`);
    } else {
      console.log(`📁 ${bucket} bucket: empty`);
    }
  }

  console.log('\n✨ Search complete!');
}

async function linkImageToAssessment(assessmentId: string, imageUrl: string, index: number) {
  // Try to insert into assessment_images table
  const { error } = await supabase
    .from('assessment_images')
    .insert({
      assessment_id: assessmentId,
      image_url: imageUrl,
      image_index: index,
      image_hash: crypto.createHash('md5').update(imageUrl).digest('hex'),
      metadata: {
        source: 'cache_key_recovery',
        linked_at: new Date().toISOString()
      }
    });

  if (error && !error.message.includes('duplicate')) {
    // Table might not exist or have different schema
    console.log(`     ⚠️ Could not link image: ${error.message.substring(0, 50)}...`);
  } else if (!error) {
    console.log(`     ✅ Linked image to assessment`);
  }
}

// Run the search
findImagesFromCache()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });