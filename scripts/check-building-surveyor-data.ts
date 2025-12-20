/**
 * Check Building Surveyor AI training data
 * Looks for existing assessments and images we can use for maintenance AI training
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

async function checkBuildingSurveyorData() {
  console.log('🏗️ Checking Building Surveyor AI Data\n');
  console.log('='.repeat(60));

  // 1. Check building_assessments
  console.log('\n1️⃣ BUILDING ASSESSMENTS:');
  const { data: assessments, count: assessmentCount } = await supabase
    .from('building_assessments')
    .select('*', { count: 'exact' })
    .limit(5);

  console.log(`   Total assessments: ${assessmentCount || 0}`);

  if (assessments && assessments.length > 0) {
    console.log('\n   Sample assessments:');
    assessments.forEach(a => {
      const detections = a.detections ? JSON.parse(JSON.stringify(a.detections)) : [];
      console.log(`   - ID: ${a.id.substring(0, 8)}...`);
      console.log(`     Status: ${a.status}`);
      console.log(`     Score: ${a.total_damage_score?.toFixed(1) || 'N/A'}`);
      console.log(`     Detections: ${Array.isArray(detections) ? detections.length : 0}`);
      if (Array.isArray(detections) && detections.length > 0) {
        detections.slice(0, 2).forEach((d: any) => {
          console.log(`       • ${d.class || d.type || 'Unknown'} (${(d.confidence * 100).toFixed(1)}%)`);
        });
      }
    });
  }

  // 2. Check assessment_images
  console.log('\n2️⃣ ASSESSMENT IMAGES:');
  const { data: images, count: imageCount } = await supabase
    .from('assessment_images')
    .select('*', { count: 'exact' })
    .limit(10);

  console.log(`   Total images: ${imageCount || 0}`);

  if (images && images.length > 0) {
    // Group by assessment
    const assessmentImages = new Map();
    images.forEach(img => {
      if (!assessmentImages.has(img.assessment_id)) {
        assessmentImages.set(img.assessment_id, []);
      }
      assessmentImages.get(img.assessment_id).push(img);
    });

    console.log(`   Images grouped by ${assessmentImages.size} assessments`);
    console.log('\n   Sample image URLs:');
    images.slice(0, 3).forEach(img => {
      console.log(`   - ${img.image_url.substring(0, 50)}...`);
    });
  }

  // 3. Check GPT-4 training labels
  console.log('\n3️⃣ GPT-4 TRAINING LABELS:');
  const { data: gpt4Labels, count: gpt4Count } = await supabase
    .from('gpt4_training_labels')
    .select('*', { count: 'exact' })
    .limit(5);

  console.log(`   Total GPT-4 labels: ${gpt4Count || 0}`);

  if (gpt4Labels && gpt4Labels.length > 0) {
    console.log('\n   Sample labels:');
    gpt4Labels.forEach(label => {
      console.log(`   - Type: ${label.damage_type}`);
      console.log(`     Severity: ${label.severity}`);
      console.log(`     Confidence: ${label.confidence}%`);
    });
  }

  // 4. Check YOLO corrections
  console.log('\n4️⃣ YOLO CORRECTIONS:');
  const { data: corrections, count: correctionsCount } = await supabase
    .from('yolo_corrections')
    .select('*', { count: 'exact' })
    .limit(5);

  console.log(`   Total corrections: ${correctionsCount || 0}`);

  // 5. Check SAM3 masks
  console.log('\n5️⃣ SAM3 TRAINING MASKS:');
  const { data: sam3Masks, count: sam3Count } = await supabase
    .from('sam3_training_masks')
    .select('*', { count: 'exact' })
    .limit(5);

  console.log(`   Total SAM3 masks: ${sam3Count || 0}`);

  // 6. Check maintenance tables
  console.log('\n6️⃣ MAINTENANCE-SPECIFIC TABLES:');

  const { count: maintenanceAssessments } = await supabase
    .from('maintenance_assessments')
    .select('*', { count: 'exact', head: true });
  console.log(`   Maintenance assessments: ${maintenanceAssessments || 0}`);

  const { count: maintenanceLabels } = await supabase
    .from('maintenance_training_labels')
    .select('*', { count: 'exact', head: true });
  console.log(`   Maintenance training labels: ${maintenanceLabels || 0}`);

  // 7. Check job photos metadata
  console.log('\n7️⃣ JOB PHOTOS METADATA:');
  const { data: jobPhotos, count: photoCount } = await supabase
    .from('job_photos_metadata')
    .select('*', { count: 'exact' })
    .limit(10);

  console.log(`   Total job photos: ${photoCount || 0}`);

  if (jobPhotos && jobPhotos.length > 0) {
    console.log('\n   Sample photos:');
    jobPhotos.slice(0, 3).forEach(photo => {
      console.log(`   - Type: ${photo.photo_type}`);
      console.log(`     URL: ${photo.photo_url.substring(0, 50)}...`);
      console.log(`     Timestamp: ${photo.timestamp}`);
    });
  }

  // Summary and recommendations
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY & RECOMMENDATIONS:\n');

  const totalUsableImages = (imageCount || 0) + (photoCount || 0);
  const hasLabels = (gpt4Count || 0) > 0 || (maintenanceLabels || 0) > 0;
  const hasAssessments = (assessmentCount || 0) > 0;

  if (totalUsableImages === 0) {
    console.log('❌ No images found in database');
    console.log('\n📝 Action Required:');
    console.log('   1. Run: npx tsx scripts/seed-maintenance-jobs-with-images.ts');
    console.log('   2. Or upload real maintenance images via the app');
  } else if (totalUsableImages < 100) {
    console.log(`⚠️ Only ${totalUsableImages} images found (need 1000+ for good YOLO training)`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Add more test data with seed scripts');
    console.log('   2. Use contractor contribution portal');
    console.log('   3. Import historical job images if available');
  } else {
    console.log(`✅ Found ${totalUsableImages} images available for training`);

    if (!hasLabels) {
      console.log('⚠️ No training labels found');
      console.log('\n📝 Next Step: Run bootstrap script to generate labels:');
      console.log('   npm run bootstrap-training');
    } else {
      console.log(`✅ Found existing labels (GPT-4: ${gpt4Count}, Maintenance: ${maintenanceLabels})`);
      console.log('\n🚀 Ready to train YOLO model!');
      console.log('   npm run train-yolo');
    }
  }

  if (hasAssessments) {
    console.log(`\n💡 ${assessmentCount} existing assessments can be repurposed for maintenance AI`);
    console.log('   These contain detection data that can be mapped to maintenance categories');
  }

  // Check for actual maintenance-relevant assessments
  if (assessmentCount && assessmentCount > 0) {
    const { data: maintenanceRelevant } = await supabase
      .from('building_assessments')
      .select('detections')
      .not('detections', 'is', null)
      .limit(100);

    if (maintenanceRelevant) {
      const maintenanceKeywords = ['crack', 'damage', 'water', 'leak', 'mold', 'damp', 'roof', 'electrical', 'pipe'];
      let relevantCount = 0;

      maintenanceRelevant.forEach(assessment => {
        const detections = assessment.detections;
        if (detections && JSON.stringify(detections).toLowerCase().match(new RegExp(maintenanceKeywords.join('|')))) {
          relevantCount++;
        }
      });

      if (relevantCount > 0) {
        console.log(`\n🎯 Found ${relevantCount} assessments with maintenance-relevant detections!`);
        console.log('   These can be directly used for training after relabeling');
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Analysis complete!\n');
}

// Run the check
checkBuildingSurveyorData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });