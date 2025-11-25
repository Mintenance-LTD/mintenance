/**
 * Export Shadow Mode Data for Training
 * 
 * Exports shadow mode assessments to CSV for Python training scripts.
 * Extracts SAM 3 confidence, GPT-4 confidence, scene graph score, and ground truth labels.
 * 
 * Usage: npx tsx scripts/export-shadow-mode-data.ts [--output-csv path/to/output.csv]
 */

// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { writeFileSync, mkdirSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const serverSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface TrainingRow {
  filename: string;
  image_url: string;
  sam3_confidence: number;
  gpt4_confidence: number;
  scene_graph_score: number;
  y_true: number; // 1 if damage, 0 if safe
  property_type?: string;
  property_age?: number;
  region?: string;
  true_class: string;
  predicted_class?: string;
  raw_probability?: number;
  fusion_variance?: number;
}

/**
 * Extract SAM 3 confidence from evidence
 */
function extractSAM3Confidence(sam3Evidence: any): number {
  if (!sam3Evidence || !sam3Evidence.damageTypes) {
    return 0;
  }

  // Compute weighted average of damage type confidences
  let totalConfidence = 0;
  let totalWeight = 0;

  for (const [damageType, data] of Object.entries(sam3Evidence.damageTypes as Record<string, { confidence: number; numInstances: number }>)) {
    const weight = data.numInstances;
    totalConfidence += data.confidence * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? totalConfidence / totalWeight : (sam3Evidence.overallConfidence || 0);
}

/**
 * Extract GPT-4 confidence from assessment
 */
function extractGPT4Confidence(gpt4Assessment: any): number {
  if (!gpt4Assessment) {
    return 0;
  }

  return gpt4Assessment.confidence || 0;
}

/**
 * Extract scene graph score from features
 */
function extractSceneGraphScore(sceneGraphFeatures: any): number {
  if (!sceneGraphFeatures) {
    return 0;
  }

  // Use compact feature vector if available (12-dim)
  const features = sceneGraphFeatures.compactFeatureVector || sceneGraphFeatures.featureVector || [];

  // Extract key indicators from features
  // Feature 0: has_critical_hazard
  // Feature 1: crack_density
  // Feature 5: damage_severity_score
  const hasCriticalHazard = features[0] || 0;
  const crackDensity = features[1] || 0;
  const damageSeverity = features[5] || 0;

  // Combine into score (0-1)
  return Math.min(1, (hasCriticalHazard * 0.4 + crackDensity * 0.3 + damageSeverity * 0.3));
}

/**
 * Convert true class to binary label
 */
function convertToBinaryLabel(trueClass: string): number {
  const normalized = trueClass.toLowerCase().trim();
  if (normalized === 'safe' || normalized === 'none' || normalized === 'no damage') {
    return 0;
  }
  return 1; // Any damage = 1
}

/**
 * Convert row to CSV line
 */
function rowToCSV(row: TrainingRow): string {
  const values = [
    row.filename || '',
    row.image_url || '',
    row.sam3_confidence.toFixed(4),
    row.gpt4_confidence.toFixed(4),
    row.scene_graph_score.toFixed(4),
    row.y_true.toString(),
    row.property_type || '',
    row.property_age?.toString() || '',
    row.region || '',
    row.true_class || '',
    row.predicted_class || '',
    row.raw_probability?.toFixed(4) || '',
    row.fusion_variance?.toFixed(4) || '',
  ];

  // Escape values that contain commas or quotes
  const escaped = values.map(v => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  });

  return escaped.join(',');
}

/**
 * Main export function
 */
