/**
 * Populate A/B Test Calibration Data
 * 
 * Extracts historical assessments and computes nonconformity scores
 * for hierarchical Mondrian conformal prediction.
 * 
 * Usage: npx tsx scripts/populate-ab-test-calibration-data.ts
 */

// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';

// Create Supabase client directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n   These should be in your .env.local file');
  process.exit(1);
}

const serverSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface AssessmentRecord {
  id: string;
  damage_type: string;
  severity: string;
  confidence: number;
  assessment_data: any;
  validation_status: string;
  validated_by: string | null;
  created_at: string;
}

interface CalibrationPoint {
  stratum: string;
  trueClass: string;
  trueProbability: number;
  nonconformityScore: number;
  importanceWeight: number;
}

/**
 * Compute nonconformity score
 * Simple implementation: 1 - confidence (higher confidence = lower score)
 */
function computeNonconformityScore(confidence: number, trueClass: string, predictedClass: string): number {
  if (trueClass === predictedClass) {
    return 1 - (confidence / 100); // Lower score for correct predictions
  }
  return 1.0; // Maximum score for incorrect predictions
}

/**
 * Determine stratum from assessment context
 * Enhanced to include damage category for better stratification
 */
function determineStratum(assessment: AssessmentRecord): string {
  const data = assessment.assessment_data;
  const propertyType = data?.context?.propertyType || 'residential';
  const propertyAge = data?.context?.ageOfProperty || 50;
  const region = data?.context?.location || 'unknown';
  const damageType = assessment.damage_type || 'cosmetic';

  // Age binning
  let ageBin = '50-100';
  if (propertyAge < 20) ageBin = '0-20';
  else if (propertyAge < 50) ageBin = '20-50';
  else if (propertyAge < 100) ageBin = '50-100';
  else ageBin = '100+';

  // Normalize damage category
  const damageCategory = normalizeDamageCategory(damageType);

  // Enhanced stratum: property_type_ageBin_region_damageCategory
  return `${propertyType}_${ageBin}_${region}_${damageCategory}`;
}

/**
 * Normalize damage category for stratification
 */
function normalizeDamageCategory(damageType: string): string {
  const normalized = damageType.toLowerCase().trim();
  
  if (normalized.includes('structural') || normalized.includes('foundation')) {
    return 'structural';
  }
  if (normalized.includes('water') || normalized.includes('leak') || normalized.includes('flood')) {
    return 'water_damage';
  }
  if (normalized.includes('electrical') || normalized.includes('wiring')) {
    return 'electrical';
  }
  if (normalized.includes('mold') || normalized.includes('fungus')) {
    return 'mold';
  }
  if (normalized.includes('pest') || normalized.includes('termite') || normalized.includes('rodent')) {
    return 'pest';
  }
  if (normalized.includes('fire') || normalized.includes('smoke')) {
    return 'fire';
  }
  if (normalized.includes('roof') || normalized.includes('siding') || normalized.includes('exterior')) {
    return 'exterior';
  }
  
  return 'cosmetic';
}

/**
 * Get true class from validated assessment
 */
function getTrueClass(assessment: AssessmentRecord): string | null {
  // If validated, use validated damage type (if available in validation notes)
  // Otherwise, use the assessment's damage_type as ground truth
  if (assessment.validation_status === 'validated' && assessment.validated_by) {
    return assessment.damage_type; // Assume validated = correct
  }
  
  // For rejected assessments, we can't use them as calibration
  if (assessment.validation_status === 'rejected') {
    return null;
  }

  // For auto-validated high-confidence assessments, use as ground truth
  if (assessment.validation_status === 'validated' && !assessment.validated_by) {
    return assessment.damage_type;
  }

  return null;
}

/**
 * Main population function
 */
async function populateCalibrationData() {
  try {
    logger.info('Starting calibration data population...');

    // 1. Fetch validated assessments
    const { data: assessments, error: fetchError } = await serverSupabase
      .from('building_assessments')
      .select('id, damage_type, severity, confidence, assessment_data, validation_status, validated_by, created_at')
      .in('validation_status', ['validated'])
      .not('damage_type', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10000); // Process in batches

    if (fetchError) {
      throw new Error(`Failed to fetch assessments: ${fetchError.message}`);
    }

    if (!assessments || assessments.length === 0) {
      logger.warn('No validated assessments found. Cannot populate calibration data.');
      logger.info('Tip: Validate some assessments first, then re-run this script.');
      return;
    }

    logger.info(`Found ${assessments.length} validated assessments`);

    // 2. Process assessments into calibration points
    const calibrationPoints: CalibrationPoint[] = [];
    let processed = 0;
    let skipped = 0;

    for (const assessment of assessments) {
      const trueClass = getTrueClass(assessment as AssessmentRecord);
      
      if (!trueClass) {
        skipped++;
        continue;
      }

      const stratum = determineStratum(assessment as AssessmentRecord);
      const predictedClass = assessment.damage_type;
      const confidence = assessment.confidence || 50;
      
      const nonconformityScore = computeNonconformityScore(
        confidence,
        trueClass,
        predictedClass
      );

      // True probability is the confidence normalized
      const trueProbability = confidence / 100;

      calibrationPoints.push({
        stratum,
        trueClass,
        trueProbability,
        nonconformityScore,
        importanceWeight: 1.0, // Default weight (can be adjusted for domain shift)
      });

      processed++;
    }

    logger.info(`Processed ${processed} assessments, skipped ${skipped}`);

    if (calibrationPoints.length === 0) {
      logger.warn('No calibration points generated. Check validation status.');
      return;
    }

    // 3. Insert calibration data in batches
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < calibrationPoints.length; i += batchSize) {
      const batch = calibrationPoints.slice(i, i + batchSize);
      
      const insertData = batch.map(point => ({
        stratum: point.stratum,
        true_class: point.trueClass,
        true_probability: point.trueProbability.toString(),
        nonconformity_score: point.nonconformityScore.toString(),
        importance_weight: point.importanceWeight.toString(),
      }));

      const { error: insertError } = await serverSupabase
        .from('ab_calibration_data')
        .insert(insertData);

      if (insertError) {
        logger.error(`Failed to insert batch ${i / batchSize + 1}:`, insertError);
        continue;
      }

      inserted += batch.length;
      logger.info(`Inserted batch ${i / batchSize + 1}/${Math.ceil(calibrationPoints.length / batchSize)} (${inserted}/${calibrationPoints.length})`);
    }

    // 4. Summary statistics
    const { data: stats } = await serverSupabase
      .from('ab_calibration_data')
      .select('stratum')
      .limit(10000);

    const stratumCounts = new Map<string, number>();
    stats?.forEach(s => {
      stratumCounts.set(s.stratum, (stratumCounts.get(s.stratum) || 0) + 1);
    });

    logger.info('\n✅ Calibration data population complete!');
    logger.info(`Total calibration points: ${inserted}`);
    logger.info(`Unique strata: ${stratumCounts.size}`);
    logger.info('\nStratum distribution:');
    Array.from(stratumCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([stratum, count]) => {
        logger.info(`  ${stratum}: ${count} points`);
      });

  } catch (error) {
    logger.error('Error populating calibration data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  populateCalibrationData()
    .then(() => {
      logger.info('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Script failed:', error);
      process.exit(1);
    });
}

export { populateCalibrationData };

