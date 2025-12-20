/**
 * Check existing training data in database
 * Finds jobs with images and building assessments for training
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTrainingData() {
  console.log('=== Checking Existing Training Data ===\n');

  // 1. Check jobs with images
  console.log('1. Checking jobs table for images...');
  const { data: jobsWithImages, error: jobsError } = await supabase
    .from('jobs')
    .select('id, title, description, category, images, status')
    .not('images', 'is', null)
    .limit(100);

  if (jobsError) {
    console.error('Error fetching jobs:', jobsError);
  } else {
    console.log(`Found ${jobsWithImages?.length || 0} jobs with images`);

    if (jobsWithImages && jobsWithImages.length > 0) {
      // Count total images
      const totalImages = jobsWithImages.reduce((sum, job) => {
        return sum + (Array.isArray(job.images) ? job.images.length : 0);
      }, 0);

      console.log(`Total images available: ${totalImages}`);

      // Show categories
      const categories = [...new Set(jobsWithImages.map(j => j.category))];
      console.log(`Categories: ${categories.join(', ')}`);

      // Show sample
      console.log('\nSample jobs with images:');
      jobsWithImages.slice(0, 5).forEach(job => {
        const imageCount = Array.isArray(job.images) ? job.images.length : 0;
        console.log(`  - ${job.title} (${job.category}): ${imageCount} images`);
      });
    }
  }

  // 2. Check building_assessments table
  console.log('\n2. Checking building_assessments table...');
  const { data: assessments, count: assessmentCount, error: assessmentError } = await supabase
    .from('building_assessments')
    .select('*', { count: 'exact', head: true });

  if (assessmentError) {
    console.error('Error checking assessments:', assessmentError);
  } else {
    console.log(`Found ${assessmentCount || 0} building assessments`);
  }

  // 3. Check for GPT-4 training labels
  console.log('\n3. Checking gpt4_training_labels table...');
  const { count: gpt4Count, error: gpt4Error } = await supabase
    .from('gpt4_training_labels')
    .select('*', { count: 'exact', head: true });

  if (gpt4Error) {
    console.error('Error checking GPT-4 labels:', gpt4Error.message);
  } else {
    console.log(`Found ${gpt4Count || 0} GPT-4 training labels`);
  }

  // 4. Check for YOLO corrections
  console.log('\n4. Checking yolo_corrections table...');
  const { count: correctionsCount, error: correctionsError } = await supabase
    .from('yolo_corrections')
    .select('*', { count: 'exact', head: true });

  if (correctionsError) {
    console.error('Error checking corrections:', correctionsError.message);
  } else {
    console.log(`Found ${correctionsCount || 0} YOLO corrections`);
  }

  // 5. Check for SAM3 masks
  console.log('\n5. Checking sam3_training_masks table...');
  const { count: sam3Count, error: sam3Error } = await supabase
    .from('sam3_training_masks')
    .select('*', { count: 'exact', head: true });

  if (sam3Error) {
    console.error('Error checking SAM3 masks:', sam3Error.message);
  } else {
    console.log(`Found ${sam3Count || 0} SAM3 training masks`);
  }

  // 6. Check maintenance tables (if they exist)
  console.log('\n6. Checking maintenance-specific tables...');

  // Check maintenance_assessments
  const { count: maintenanceCount, error: maintenanceError } = await supabase
    .from('maintenance_assessments')
    .select('*', { count: 'exact', head: true });

  if (maintenanceError) {
    console.log('maintenance_assessments table not found (need to run migrations)');
  } else {
    console.log(`Found ${maintenanceCount || 0} maintenance assessments`);
  }

  // Check maintenance_training_labels
  const { count: maintenanceLabelsCount, error: maintenanceLabelsError } = await supabase
    .from('maintenance_training_labels')
    .select('*', { count: 'exact', head: true });

  if (maintenanceLabelsError) {
    console.log('maintenance_training_labels table not found (need to run migrations)');
  } else {
    console.log(`Found ${maintenanceLabelsCount || 0} maintenance training labels`);
  }

  // 7. Summary and recommendations
  console.log('\n=== SUMMARY ===');

  if (jobsWithImages && jobsWithImages.length > 0) {
    const totalImages = jobsWithImages.reduce((sum, job) => {
      return sum + (Array.isArray(job.images) ? job.images.length : 0);
    }, 0);

    console.log(`\n✅ You have ${totalImages} images from ${jobsWithImages.length} jobs available for training!`);
    console.log('\nRecommended next steps:');
    console.log('1. Run the bootstrap script to process these images:');
    console.log('   npm run bootstrap-training');
    console.log('\n2. The script will:');
    console.log('   - Use SAM3 to segment the images');
    console.log('   - Use GPT-4 to classify maintenance issues');
    console.log('   - Generate YOLO training labels');
    console.log('   - Save everything to the database');

    // Show specific maintenance-relevant jobs
    const maintenanceJobs = jobsWithImages.filter(job =>
      job.description?.toLowerCase().includes('leak') ||
      job.description?.toLowerCase().includes('repair') ||
      job.description?.toLowerCase().includes('broken') ||
      job.description?.toLowerCase().includes('damage') ||
      job.description?.toLowerCase().includes('crack') ||
      job.title?.toLowerCase().includes('emergency') ||
      job.title?.toLowerCase().includes('repair')
    );

    if (maintenanceJobs.length > 0) {
      console.log(`\n🎯 Found ${maintenanceJobs.length} maintenance-specific jobs perfect for training:`);
      maintenanceJobs.slice(0, 10).forEach(job => {
        console.log(`   - ${job.title}: ${job.description?.substring(0, 60)}...`);
      });
    }
  } else {
    console.log('\n⚠️ No jobs with images found in database.');
    console.log('\nYou need to either:');
    console.log('1. Add some test jobs with images');
    console.log('2. Import real job data');
    console.log('3. Use the contractor contribution portal to upload images');
  }

  // Check if maintenance tables exist
  if (maintenanceError) {
    console.log('\n⚠️ Maintenance tables not found!');
    console.log('Run migrations first: npx supabase db push');
  }
}

// Run the check
checkTrainingData()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });