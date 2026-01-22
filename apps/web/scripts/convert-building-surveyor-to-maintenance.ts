/**
 * Convert existing Building Surveyor assessments to maintenance training data
 * Maps building damage types to maintenance contractor types
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
  urgency_boost?: number;
}> = {
  'water damage': {
    issue_type: 'water_damage',
    contractor_type: 'water_damage_restoration',
    category: 'emergency',
    urgency_boost: 1
  },
  'water leak': {
    issue_type: 'pipe_leak',
    contractor_type: 'plumber',
    category: 'plumbing',
    urgency_boost: 2
  },
  'roof damage': {
    issue_type: 'roof_damage',
    contractor_type: 'roofer',
    category: 'roofing',
    urgency_boost: 1
  },
  'structural crack': {
    issue_type: 'wall_crack',
    contractor_type: 'structural_engineer',
    category: 'structural'
  },
  'mold': {
    issue_type: 'mold_damp',
    contractor_type: 'mold_remediation',
    category: 'environmental',
    urgency_boost: 1
  },
  'foundation damage': {
    issue_type: 'foundation_crack',
    contractor_type: 'foundation_specialist',
    category: 'structural',
    urgency_boost: 2
  },
  'electrical damage': {
    issue_type: 'electrical_fault',
    contractor_type: 'electrician',
    category: 'electrical',
    urgency_boost: 2
  },
  'fire damage': {
    issue_type: 'fire_damage',
    contractor_type: 'restoration_specialist',
    category: 'emergency',
    urgency_boost: 3
  }
};

// Severity to priority mapping
const SEVERITY_TO_PRIORITY: Record<string, string> = {
  'minimal': 'low',
  'minor': 'low',
  'midway': 'medium',
  'moderate': 'medium',
  'major': 'high',
  'severe': 'high',
  'critical': 'high'
};

async function convertAssessments() {
  console.log('🔄 Converting Building Surveyor Assessments to Maintenance Training Data\n');
  console.log('='.repeat(60));

  // Fetch all assessments with relevant damage types
  const { data: assessments, error } = await supabase
    .from('building_assessments')
    .select('*')
    .not('damage_type', 'is', null)
    .not('shadow_mode', 'is', false); // Only get real assessments

  if (error) {
    console.error('Error fetching assessments:', error);
    return;
  }

  if (!assessments || assessments.length === 0) {
    console.log('No assessments found to convert');
    return;
  }

  console.log(`Found ${assessments.length} assessments to process\n`);

  // Group by damage type
  const damageTypeGroups = new Map<string, any[]>();
  assessments.forEach(assessment => {
    const damageType = assessment.damage_type?.toLowerCase() || 'unknown';
    if (!damageTypeGroups.has(damageType)) {
      damageTypeGroups.set(damageType, []);
    }
    damageTypeGroups.get(damageType)!.push(assessment);
  });

  console.log('📊 Damage Type Distribution:');
  damageTypeGroups.forEach((assessments, type) => {
    console.log(`   ${type}: ${assessments.length} assessments`);
  });

  // Convert assessments to maintenance training data
  console.log('\n🔄 Converting to maintenance training data...\n');

  let convertedCount = 0;
  let skippedCount = 0;
  const maintenanceData = [];

  for (const assessment of assessments) {
    const damageType = assessment.damage_type?.toLowerCase();
    const mapping = DAMAGE_TO_MAINTENANCE_MAP[damageType];

    if (!mapping) {
      console.log(`   ⚠️ No mapping for damage type: ${damageType}`);
      skippedCount++;
      continue;
    }

    // Create maintenance assessment data
    const maintenanceAssessment = {
      original_assessment_id: assessment.id,
      issue_type: mapping.issue_type,
      contractor_type: mapping.contractor_type,
      category: mapping.category,
      severity: assessment.severity || 'moderate',
      priority: SEVERITY_TO_PRIORITY[assessment.severity] || 'medium',
      confidence: assessment.confidence || 75,
      urgency: assessment.urgency || 'normal',

      // Extract useful data from assessment
      materials_needed: extractMaterials(assessment),
      tools_required: extractTools(assessment),
      estimated_hours: estimateHours(assessment),
      safety_notes: extractSafetyNotes(assessment),

      // Metadata
      source: 'building_surveyor_conversion',
      created_at: new Date().toISOString(),

      // Original data reference
      original_data: {
        damage_type: assessment.damage_type,
        severity: assessment.severity,
        confidence: assessment.confidence,
        safety_score: assessment.safety_score,
        critical_hazard: assessment.critical_hazard,
        gpt4_assessment: assessment.gpt4_assessment
      }
    };

    maintenanceData.push(maintenanceAssessment);
    convertedCount++;

    // Log progress every 10 items
    if (convertedCount % 10 === 0) {
      console.log(`   ✅ Converted ${convertedCount} assessments...`);
    }
  }

  console.log(`\n✅ Successfully converted ${convertedCount} assessments`);
  console.log(`⚠️ Skipped ${skippedCount} assessments (no mapping)`);

  // Insert into maintenance tables
  console.log('\n💾 Saving to maintenance_training_labels table...');

  for (const data of maintenanceData) {
    const { error: insertError } = await supabase
      .from('maintenance_training_labels')
      .insert({
        assessment_id: data.original_assessment_id,
        issue_type: data.issue_type,
        confidence: data.confidence,
        human_verified: false,
        metadata: data,
        image_urls: [] // Will be populated when we find the actual images
      });

    if (insertError && !insertError.message.includes('duplicate')) {
      console.error(`Error inserting training label:`, insertError.message);
    }
  }

  // Generate statistics
  console.log('\n' + '='.repeat(60));
  console.log('📈 CONVERSION STATISTICS:\n');

  const issueTypeCounts = new Map<string, number>();
  const contractorTypeCounts = new Map<string, number>();

  maintenanceData.forEach(data => {
    issueTypeCounts.set(data.issue_type, (issueTypeCounts.get(data.issue_type) || 0) + 1);
    contractorTypeCounts.set(data.contractor_type, (contractorTypeCounts.get(data.contractor_type) || 0) + 1);
  });

  console.log('Issue Type Distribution:');
  issueTypeCounts.forEach((count, type) => {
    console.log(`   ${type}: ${count}`);
  });

  console.log('\nContractor Type Distribution:');
  contractorTypeCounts.forEach((count, type) => {
    console.log(`   ${type}: ${count}`);
  });

  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Find and link actual images from cache_key');
  console.log('2. Generate YOLO training labels from the data');
  console.log('3. Train YOLO model with these labels');
  console.log('4. Deploy trained model for production use');

  console.log('\n✨ Conversion complete!');
}

// Helper functions to extract relevant data
function extractMaterials(assessment: unknown): string[] {
  const materials = [];
  const damageType = assessment.damage_type?.toLowerCase();

  if (damageType?.includes('water') || damageType?.includes('leak')) {
    materials.push('Pipe sealant', 'Replacement fittings', 'Waterproofing membrane');
  }
  if (damageType?.includes('roof')) {
    materials.push('Roof tiles', 'Roofing felt', 'Flashing');
  }
  if (damageType?.includes('crack')) {
    materials.push('Crack filler', 'Mesh tape', 'Plaster');
  }
  if (damageType?.includes('mold')) {
    materials.push('Anti-mold treatment', 'Primer', 'Sealant');
  }

  return materials;
}

function extractTools(assessment: unknown): string[] {
  const tools = [];
  const damageType = assessment.damage_type?.toLowerCase();

  if (damageType?.includes('water') || damageType?.includes('leak')) {
    tools.push('Pipe wrench', 'Leak detector', 'Moisture meter');
  }
  if (damageType?.includes('roof')) {
    tools.push('Ladder', 'Roofing hammer', 'Safety harness');
  }
  if (damageType?.includes('crack')) {
    tools.push('Chisel', 'Trowel', 'Level');
  }
  if (damageType?.includes('mold')) {
    tools.push('Respirator', 'Scraper', 'Spray equipment');
  }

  return tools;
}

function estimateHours(assessment: unknown): number {
  const severity = assessment.severity?.toLowerCase();
  const damageType = assessment.damage_type?.toLowerCase();

  let baseHours = 2;

  // Adjust by severity
  if (severity === 'minimal' || severity === 'minor') baseHours = 1;
  if (severity === 'midway' || severity === 'moderate') baseHours = 3;
  if (severity === 'major' || severity === 'severe') baseHours = 6;
  if (severity === 'critical') baseHours = 8;

  // Adjust by type
  if (damageType?.includes('roof')) baseHours *= 1.5;
  if (damageType?.includes('foundation')) baseHours *= 2;
  if (damageType?.includes('emergency')) baseHours *= 0.8;

  return Math.round(baseHours);
}

function extractSafetyNotes(assessment: unknown): string[] {
  const notes = [];

  if (assessment.critical_hazard) {
    notes.push('⚠️ Critical hazard identified - exercise extreme caution');
  }

  if (assessment.safety_score < 50) {
    notes.push('Low safety score - PPE required');
  }

  const damageType = assessment.damage_type?.toLowerCase();
  if (damageType?.includes('electrical')) {
    notes.push('Turn off power at breaker before work');
  }
  if (damageType?.includes('mold')) {
    notes.push('Respirator required - health hazard');
  }
  if (damageType?.includes('roof')) {
    notes.push('Fall hazard - use safety harness');
  }

  return notes;
}

// Run the conversion
convertAssessments()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });