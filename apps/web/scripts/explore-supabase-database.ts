/**
 * Explore Supabase database - show what tables and data we have
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

async function exploreDatabase() {
  console.log('🔍 EXPLORING SUPABASE DATABASE\n');
  console.log('='.repeat(60));
  console.log(`URL: ${supabaseUrl}`);
  console.log('='.repeat(60));

  // Tables we know exist and can query
  const tablesToExplore = [
    'users',
    'jobs',
    'bids',
    'contractors',
    'properties',
    'messages',
    'notifications',
    'payments',
    'reviews',
    'building_assessments',
    'assessment_images',
    'gpt4_training_labels',
    'yolo_corrections',
    'sam3_training_masks',
    'job_photos_metadata',
    'job_status_transitions',
    'escrow_transactions',
    'contractor_profiles',
    'contractor_certifications',
    'contractor_portfolios',
    'appointments',
    'availability_schedules'
  ];

  console.log('\n📊 DATABASE TABLES OVERVIEW:\n');

  for (const table of tablesToExplore) {
    try {
      // Get count and sample data
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        if (countError.message.includes('does not exist')) {
          console.log(`❌ ${table}: Table does not exist`);
        } else {
          console.log(`⚠️ ${table}: ${countError.message}`);
        }
      } else {
        // Get sample record to show columns
        const { data: sample } = await supabase
          .from(table)
          .select('*')
          .limit(1)
          .single();

        if (sample) {
          const columns = Object.keys(sample);
          console.log(`✅ ${table}: ${count || 0} records`);
          console.log(`   Columns (${columns.length}): ${columns.slice(0, 5).join(', ')}${columns.length > 5 ? '...' : ''}`);
        } else {
          console.log(`✅ ${table}: ${count || 0} records (empty)`);
        }
      }
    } catch (err) {
      console.log(`❌ ${table}: Error accessing table`);
    }
  }

  // Show some interesting statistics
  console.log('\n📈 DATABASE STATISTICS:\n');

  // Users by role
  const { data: userRoles } = await supabase
    .from('profiles')
    .select('role')
    .not('role', 'is', null);

  if (userRoles) {
    const roleCounts = userRoles.reduce((acc: any, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    console.log('Users by Role:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`   ${role}: ${count}`);
    });
  }

  // Jobs by status
  const { data: jobStatuses } = await supabase
    .from('jobs')
    .select('status')
    .not('status', 'is', null);

  if (jobStatuses) {
    const statusCounts = jobStatuses.reduce((acc: any, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {});

    console.log('\nJobs by Status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
  }

  // Building assessments by damage type
  const { data: damageTypes } = await supabase
    .from('building_assessments')
    .select('damage_type')
    .not('damage_type', 'is', null);

  if (damageTypes && damageTypes.length > 0) {
    const damageCounts = damageTypes.reduce((acc: any, assessment) => {
      const type = assessment.damage_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    console.log('\nBuilding Assessments by Damage Type:');
    const topDamages = Object.entries(damageCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5);

    topDamages.forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  }

  // Storage buckets
  console.log('\n📦 STORAGE BUCKETS:\n');

  const buckets = [
    'profile-images',
    'portfolio',
    'job-attachments',
    'training-images',
    'building-assessments',
    'yolo-models'
  ];

  for (const bucket of buckets) {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list('', { limit: 1 });

    if (error) {
      console.log(`❌ ${bucket}: ${error.message}`);
    } else {
      const { data: allFiles } = await supabase.storage
        .from(bucket)
        .list('', { limit: 1000 });

      console.log(`✅ ${bucket}: ${allFiles?.length || 0} files`);
    }
  }

  // Show recent activity
  console.log('\n⏰ RECENT ACTIVITY:\n');

  // Recent jobs
  const { data: recentJobs } = await supabase
    .from('jobs')
    .select('id, title, created_at, status')
    .order('created_at', { ascending: false })
    .limit(3);

  if (recentJobs && recentJobs.length > 0) {
    console.log('Recent Jobs:');
    recentJobs.forEach(job => {
      const date = new Date(job.created_at).toLocaleDateString();
      console.log(`   - ${job.title} (${job.status}) - ${date}`);
    });
  }

  // Recent assessments
  const { data: recentAssessments } = await supabase
    .from('building_assessments')
    .select('id, damage_type, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (recentAssessments && recentAssessments.length > 0) {
    console.log('\nRecent Assessments:');
    recentAssessments.forEach(assessment => {
      const date = new Date(assessment.created_at).toLocaleDateString();
      console.log(`   - ${assessment.damage_type || 'Unknown'} - ${date}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Database exploration complete!');
}

// Run the exploration
exploreDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });