/**
 * Monitor A/B Test Metrics (Simple Version)
 * 
 * Direct database queries without importing web app modules
 * 
 * Usage: npx tsx scripts/monitor-ab-test-metrics-simple.ts
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
  process.exit(1);
}

const serverSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const AB_TEST_EXPERIMENT_ID = process.env.AB_TEST_EXPERIMENT_ID;

async function monitorMetrics() {
  try {
    if (!AB_TEST_EXPERIMENT_ID) {
      console.error('❌ AB_TEST_EXPERIMENT_ID not set in environment');
      process.exit(1);
    }

    console.log('📊 A/B Test Metrics Monitor\n');
    console.log(`Experiment ID: ${AB_TEST_EXPERIMENT_ID}\n`);

    // Get decision counts
    const { data: decisions } = await serverSupabase
      .from('ab_decisions')
      .select('decision, decision_time_ms')
      .eq('experiment_id', AB_TEST_EXPERIMENT_ID);

    const totalDecisions = decisions?.length || 0;
    const automatedCount = decisions?.filter(d => d.decision === 'automate').length || 0;
    const escalatedCount = decisions?.filter(d => d.decision === 'escalate').length || 0;

    const automationRate = totalDecisions > 0 ? (automatedCount / totalDecisions) * 100 : 0;
    const escalationRate = totalDecisions > 0 ? (escalatedCount / totalDecisions) * 100 : 0;

    // Get SFN rate
    const { data: outcomes } = await serverSupabase
      .from('ab_outcomes')
      .select('sfn')
      .eq('experiment_id', AB_TEST_EXPERIMENT_ID);

    const totalOutcomes = outcomes?.length || 0;
    const sfnCount = outcomes?.filter(o => o.sfn === true).length || 0;
    const sfnRate = totalOutcomes > 0 ? (sfnCount / totalOutcomes) * 100 : 0;

    // Get calibration data count
    const { count: calibrationCount } = await serverSupabase
      .from('ab_calibration_data')
      .select('*', { count: 'exact', head: true });

    // Get historical validations count
    const { count: historicalCount } = await serverSupabase
      .from('ab_historical_validations')
      .select('*', { count: 'exact', head: true });

    // Get critic model observations
    const { data: criticModel } = await serverSupabase
      .from('ab_critic_models')
      .select('parameters')
      .eq('model_type', 'safe_lucb')
      .single();

    const criticObservations = criticModel?.parameters?.n || 0;

    console.log('📈 Current Metrics:');
    console.log('─────────────────────────────────────────');
    console.log(`Total Decisions:        ${totalDecisions}`);
    console.log(`Automation Rate:        ${automationRate.toFixed(2)}%`);
    console.log(`Escalation Rate:        ${escalationRate.toFixed(2)}%`);
    console.log(`SFN Rate:               ${sfnRate.toFixed(4)}%`);
    console.log(`Calibration Points:     ${calibrationCount || 0}`);
    console.log(`Historical Validations: ${historicalCount || 0}`);
    console.log(`Critic Observations:    ${criticObservations}`);
    console.log('');

    // Recommendations
    console.log('💡 Recommendations:');
    console.log('─────────────────────────────────────────');
    
    if ((calibrationCount || 0) < 100) {
      console.log('  ⚠️  Low calibration data - run populate-ab-test-calibration-data.ts');
    }
    
    if ((historicalCount || 0) < 1000) {
      console.log('  ⚠️  Low historical validations - need more validated assessments');
    }
    
    if (criticObservations < 100) {
      console.log('  ⚠️  Critic model needs more observations - validate more assessments');
    }
    
    if (sfnRate > 0.1) {
      console.log('  ⚠️  SFN rate is high - review safety-critical assessments');
    }

    if (totalDecisions === 0) {
      console.log('  ℹ️  No A/B test decisions yet - assessments will start logging when A/B test is enabled');
    }

    console.log('\n✅ Monitoring complete');

  } catch (error) {
    logger.error('Error monitoring metrics', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  monitorMetrics()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Script failed:', error);
      process.exit(1);
    });
}

export { monitorMetrics };

