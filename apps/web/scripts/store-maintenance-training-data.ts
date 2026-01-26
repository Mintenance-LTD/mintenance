/**
 * Store maintenance training data in existing GPT-4 training labels table
 * Converts building assessments to training data format
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

// Map Building Surveyor damage types to maintenance categories
const DAMAGE_TO_MAINTENANCE_MAP: Record<string, {
  issue_type: string;
  contractor_type: string;
  category: string;
}> = {
  'water damage': { issue_type: 'water_damage', contractor_type: 'water_damage_restoration', category: 'emergency' },
  'water leak': { issue_type: 'pipe_leak', contractor_type: 'plumber', category: 'plumbing' },
  'roof damage': { issue_type: 'roof_damage', contractor_type: 'roofer', category: 'roofing' },
  'structural crack': { issue_type: 'wall_crack', contractor_type: 'structural_engineer', category: 'structural' },
  'mold': { issue_type: 'mold_damp', contractor_type: 'mold_remediation', category: 'environmental' },
  'fire damage': { issue_type: 'fire_damage', contractor_type: 'restoration_specialist', category: 'emergency' }
};

async function storeMaintenanceTrainingData() {
  console.log('💾 Storing Maintenance Training Data\n');
  console.log('='.repeat(60));

  // Fetch assessments with relevant damage types
  const { data: assessments, error } = await supabase
    .from('building_assessments')
    .select('*')
    .not('damage_type', 'is', null)
    .in('damage_type', Object.keys(DAMAGE_TO_MAINTENANCE_MAP));

  if (error) {
    console.error('Error fetching assessments:', error);
    return;
  }

  if (!assessments || assessments.length === 0) {
    console.log('No matching assessments found');
    return;
  }

  console.log(`Found ${assessments.length} assessments to convert\n`);

  let successCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  for (const assessment of assessments) {
    const damageType = assessment.damage_type?.toLowerCase();
    const mapping = DAMAGE_TO_MAINTENANCE_MAP[damageType];

    if (!mapping) continue;

    // Check if this assessment already has a GPT-4 label
    const { data: existing } = await supabase
      .from('gpt4_training_labels')
      .select('id')
      .eq('assessment_id', assessment.id)
      .single();

    if (existing) {
      duplicateCount++;
      continue;
    }

    // Create GPT-4 training label with maintenance data
    const trainingLabel = {
      assessment_id: assessment.id,
      damage_type: mapping.issue_type, // Store maintenance issue type
      severity: assessment.severity || 'moderate',
      confidence: assessment.confidence || 75,
      bounding_boxes: [], // Will be populated when we have images

      // Store maintenance-specific data in metadata
      metadata: {
        contractor_type: mapping.contractor_type,
        category: mapping.category,
        urgency: assessment.urgency,
        original_damage_type: assessment.damage_type,
        cache_key: assessment.cache_key, // Important for finding images
        safety_score: assessment.safety_score,
        critical_hazard: assessment.critical_hazard,
        source: 'maintenance_conversion'
      },

      // Image URLs will be added when we find them
      image_urls: [],

      created_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase
      .from('gpt4_training_labels')
      .insert(trainingLabel);

    if (insertError) {
      console.error(`Error inserting label for assessment ${assessment.id}:`, insertError.message);
      errorCount++;
    } else {
      successCount++;

      // Log progress every 10 items
      if (successCount % 10 === 0) {
        console.log(`✅ Stored ${successCount} training labels...`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 STORAGE RESULTS:\n');
  console.log(`✅ Successfully stored: ${successCount} training labels`);
  console.log(`⚠️ Skipped duplicates: ${duplicateCount}`);
  console.log(`❌ Errors: ${errorCount}`);

  // Get statistics on stored data
  const { data: stats } = await supabase
    .from('gpt4_training_labels')
    .select('damage_type, metadata')
    .eq('metadata->source', 'maintenance_conversion');

  if (stats && stats.length > 0) {
    const issueTypeCounts = new Map<string, number>();
    const contractorTypeCounts = new Map<string, number>();

    stats.forEach(item => {
      issueTypeCounts.set(item.damage_type, (issueTypeCounts.get(item.damage_type) || 0) + 1);
      if (item.metadata?.contractor_type) {
        contractorTypeCounts.set(item.metadata.contractor_type,
          (contractorTypeCounts.get(item.metadata.contractor_type) || 0) + 1);
      }
    });

    console.log('\n📈 Training Data Distribution:');
    console.log('\nBy Issue Type:');
    issueTypeCounts.forEach((count, type) => {
      console.log(`   ${type}: ${count}`);
    });

    console.log('\nBy Contractor Type:');
    contractorTypeCounts.forEach((count, type) => {
      console.log(`   ${type}: ${count}`);
    });
  }

  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Run script to find images using cache keys');
  console.log('2. Generate YOLO bounding boxes from assessments');
  console.log('3. Create YOLO training dataset');
  console.log('4. Train YOLO model');

  console.log('\n✨ Storage complete!');
}

storeMaintenanceTrainingData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });