/**
 * Populate Calibration Data from Ground Truth
 * 
 * Populates ab_calibration_data from shadow mode assessments with ground truth labels.
 * Computes nonconformity scores and true probabilities for Mondrian conformal prediction.
 * 
 * Usage: npx tsx scripts/populate-calibration-data-from-ground-truth.ts
 */

// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import { ContextFeatureService } from '../apps/web/lib/services/building-surveyor/ContextFeatureService';
import { normalizeDamageCategory, normalizePropertyType, getCurrentSeason } from '../apps/web/lib/services/building-surveyor/normalization-utils';

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

interface AssessmentRecord {
  id: string;
  shadow_mode: boolean;
  true_class: string;
  critical_hazard: boolean;
  raw_probability: number;
  fusion_variance: number;
  context_features: any;
  property_type?: string;
  property_age?: number;
  region?: string;
  created_at: string;
}

interface CalibrationPoint {
  stratum: string;
  true_class: string;
  true_probability: number;
  nonconformity_score: number;
  importance_weight: number;
  created_at: string;
}

/**
 * Determine stratum from assessment context
 */
function determineStratum(assessment: AssessmentRecord): string {
  const propertyType = normalizePropertyType(assessment.property_type || 'residential');
  const propertyAge = assessment.property_age || 50;
  const region = assessment.region || 'unknown';
  const season = getCurrentSeason();

  // Build stratum: propertyType_propertyAgeBin_season
  // Property age bins: 0-20, 20-50, 50-100, 100+
  let ageBin = '50-100';
  if (propertyAge < 20) ageBin = '0-20';
  else if (propertyAge < 50) ageBin = '20-50';
  else if (propertyAge < 100) ageBin = '50-100';
  else ageBin = '100+';

  return `${propertyType}_${ageBin}_${season}`;
}

/**
 * Compute true probability from ground truth
 */
function computeTrueProbability(trueClass: string, criticalHazard: boolean): number {
  const normalized = trueClass.toLowerCase().trim();
  
  // Critical hazards always have high probability
  if (criticalHazard) {
    return 1.0;
  }

  // Safe = 0.0
  if (normalized === 'safe' || normalized === 'none' || normalized === 'no damage') {
    return 0.0;
  }

  // Damage (not critical) = 0.8
  return 0.8;
}

/**
 * Compute nonconformity score
 */
function computeNonconformityScore(trueProbability: number): number {
  // Nonconformity = 1 - true_probability
  // Higher nonconformity = model was wrong
  return 1 - trueProbability;
}

/**
 * Main population function
 */
async function populateCalibrationData() {
  try {
    logger.info('Starting calibration data population from ground truth...');

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

    // Process assessments into calibration points
    const calibrationPoints: CalibrationPoint[] = [];
    let processed = 0;
    let skipped = 0;
    const stratumStats: Record<string, number> = {};

    for (const assessment of assessments as AssessmentRecord[]) {
      try {
        const stratum = determineStratum(assessment);
        const trueProbability = computeTrueProbability(assessment.true_class, assessment.critical_hazard || false);
        const nonconformityScore = computeNonconformityScore(trueProbability);

        calibrationPoints.push({
          stratum,
          true_class: assessment.true_class,
          true_probability: trueProbability,
          nonconformity_score: nonconformityScore,
          importance_weight: 1.0, // Default weight
          created_at: assessment.created_at || new Date().toISOString(),
        });

        // Track stratum statistics
        stratumStats[stratum] = (stratumStats[stratum] || 0) + 1;
        processed++;
      } catch (error) {
        logger.warn(`Failed to process assessment ${assessment.id}`, { error });
        skipped++;
      }
    }

    logger.info(`Processed ${processed} assessments, skipped ${skipped}`);

    if (calibrationPoints.length === 0) {
      logger.warn('No valid calibration points generated.');
      return;
    }

    // Batch insert calibration points (1000 at a time)
    const batchSize = 1000;
    let inserted = 0;

    for (let i = 0; i < calibrationPoints.length; i += batchSize) {
      const batch = calibrationPoints.slice(i, i + batchSize);

      const { error: insertError } = await serverSupabase
        .from('ab_calibration_data')
        .insert(batch);

      if (insertError) {
        // Check if it's a duplicate key error (ignore)
        if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
          logger.debug(`Skipped ${batch.length} duplicate calibration points`);
        } else {
          throw new Error(`Failed to insert calibration data: ${insertError.message}`);
        }
      } else {
        inserted += batch.length;
      }
    }

    logger.info(`✓ Inserted ${inserted} calibration points`);

    // Print summary statistics
    console.log('\n📊 Calibration Data Summary:');
    console.log(`   Total points: ${inserted}`);
    console.log(`   Strata: ${Object.keys(stratumStats).length}`);
    console.log('\n   Per Stratum:');
    for (const [stratum, count] of Object.entries(stratumStats)) {
      console.log(`   - ${stratum}: ${count} points`);
    }

    // Query final statistics from database
    const { data: finalStats } = await serverSupabase
      .from('ab_calibration_data')
      .select('stratum, nonconformity_score')
      .order('stratum');

    if (finalStats) {
      const avgNonconformity: Record<string, number[]> = {};
      for (const point of finalStats) {
        if (!avgNonconformity[point.stratum]) {
          avgNonconformity[point.stratum] = [];
        }
        avgNonconformity[point.stratum].push(point.nonconformity_score);
      }

      console.log('\n   Average Nonconformity Scores:');
      for (const [stratum, scores] of Object.entries(avgNonconformity)) {
        const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        console.log(`   - ${stratum}: ${avg.toFixed(4)}`);
      }
    }

  } catch (error) {
    logger.error('Calibration data population failed', { error });
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await populateCalibrationData();
    console.log('\n✅ Calibration data population completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Population failed:', error);
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

