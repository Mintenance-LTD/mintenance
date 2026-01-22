/**
 * Inspect building assessment data in detail
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

async function inspectAssessments() {
  console.log('🔍 Inspecting Building Assessment Data\n');

  // Get first few assessments with all fields
  const { data: assessments, error } = await supabase
    .from('building_assessments')
    .select('*')
    .limit(3);

  if (error) {
    console.error('Error fetching assessments:', error);
    return;
  }

  if (!assessments || assessments.length === 0) {
    console.log('No assessments found');
    return;
  }

  console.log(`Found ${assessments.length} assessments to inspect:\n`);

  assessments.forEach((assessment, index) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Assessment ${index + 1}:`);
    console.log(`${'='.repeat(60)}`);

    console.log('\n📋 Basic Info:');
    console.log(`   ID: ${assessment.id}`);
    console.log(`   Created: ${assessment.created_at}`);
    console.log(`   Job ID: ${assessment.job_id || 'None'}`);
    console.log(`   User ID: ${assessment.user_id || 'None'}`);

    console.log('\n🎯 Assessment Data:');
    Object.keys(assessment).forEach(key => {
      const value = assessment[key];
      if (value !== null && value !== undefined && key !== 'id' && key !== 'created_at' && key !== 'job_id' && key !== 'user_id') {
        if (typeof value === 'object') {
          console.log(`   ${key}: ${JSON.stringify(value, null, 2).substring(0, 200)}...`);
        } else {
          console.log(`   ${key}: ${value}`);
        }
      }
    });
  });

  // Check column structure
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Table Structure:');
  console.log(`${'='.repeat(60)}`);

  if (assessments.length > 0) {
    const columns = Object.keys(assessments[0]);
    console.log('\nColumns found:');
    columns.forEach(col => {
      const sampleValue = assessments[0][col];
      const type = sampleValue === null ? 'null' : typeof sampleValue;
      console.log(`   - ${col}: ${type}`);
    });
  }

  // Check if any assessments have actual data
  const { data: withData, count } = await supabase
    .from('building_assessments')
    .select('id', { count: 'exact' })
    .not('total_damage_score', 'is', null);

  console.log(`\n📈 Assessments with damage scores: ${count || 0}`);

  // Check for detections
  const { data: withDetections, count: detectCount } = await supabase
    .from('building_assessments')
    .select('id', { count: 'exact' })
    .not('detections', 'is', null);

  console.log(`🎯 Assessments with detections: ${detectCount || 0}`);
}

inspectAssessments()
  .then(() => {
    console.log('\n✅ Inspection complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });