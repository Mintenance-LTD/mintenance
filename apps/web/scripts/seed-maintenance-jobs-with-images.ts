/**
 * Seed maintenance jobs with sample images for AI training
 * Creates jobs with image URLs that can be used for YOLO training
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

// Sample image URLs for different maintenance issues
// These would normally be uploaded to Supabase Storage, but for demo we'll use placeholder URLs
const SAMPLE_IMAGES = {
  pipe_leak: [
    'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=800', // Pipe under sink
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800', // Water damage
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', // Plumbing
  ],
  electrical_fault: [
    'https://images.unsplash.com/photo-1565608438257-fac3c27beb36?w=800', // Electrical panel
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', // Wiring
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800', // Outlet
  ],
  roof_damage: [
    'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=800', // Roof tiles
    'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?w=800', // Damaged roof
    'https://images.unsplash.com/photo-1430285561322-7808604715df?w=800', // Roof repair
  ],
  wall_crack: [
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800', // Wall crack
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800', // Structural crack
    'https://images.unsplash.com/photo-1604709177225-055f99402ea3?w=800', // Wall damage
  ],
  window_broken: [
    'https://images.unsplash.com/photo-1584704131915-a4889a9dce8d?w=800', // Broken window
    'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=800', // Window repair
    'https://images.unsplash.com/photo-1528716321680-815a8cdb8cbe?w=800', // Glass damage
  ],
  mold_damp: [
    'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800', // Mold on wall
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800', // Damp wall
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800', // Water damage
  ],
  hvac_malfunction: [
    'https://images.unsplash.com/photo-1628744876497-eb30460be9f6?w=800', // AC unit
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800', // HVAC system
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800', // Thermostat
  ],
};

const maintenanceJobsWithImages = [
  {
    title: 'Urgent Pipe Leak Under Kitchen Sink',
    description: 'Water is actively leaking from pipe under kitchen sink. Already placed bucket but need immediate repair. Water damage starting to show on cabinet floor.',
    category: 'plumbing',
    issue_type: 'pipe_leak',
    budget: 250,
    priority: 'high',
    location: '123 Baker Street, Westminster, London NW1 6XE',
    status: 'posted',
    images: SAMPLE_IMAGES.pipe_leak,
  },
  {
    title: 'Electrical Outlet Sparking',
    description: 'Kitchen outlet started sparking when plugging in appliance. Circuit breaker tripped. Need immediate electrical inspection and repair.',
    category: 'electrical',
    issue_type: 'electrical_fault',
    budget: 350,
    priority: 'high',
    location: '45 Oxford Street, Westminster, London W1D 2DZ',
    status: 'posted',
    images: SAMPLE_IMAGES.electrical_fault,
  },
  {
    title: 'Storm Damage to Roof Tiles',
    description: 'Recent storm has damaged several roof tiles. Can see daylight through attic in one spot. Water entering during rain.',
    category: 'roofing',
    issue_type: 'roof_damage',
    budget: 1200,
    priority: 'high',
    location: '78 Richmond Road, Kingston, London KT2 5EP',
    status: 'posted',
    images: SAMPLE_IMAGES.roof_damage,
  },
  {
    title: 'Large Crack in Living Room Wall',
    description: 'Crack has appeared in living room wall, approximately 2 meters long. Concerned about structural integrity. Started small but growing.',
    category: 'structural',
    issue_type: 'wall_crack',
    budget: 800,
    priority: 'medium',
    location: '234 Camden High Street, Camden, London NW1 8QS',
    status: 'posted',
    images: SAMPLE_IMAGES.wall_crack,
  },
  {
    title: 'Broken Window After Attempted Break-in',
    description: 'Ground floor window smashed during attempted break-in. Need emergency boarding and replacement. Double-glazed unit completely shattered.',
    category: 'windows',
    issue_type: 'window_broken',
    budget: 450,
    priority: 'high',
    location: '567 Brixton Road, Brixton, London SW9 8PR',
    status: 'posted',
    images: SAMPLE_IMAGES.window_broken,
  },
  {
    title: 'Black Mold in Bathroom',
    description: 'Black mold spreading on bathroom ceiling and walls. Poor ventilation suspected cause. Need mold removal and prevention solution.',
    category: 'damp',
    issue_type: 'mold_damp',
    budget: 600,
    priority: 'medium',
    location: '89 Shoreditch High Street, Shoreditch, London E1 6JN',
    status: 'posted',
    images: SAMPLE_IMAGES.mold_damp,
  },
  {
    title: 'Central Heating Not Working',
    description: 'Boiler running but radiators stay cold. Already bled radiators with no improvement. House getting very cold.',
    category: 'hvac',
    issue_type: 'hvac_malfunction',
    budget: 400,
    priority: 'high',
    location: '12 Greenwich High Road, Greenwich, London SE10 8JL',
    status: 'posted',
    images: SAMPLE_IMAGES.hvac_malfunction,
  },
];

async function seedMaintenanceJobs() {
  console.log('🔧 Starting to seed maintenance jobs with images...\n');

  // Get or create a test homeowner
  let { data: homeowner } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'homeowner')
    .single();

  if (!homeowner) {
    // Create a test homeowner
    const { data: newUser, error: userError } = await supabase
      .from('profiles')
      .insert({
        email: 'test.homeowner@mintenance.com',
        first_name: 'Test',
        last_name: 'Homeowner',
        role: 'homeowner',
        phone: '+447700900000'
      })
      .select()
      .single();

    if (userError) {
      console.error('Failed to create test homeowner:', userError);
      process.exit(1);
    }

    homeowner = newUser;
    console.log('✅ Created test homeowner');
  }

  // Create a job_photos_metadata entry for each job
  let successCount = 0;
  let errorCount = 0;

  for (const jobData of maintenanceJobsWithImages) {
    try {
      // Create the job first
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          title: jobData.title,
          description: jobData.description,
          category: jobData.category,
          budget: jobData.budget,
          priority: jobData.priority,
          location: jobData.location,
          homeowner_id: homeowner.id,
          status: jobData.status,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jobError) {
        console.error(`❌ Error creating job "${jobData.title}":`, jobError.message);
        errorCount++;
        continue;
      }

      console.log(`✅ Created job: ${jobData.title}`);

      // Now create photo metadata for the job
      for (let i = 0; i < jobData.images.length; i++) {
        const { error: photoError } = await supabase
          .from('job_photos_metadata')
          .insert({
            job_id: job.id,
            photo_url: jobData.images[i],
            photo_type: 'before', // These are all "before" photos showing the issue
            timestamp: new Date().toISOString(),
            metadata: {
              issue_type: jobData.issue_type,
              index: i,
              source: 'seed_script',
              for_training: true
            }
          });

        if (photoError) {
          console.error(`  ⚠️ Error adding photo metadata:`, photoError.message);
        } else {
          console.log(`  📸 Added photo ${i + 1}/${jobData.images.length}`);
        }
      }

      // Create a building assessment for AI training
      const { data: assessment, error: assessmentError } = await supabase
        .from('building_assessments')
        .insert({
          job_id: job.id,
          user_id: homeowner.id,
          assessment_type: 'maintenance',
          status: 'completed',
          total_damage_score: Math.random() * 100, // Random score for demo
          confidence_score: 85 + Math.random() * 15, // 85-100% confidence
          processing_time_ms: 2000 + Math.random() * 3000,
          model_version: 'yolo-v11-maintenance',
          detections: [
            {
              class: jobData.issue_type,
              confidence: 0.85 + Math.random() * 0.15,
              bbox: [100, 100, 300, 300], // Dummy bounding box
              severity: ['minor', 'moderate', 'major'][Math.floor(Math.random() * 3)]
            }
          ],
          metadata: {
            issue_type: jobData.issue_type,
            category: jobData.category,
            for_training: true
          }
        })
        .select()
        .single();

      if (assessmentError) {
        console.error(`  ⚠️ Error creating assessment:`, assessmentError.message);
      } else {
        console.log(`  🤖 Created building assessment`);

        // Link images to assessment
        for (let i = 0; i < jobData.images.length; i++) {
          await supabase
            .from('assessment_images')
            .insert({
              assessment_id: assessment.id,
              image_url: jobData.images[i],
              image_index: i,
              image_hash: `hash_${job.id}_${i}`, // Dummy hash
              metadata: {
                issue_type: jobData.issue_type
              }
            });
        }
      }

      successCount++;

    } catch (error) {
      console.error(`❌ Error processing job "${jobData.title}":`, error);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Seeding complete!`);
  console.log(`✅ Successfully added: ${successCount} jobs with images`);
  console.log(`❌ Errors: ${errorCount} jobs`);
  console.log('='.repeat(60));

  // Check what we have for training
  const { count: jobCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true });

  const { count: photoCount } = await supabase
    .from('job_photos_metadata')
    .select('*', { count: 'exact', head: true });

  const { count: assessmentCount } = await supabase
    .from('building_assessments')
    .select('*', { count: 'exact', head: true });

  console.log('\n📈 Database Status:');
  console.log(`   Jobs: ${jobCount || 0}`);
  console.log(`   Photos: ${photoCount || 0}`);
  console.log(`   Assessments: ${assessmentCount || 0}`);

  console.log('\n🎯 Next Steps:');
  console.log('1. Run bootstrap script to process these images with SAM3:');
  console.log('   npm run bootstrap-training');
  console.log('\n2. Once you have 1000+ labeled images, train YOLO:');
  console.log('   npm run train-yolo');
  console.log('\n3. Or use contractor portal to collect more real-world data:');
  console.log('   http://localhost:3000/contractor/contribute-training');
}

// Run the script
seedMaintenanceJobs()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });