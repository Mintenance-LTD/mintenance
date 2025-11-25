/**
 * Warm Up Critic Script
 * 
 * Pre-trains the Safe-LUCB Critic using shadow mode assessments with ground truth labels.
 * Simulates decisions and updates the critic with feedback to prevent "cold start" problem.
 * 
 * Usage: npx tsx scripts/warm-up-critic.ts
 */

// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import { CriticModule } from '../apps/web/lib/services/building-surveyor/critic';
import { normalizePropertyType, getSafetyThreshold } from '../apps/web/lib/services/building-surveyor/normalization-utils';

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
  predicted_class?: string;
  raw_probability?: number;
  fusion_variance?: number;
  context_features: any;
  property_type?: string;
  created_at: string;
}

/**
 * Compute reward from ground truth
 * 
 * Reward = 1 if decision was correct, 0 if incorrect
 * - Automate + Correct (true_class != 'Safe' and not critical) = +1
 * - Automate + Missed Critical = -10 (massive penalty)
 * - Escalate + Correct = +0.5 (conservative but correct)
 * - Escalate + Unnecessary = 0 (no penalty, but no reward)
 */
function computeReward(
  decision: 'automate' | 'escalate',
  trueClass: string,
  criticalHazard: boolean,
  predictedClass?: string
): number {
  const isDamage = trueClass.toLowerCase().trim() !== 'safe' && 
                   trueClass.toLowerCase().trim() !== 'none' &&
                   trueClass.toLowerCase().trim() !== 'no damage';

  if (decision === 'automate') {
    // Automate decision
    if (criticalHazard) {
      // Missed critical hazard = massive penalty
      return -10;
    }
    if (isDamage && predictedClass && predictedClass.toLowerCase().includes(trueClass.toLowerCase())) {
      // Correctly automated damage detection = reward
      return 1;
    }
    if (!isDamage && (!predictedClass || predictedClass.toLowerCase().includes('safe'))) {
      // Correctly automated safe assessment = reward
      return 1;
    }
    // Incorrect automation = penalty
    return -1;
  } else {
    // Escalate decision
    if (criticalHazard) {
      // Correctly escalated critical hazard = reward (conservative)
      return 0.5;
    }
    if (isDamage) {
      // Correctly escalated damage = small reward (conservative)
      return 0.3;
    }
    // Unnecessary escalation = no penalty, no reward
    return 0;
  }
}

/**
 * Check if safety violation occurred
 * 
 * Safety violation = False Negative (automated when should have escalated)
 * Specifically: automated a critical hazard
 */
function checkSafetyViolation(
  decision: 'automate' | 'escalate',
  criticalHazard: boolean
): boolean {
  return decision === 'automate' && criticalHazard;
}

/**
 * Simulate decision using current critic state
 */
async function simulateDecision(
  assessment: AssessmentRecord,
  context: number[]
): Promise<'automate' | 'escalate'> {
  try {
    // Determine safety threshold based on property type
    const propertyType = normalizePropertyType(assessment.property_type || 'residential');
    const safetyThreshold = getSafetyThreshold(propertyType);

    // Determine stratum (simplified, using property type)
    const stratum = propertyType;

    // Call critic to get decision
    const decision = await CriticModule.selectArm({
      context,
      deltaSafety: safetyThreshold,
      stratum,
      criticalHazardDetected: assessment.critical_hazard || false,
    });

    return decision.arm;
  } catch (error) {
    logger.warn(`Failed to simulate decision for assessment ${assessment.id}`, { error });
    // Default to escalate on error (conservative)
    return 'escalate';
  }
}

/**
 * Main warm-up function
 */
async function warmUpCritic() {
  try {
    logger.info('Starting critic warm-up...');

    // Query shadow mode assessments with ground truth
    const { data: assessments, error: fetchError } = await serverSupabase
      .from('building_assessments')
      .select('*')
      .eq('shadow_mode', true)
      .not('true_class', 'is', null)
      .not('context_features', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000); // Process up to 1000 assessments

    if (fetchError) {
      throw new Error(`Failed to fetch assessments: ${fetchError.message}`);
    }

    if (!assessments || assessments.length === 0) {
      logger.warn('No shadow mode assessments with ground truth found.');
      logger.info('Tip: Run shadow mode batch script first to generate training data.');
      return;
    }

    logger.info(`Found ${assessments.length} shadow mode assessments`);

    // Process assessments and update critic
    let processed = 0;
    let skipped = 0;
    const decisionStats = {
      automate: 0,
      escalate: 0,
      correct: 0,
      incorrect: 0,
      safetyViolations: 0,
    };

    for (const assessment of assessments as AssessmentRecord[]) {
      try {
        // Extract context vector from stored context_features
        const contextFeatures = assessment.context_features;
        if (!contextFeatures || !Array.isArray(contextFeatures)) {
          skipped++;
          continue;
        }

        // Simulate decision using current critic state
        const decision = await simulateDecision(assessment, contextFeatures);

        // Compute reward and safety violation from ground truth
        const reward = computeReward(
          decision,
          assessment.true_class,
          assessment.critical_hazard || false,
          assessment.predicted_class
        );
        const safetyViolation = checkSafetyViolation(
          decision,
          assessment.critical_hazard || false
        );

        // Update critic with feedback
        await CriticModule.updateFromFeedback({
          context: contextFeatures,
          arm: decision,
          reward,
          safetyViolation,
        });

        // Track statistics
        if (decision === 'automate') decisionStats.automate++;
        else decisionStats.escalate++;

        if (reward > 0) decisionStats.correct++;
        else if (reward < 0) decisionStats.incorrect++;

        if (safetyViolation) decisionStats.safetyViolations++;

        processed++;

        // Log progress every 100 assessments
        if (processed % 100 === 0) {
          logger.info(`Processed ${processed}/${assessments.length} assessments...`);
        }

        // Small delay to avoid overwhelming the database
        if (processed < assessments.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      } catch (error) {
        logger.warn(`Failed to process assessment ${assessment.id}`, { error });
        skipped++;
      }
    }

    logger.info(`✓ Processed ${processed} assessments, skipped ${skipped}`);

    // Print summary statistics
    console.log('\n📊 Critic Warm-Up Summary:');
    console.log(`   Total processed: ${processed}`);
    console.log(`   Decisions:`);
    console.log(`   - Automate: ${decisionStats.automate} (${((decisionStats.automate / processed) * 100).toFixed(1)}%)`);
    console.log(`   - Escalate: ${decisionStats.escalate} (${((decisionStats.escalate / processed) * 100).toFixed(1)}%)`);
    console.log(`   Outcomes:`);
    console.log(`   - Correct: ${decisionStats.correct} (${((decisionStats.correct / processed) * 100).toFixed(1)}%)`);
    console.log(`   - Incorrect: ${decisionStats.incorrect} (${((decisionStats.incorrect / processed) * 100).toFixed(1)}%)`);
    console.log(`   - Safety Violations: ${decisionStats.safetyViolations} (${((decisionStats.safetyViolations / processed) * 100).toFixed(1)}%)`);

    // Verify critic models were updated
    const { data: models } = await serverSupabase
      .from('ab_critic_models')
      .select('stratum, n_observations')
      .order('stratum');

    if (models && models.length > 0) {
      console.log('\n   Critic Models Updated:');
      for (const model of models) {
        console.log(`   - ${model.stratum}: ${model.n_observations} observations`);
      }
    }

  } catch (error) {
    logger.error('Critic warm-up failed', { error });
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await warmUpCritic();
    console.log('\n✅ Critic warm-up completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Warm-up failed:', error);
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