async function exportShadowModeData(outputPath: string) {
  try {
    logger.info('Starting shadow mode data export...');

    // Query shadow mode assessments with ground truth
    const { data: assessments, error: fetchError } = await serverSupabase
      .from('building_assessments')
      .select('*')
      .eq('shadow_mode', true)
      .not('true_class', 'is', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch assessments: ${fetchError.message}`);
    }

    if (!assessments || assessments.length === 0) {
      logger.warn('No shadow mode assessments with ground truth found.');
      logger.info('Tip: Run shadow mode batch script first to generate training data.');
      return;
    }

    logger.info(`Found ${assessments.length} shadow mode assessments`);

    // Process assessments into training rows
    const rows: TrainingRow[] = [];
    let processed = 0;
    let skipped = 0;

    for (const assessment of assessments) {
      try {
        const sam3Confidence = extractSAM3Confidence(assessment.sam3_evidence);
        const gpt4Confidence = extractGPT4Confidence(assessment.gpt4_assessment);
        const sceneGraphScore = extractSceneGraphScore(assessment.scene_graph_features);
        const yTrue = convertToBinaryLabel(assessment.true_class);

        // Extract metadata from assessment_data if available
        const assessmentData = assessment.assessment_data || {};
        const evidence = assessmentData.evidence || {};

        rows.push({
          filename: assessment.cache_key?.replace('shadow_', '') || `assessment_${assessment.id}`,
          image_url: evidence.roboflowDetections?.[0]?.imageUrl || '',
          sam3_confidence: sam3Confidence,
          gpt4_confidence: gpt4Confidence,
          scene_graph_score: sceneGraphScore,
          y_true: yTrue,
          property_type: assessmentData.propertyType || null,
          property_age: assessmentData.propertyAge || null,
          region: assessmentData.region || null,
          true_class: assessment.true_class,
          predicted_class: assessment.predicted_class || null,
          raw_probability: assessment.raw_probability ? Number(assessment.raw_probability) : null,
          fusion_variance: assessment.fusion_variance ? Number(assessment.fusion_variance) : null,
        });

        processed++;
      } catch (error) {
        logger.warn(`Failed to process assessment ${assessment.id}`, { error });
        skipped++;
      }
    }

    logger.info(`Processed ${processed} assessments, skipped ${skipped}`);

    if (rows.length === 0) {
      logger.warn('No valid training rows generated.');
      return;
    }

    // Generate CSV
    const header = [
      'filename',
      'image_url',
      'sam3_confidence',
      'gpt4_confidence',
      'scene_graph_score',
      'y_true',
      'property_type',
      'property_age',
      'region',
      'true_class',
      'predicted_class',
      'raw_probability',
      'fusion_variance',
    ].join(',');

    const csvLines = [header, ...rows.map(rowToCSV)];
    const csvContent = csvLines.join('\n');

    // Ensure output directory exists
    const outputDir = outputPath.substring(0, outputPath.lastIndexOf('/'));
    if (outputDir) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Write CSV file
    writeFileSync(outputPath, csvContent, 'utf-8');

    logger.info(`✓ Exported ${rows.length} training samples to: ${outputPath}`);

    // Print summary statistics
    const damageCount = rows.filter(r => r.y_true === 1).length;
    const safeCount = rows.filter(r => r.y_true === 0).length;

    console.log('\n📊 Export Summary:');
    console.log(`   Total samples: ${rows.length}`);
    console.log(`   Damage samples: ${damageCount} (${((damageCount / rows.length) * 100).toFixed(1)}%)`);
    console.log(`   Safe samples: ${safeCount} (${((safeCount / rows.length) * 100).toFixed(1)}%)`);
    console.log(`   Average SAM 3 confidence: ${(rows.reduce((sum, r) => sum + r.sam3_confidence, 0) / rows.length).toFixed(4)}`);
    console.log(`   Average GPT-4 confidence: ${(rows.reduce((sum, r) => sum + r.gpt4_confidence, 0) / rows.length).toFixed(4)}`);
    console.log(`   Average scene graph score: ${(rows.reduce((sum, r) => sum + r.scene_graph_score, 0) / rows.length).toFixed(4)}`);

  } catch (error) {
    logger.error('Shadow mode data export failed', { error });
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  const outputPath = process.argv[2] || 'training-data/shadow-mode-predictions.csv';

  try {
    await exportShadowModeData(outputPath);
    console.log('\n✅ Export completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

