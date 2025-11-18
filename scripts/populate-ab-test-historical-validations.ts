/**
 * Populate A/B Test Historical Validations
 * 
 * Extracts validated assessments to build seed safe set
 * (contexts with SFN=0 over n≥1000, Wilson upper ≤0.5%)
 * 
 * Usage: npx tsx scripts/populate-ab-test-historical-validations.ts
 */

// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { logger, hashString } from '@mintenance/shared';

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
  assessment_data: any;
  validation_status: string;
  validated_by: string | null;
  created_at: string;
}

interface HistoricalValidation {
  contextHash: string;
  propertyType: string;
  propertyAgeBin: string;
  region: string;
  sfn: boolean;
  validatedAt: string;
}

/**
 * Determine age bin
 */
function getAgeBin(age: number): string {
  if (age < 20) return '0-20';
  if (age < 50) return '20-50';
  if (age < 100) return '50-100';
  return '100+';
}

/**
 * Compute context hash from assessment
 */
function computeContextHash(assessment: AssessmentRecord): string {
  const data = assessment.assessment_data;
  const propertyType = data?.context?.propertyType || 'residential';
  const propertyAge = data?.context?.ageOfProperty || 50;
  const region = data?.context?.location || 'unknown';
  const ageBin = getAgeBin(propertyAge);

  // Create hashable string
  const contextString = `${propertyType}_${ageBin}_${region}`;
  return hashString(contextString).toString();
}

/**
 * Determine if assessment had SFN (Safety False Negative)
 * SFN = missed critical hazard that should have been caught
 */
function determineSFN(assessment: AssessmentRecord): boolean {
  // SFN occurs if:
  // 1. Assessment was validated as incorrect (rejected)
  // 2. AND the actual damage was safety-critical
  // 3. AND the AI missed it (low confidence or wrong type)

  if (assessment.validation_status === 'rejected') {
    // Check if damage type is safety-critical
    const criticalTypes = [
      'structural_failure',
      'electrical_hazard',
      'fire_hazard',
      'asbestos',
      'mold_toxicity',
    ];

    const damageType = assessment.damage_type?.toLowerCase() || '';
    const isCritical = criticalTypes.some(type => damageType.includes(type));

    // If it's critical and was rejected, likely SFN
    if (isCritical) {
      return true;
    }
  }

  // For validated assessments, assume no SFN (human expert confirmed)
  if (assessment.validation_status === 'validated') {
    return false;
  }

  // Default: no SFN (conservative)
  return false;
}

/**
 * Main population function
 */
async function populateHistoricalValidations() {
  try {
    logger.info('Starting historical validations population...');

    // 1. Fetch all validated assessments (both validated and rejected)
    const { data: assessments, error: fetchError } = await serverSupabase
      .from('building_assessments')
      .select('id, damage_type, severity, assessment_data, validation_status, validated_by, created_at')
      .in('validation_status', ['validated', 'rejected'])
      .not('damage_type', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50000); // Process large batch

    if (fetchError) {
      throw new Error(`Failed to fetch assessments: ${fetchError.message}`);
    }

    if (!assessments || assessments.length === 0) {
      logger.warn('No validated/rejected assessments found.');
      logger.info('Tip: Validate or reject some assessments first, then re-run this script.');
      return;
    }

    logger.info(`Found ${assessments.length} validated/rejected assessments`);

    // 2. Process assessments into historical validations
    const validations: HistoricalValidation[] = [];
    let processed = 0;
    let skipped = 0;

    for (const assessment of assessments) {
      const data = assessment.assessment_data;
      const propertyType = data?.context?.propertyType || 'residential';
      const propertyAge = data?.context?.ageOfProperty || 50;
      const region = data?.context?.location || 'unknown';
      const ageBin = getAgeBin(propertyAge);

      const contextHash = computeContextHash(assessment as AssessmentRecord);
      const sfn = determineSFN(assessment as AssessmentRecord);

      // Use validation date or creation date
      const validatedAt = assessment.validated_by 
        ? new Date(assessment.created_at).toISOString() // Use created_at as proxy
        : new Date(assessment.created_at).toISOString();

      validations.push({
        contextHash,
        propertyType,
        propertyAgeBin: ageBin,
        region,
        sfn,
        validatedAt,
      });

      processed++;
    }

    logger.info(`Processed ${processed} assessments`);

    if (validations.length === 0) {
      logger.warn('No validations generated.');
      return;
    }

    // 3. Insert validations in batches
    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < validations.length; i += batchSize) {
      const batch = validations.slice(i, i + batchSize);
      
      const insertData = batch.map(v => ({
        context_hash: v.contextHash,
        property_type: v.propertyType,
        property_age_bin: v.propertyAgeBin,
        region: v.region,
        sfn: v.sfn,
        validated_at: v.validatedAt,
      }));

      const { error: insertError } = await serverSupabase
        .from('ab_historical_validations')
        .insert(insertData);

      if (insertError) {
        logger.error(`Failed to insert batch ${i / batchSize + 1}:`, insertError);
        continue;
      }

      inserted += batch.length;
      logger.info(`Inserted batch ${i / batchSize + 1}/${Math.ceil(validations.length / batchSize)} (${inserted}/${validations.length})`);
    }

    // 4. Summary statistics
    const { data: stats } = await serverSupabase
      .from('ab_historical_validations')
      .select('sfn, property_type, property_age_bin, region')
      .limit(10000);

    const totalCount = stats?.length || 0;
    const sfnCount = stats?.filter(s => s.sfn === true).length || 0;
    const sfnRate = totalCount > 0 ? (sfnCount / totalCount) * 100 : 0;

    // Count by context
    const contextCounts = new Map<string, { total: number; sfn: number }>();
    stats?.forEach(s => {
      const key = `${s.property_type}_${s.property_age_bin}_${s.region}`;
      const current = contextCounts.get(key) || { total: 0, sfn: 0 };
      contextCounts.set(key, {
        total: current.total + 1,
        sfn: current.sfn + (s.sfn ? 1 : 0),
      });
    });

    logger.info('\n✅ Historical validations population complete!');
    logger.info(`Total validations: ${inserted}`);
    logger.info(`SFN count: ${sfnCount} (${sfnRate.toFixed(4)}%)`);
    logger.info(`Unique contexts: ${contextCounts.size}`);
    
    // Find contexts with n≥1000 and SFN=0 (seed safe set candidates)
    const safeSetCandidates = Array.from(contextCounts.entries())
      .filter(([_, counts]) => counts.total >= 1000 && counts.sfn === 0)
      .sort((a, b) => b[1].total - a[1].total);

    logger.info(`\nSeed Safe Set Candidates (n≥1000, SFN=0): ${safeSetCandidates.length}`);
    safeSetCandidates.slice(0, 10).forEach(([context, counts]) => {
      logger.info(`  ${context}: ${counts.total} validations, SFN=0`);
    });

    if (safeSetCandidates.length === 0) {
      logger.warn('\n⚠️  No seed safe set candidates found.');
      logger.warn('   Need at least 1000 validations per context with SFN=0');
      logger.warn('   Continue collecting validated assessments.');
    }

  } catch (error) {
    logger.error('Error populating historical validations:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  populateHistoricalValidations()
    .then(() => {
      logger.info('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Script failed:', error);
      process.exit(1);
    });
}

export { populateHistoricalValidations };

