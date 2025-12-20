/**
 * Monitor A/B Test Metrics
 * 
 * Script to check current A/B test metrics and coverage violations
 * 
 * Usage: npx tsx scripts/monitor-ab-test-metrics.ts
 */

// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
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

const AB_TEST_EXPERIMENT_ID = process.env.AB_TEST_EXPERIMENT_ID;

interface Metrics {
  automationRate: number;
  escalationRate: number;
  sfnRate: number;
  averageDecisionTime: number;
  coverageRate: number;
  calibrationDataPoints: number;
  historicalValidations: number;
  seedSafeSetSize: number;
  criticModelObservations: number;
}

interface CoverageViolation {
  stratum: string;
  expectedCoverage: number;
  actualCoverage: number;
  violation: number;
  sampleSize: number;
}

async function getMetrics(experimentId: string): Promise<Metrics> {
  if (!experimentId || experimentId.trim() === '') {
    throw new Error('Invalid experiment ID: cannot be empty');
  }

  // Get decision counts
  const { data: decisions, error: decisionsError } = await serverSupabase
    .from('ab_decisions')
    .select('decision, decision_time_ms')
    .eq('experiment_id', experimentId);

  if (decisionsError) {
    throw new Error(`Failed to fetch decisions: ${decisionsError.message}`);
  }

  const totalDecisions = decisions?.length || 0;
  const automatedCount = decisions?.filter(d => d.decision === 'automate').length || 0;
  const escalatedCount = decisions?.filter(d => d.decision === 'escalate').length || 0;

  const automationRate = totalDecisions > 0 ? (automatedCount / totalDecisions) * 100 : 0;
  const escalationRate = totalDecisions > 0 ? (escalatedCount / totalDecisions) * 100 : 0;

  // Calculate average decision time
  const avgDecisionTime = decisions && decisions.length > 0
    ? decisions.reduce((sum, d) => sum + (d.decision_time_ms || 0), 0) / decisions.length / 1000
    : 0;

  // Get SFN rate from outcomes
  const { data: outcomes, error: outcomesError } = await serverSupabase
    .from('ab_outcomes')
    .select('sfn')
    .eq('experiment_id', experimentId);

  if (outcomesError) {
    logger.warn('Failed to fetch outcomes, SFN rate will be 0', { error: outcomesError.message });
  }

  const totalOutcomes = outcomes?.length || 0;
  const sfnCount = outcomes?.filter(o => o.sfn === true).length || 0;
  const sfnRate = totalOutcomes > 0 ? (sfnCount / totalOutcomes) * 100 : 0;

  // Get coverage rate
  const { data: coverageOutcomes, error: coverageError } = await serverSupabase
    .from('ab_outcomes')
    .select('true_class, cp_prediction_set')
    .eq('experiment_id', experimentId)
    .limit(1000);

  if (coverageError) {
    logger.warn('Failed to fetch coverage outcomes, coverage rate will be 0', { error: coverageError.message });
  }

  let coverageRate = 0;
  if (coverageOutcomes && coverageOutcomes.length > 0) {
    let covered = 0;
    for (const outcome of coverageOutcomes) {
      const trueClass = outcome.true_class;
      const predictionSet = outcome.cp_prediction_set || [];
      if (predictionSet.includes(trueClass)) {
        covered += 1;
      }
    }
    coverageRate = (covered / coverageOutcomes.length) * 100;
  }

  // Get calibration data count
  const { count: calibrationCount, error: calibrationError } = await serverSupabase
    .from('ab_calibration_data')
    .select('*', { count: 'exact', head: true });

  if (calibrationError) {
    logger.warn('Failed to fetch calibration data count', { error: calibrationError.message });
  }

  // Get historical validations count
  const { count: historicalCount, error: historicalError } = await serverSupabase
    .from('ab_historical_validations')
    .select('*', { count: 'exact', head: true });

  if (historicalError) {
    logger.warn('Failed to fetch historical validations count', { error: historicalError.message });
  }

  // Get seed safe set size
  const { data: validations, error: validationsError } = await serverSupabase
    .from('ab_historical_validations')
    .select('property_type, property_age_bin, region, sfn')
    .limit(10000);

  if (validationsError) {
    logger.warn('Failed to fetch historical validations for seed safe set', { error: validationsError.message });
  }

  let seedSafeSetSize = 0;
  if (validations && validations.length > 0) {
    const contextGroups = new Map<string, { total: number; sfn: number }>();
    for (const v of validations) {
      const key = `${v.property_type}_${v.property_age_bin}_${v.region}`;
      const group = contextGroups.get(key) || { total: 0, sfn: 0 };
      group.total += 1;
      if (v.sfn === true) {
        group.sfn += 1;
      }
      contextGroups.set(key, group);
    }

    for (const [_, group] of contextGroups.entries()) {
      if (group.total >= 1000 && group.sfn === 0) {
        seedSafeSetSize += 1;
      }
    }
  }

  // Get critic model observations
  const { data: criticModel, error: criticError } = await serverSupabase
    .from('ab_critic_models')
    .select('parameters')
    .eq('model_type', 'safe_lucb')
    .single();

  if (criticError && criticError.code !== 'PGRST116') { // PGRST116 = no rows returned
    logger.warn('Failed to fetch critic model', { error: criticError.message });
  }

  const criticObservations = criticModel?.parameters?.n || 0;

  return {
    automationRate,
    escalationRate,
    sfnRate,
    averageDecisionTime: avgDecisionTime,
    coverageRate,
    calibrationDataPoints: calibrationCount || 0,
    historicalValidations: historicalCount || 0,
    seedSafeSetSize,
    criticModelObservations: criticObservations,
  };
}

async function getCoverageViolations(expectedCoverage: number = 0.90): Promise<CoverageViolation[]> {
  const { data: outcomes, error: outcomesError } = await serverSupabase
    .from('ab_outcomes')
    .select('cp_stratum, true_class, cp_prediction_set')
    .limit(1000);

  if (outcomesError) {
    logger.error('Failed to fetch outcomes for coverage violations', { error: outcomesError.message });
    return [];
  }

  if (!outcomes || outcomes.length === 0) {
    return [];
  }

  const stratumGroups = new Map<string, { total: number; covered: number }>();

  for (const outcome of outcomes) {
    const stratum = outcome.cp_stratum || 'global';
    const trueClass = outcome.true_class;
    const predictionSet = outcome.cp_prediction_set || [];

    const group = stratumGroups.get(stratum) || { total: 0, covered: 0 };
    group.total += 1;
    if (predictionSet.includes(trueClass)) {
      group.covered += 1;
    }
    stratumGroups.set(stratum, group);
  }

  const violations: CoverageViolation[] = [];
  for (const [stratum, group] of stratumGroups.entries()) {
    const actualCoverage = group.total > 0 ? group.covered / group.total : 0;
    const violation = expectedCoverage - actualCoverage;

    if (violation > 0.05) {
      violations.push({
        stratum,
        expectedCoverage,
        actualCoverage,
        violation,
        sampleSize: group.total,
      });
    }
  }

  return violations.sort((a, b) => b.violation - a.violation);
}

async function getAutomationRateOverTime(experimentId: string, days: number = 7): Promise<Array<{ date: string; rate: number }>> {
  if (!experimentId || experimentId.trim() === '') {
    throw new Error('Invalid experiment ID: cannot be empty');
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startTimeMs = startDate.getTime();

  const { data: decisions, error: decisionsError } = await serverSupabase
    .from('ab_decisions')
    .select('decision, decision_time_ms')
    .eq('experiment_id', experimentId)
    .gte('decision_time_ms', startTimeMs);

  if (decisionsError) {
    logger.error('Failed to fetch decisions for automation rate over time', { error: decisionsError.message });
    return [];
  }

  if (!decisions || decisions.length === 0) {
    return [];
  }

  const dailyGroups = new Map<string, { total: number; automated: number }>();

  for (const decision of decisions) {
    // Handle both timestamp formats: milliseconds (INTEGER) or ISO string
    let timestampMs: number;
    if (typeof decision.decision_time_ms === 'number') {
      timestampMs = decision.decision_time_ms;
    } else if (typeof decision.decision_time_ms === 'string') {
      timestampMs = new Date(decision.decision_time_ms).getTime();
    } else {
      logger.warn('Invalid decision_time_ms format, skipping decision', { decision_time_ms: decision.decision_time_ms });
      continue;
    }

    const date = new Date(timestampMs).toISOString().split('T')[0];
    const group = dailyGroups.get(date) || { total: 0, automated: 0 };
    group.total += 1;
    if (decision.decision === 'automate') {
      group.automated += 1;
    }
    dailyGroups.set(date, group);
  }

  return Array.from(dailyGroups.entries())
    .map(([date, group]) => ({
      date,
      rate: group.total > 0 ? (group.automated / group.total) * 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Import alerting service logic (simplified for standalone script)
async function checkAlerts(experimentId: string): Promise<{
  hasAlerts: boolean;
  critical: number;
  warning: number;
  info: number;
  alerts: Array<{ severity: string; type: string; message: string }>;
}> {
  const metrics = await getMetrics(experimentId);
  const alerts: Array<{ severity: string; type: string; message: string }> = [];

  // Check SFN rate (CRITICAL)
  if (metrics.sfnRate > 0.1) {
    alerts.push({
      severity: 'critical',
      type: 'sfn_rate_exceeded',
      message: `SFN rate (${metrics.sfnRate.toFixed(4)}%) exceeds critical threshold (0.1%)`,
    });
  }

  // Check coverage violations (WARNING)
  const violations = await getCoverageViolations();
  if (violations.length > 0) {
    alerts.push({
      severity: 'warning',
      type: 'coverage_violation',
      message: `${violations.length} strata have coverage violations > 5%`,
    });
  }

  // Check automation rate spike (WARNING)
  const automationOverTime = await getAutomationRateOverTime(experimentId, 2);
  if (automationOverTime.length >= 2) {
    const [yesterday, today] = automationOverTime.slice(-2);
    const dayOverDayChange = Math.abs(today.rate - yesterday.rate);
    if (dayOverDayChange > 20) {
      alerts.push({
        severity: 'warning',
        type: 'automation_rate_spike',
        message: `Automation rate changed by ${dayOverDayChange.toFixed(2)}% day-over-day`,
      });
    }
  }

  // Check critic observations (INFO)
  if (metrics.criticModelObservations < 100) {
    alerts.push({
      severity: 'info',
      type: 'low_critic_observations',
      message: `Critic model has only ${metrics.criticModelObservations} observations`,
    });
  }

  return {
    hasAlerts: alerts.length > 0,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
    alerts,
  };
}

function renderTrendChart(data: Array<{ date: string; rate: number }>, width: number = 50, height: number = 10): string {
  if (data.length === 0) return 'No data';

  const minRate = Math.min(...data.map(d => d.rate));
  const maxRate = Math.max(...data.map(d => d.rate));
  const range = maxRate - minRate || 1;

  const chart: string[][] = [];
  for (let i = 0; i < height; i++) {
    chart[i] = new Array(width).fill(' ');
  }

  data.forEach((point, idx) => {
    const x = Math.floor((idx / (data.length - 1)) * (width - 1));
    const normalizedRate = (point.rate - minRate) / range;
    const y = height - 1 - Math.floor(normalizedRate * (height - 1));
    if (y >= 0 && y < height) {
      chart[y][x] = '█';
    }
  });

  // Add labels
  const lines: string[] = [];
  for (let i = height - 1; i >= 0; i--) {
    const rate = minRate + (range * (height - 1 - i) / (height - 1));
    lines.push(`${rate.toFixed(1).padStart(6)}% │${chart[i].join('')}`);
  }
  lines.push('       └' + '─'.repeat(width));

  return lines.join('\n');
}

function exportToCSV(metrics: Metrics, automationOverTime: Array<{ date: string; rate: number }>, outputPath?: string): void {
  const csvPath = outputPath || resolve(process.cwd(), `ab-test-metrics-${new Date().toISOString().split('T')[0]}.csv`);
  
  const lines: string[] = [];
  lines.push('Metric,Value');
  lines.push(`Automation Rate,${metrics.automationRate.toFixed(2)}%`);
  lines.push(`Escalation Rate,${metrics.escalationRate.toFixed(2)}%`);
  lines.push(`SFN Rate,${metrics.sfnRate.toFixed(4)}%`);
  lines.push(`Average Decision Time,${metrics.averageDecisionTime.toFixed(3)}s`);
  lines.push(`Coverage Rate,${metrics.coverageRate.toFixed(2)}%`);
  lines.push(`Calibration Data Points,${metrics.calibrationDataPoints}`);
  lines.push(`Historical Validations,${metrics.historicalValidations}`);
  lines.push(`Seed Safe Set Size,${metrics.seedSafeSetSize}`);
  lines.push(`Critic Model Observations,${metrics.criticModelObservations}`);
  lines.push('');
  lines.push('Date,Automation Rate');
  automationOverTime.forEach(day => {
    lines.push(`${day.date},${day.rate.toFixed(2)}%`);
  });

  writeFileSync(csvPath, lines.join('\n'), 'utf-8');
  console.log(`\n📄 Metrics exported to: ${csvPath}`);
}

async function monitorMetrics() {
  try {
    if (!AB_TEST_EXPERIMENT_ID) {
      console.error('❌ AB_TEST_EXPERIMENT_ID not set in environment');
      process.exit(1);
    }

    // Check for watch mode
    const args = process.argv.slice(2);
    const watchMode = args.includes('--watch') || args.includes('-w');
    const exportCSV = args.includes('--export') || args.includes('-e');
    const csvPath = args.find(arg => arg.startsWith('--csv='))?.split('=')[1];

    console.log('📊 A/B Test Metrics Monitor\n');
    console.log(`Experiment ID: ${AB_TEST_EXPERIMENT_ID}\n`);

    // Get current metrics
    const metrics = await getMetrics(AB_TEST_EXPERIMENT_ID);

    console.log('📈 Current Metrics:');
    console.log('─────────────────────────────────────────');
    console.log(`Automation Rate:      ${metrics.automationRate.toFixed(2)}%`);
    console.log(`Escalation Rate:      ${metrics.escalationRate.toFixed(2)}%`);
    console.log(`SFN Rate:             ${metrics.sfnRate.toFixed(4)}%`);
    console.log(`Avg Decision Time:    ${metrics.averageDecisionTime.toFixed(3)}s`);
    console.log(`Coverage Rate:        ${metrics.coverageRate.toFixed(2)}%`);
    console.log(`Calibration Points:   ${metrics.calibrationDataPoints}`);
    console.log(`Historical Validations: ${metrics.historicalValidations}`);
    console.log(`Seed Safe Set Size:   ${metrics.seedSafeSetSize}`);
    console.log(`Critic Observations:  ${metrics.criticModelObservations}`);
    console.log('');

    // Check for coverage violations
    const violations = await getCoverageViolations();
    
    if (violations.length > 0) {
      console.log('⚠️  Coverage Violations Detected:');
      console.log('─────────────────────────────────────────');
      violations.slice(0, 10).forEach((v) => {
        console.log(`  ${v.stratum}:`);
        console.log(`    Expected: ${(v.expectedCoverage * 100).toFixed(0)}%`);
        console.log(`    Actual:   ${(v.actualCoverage * 100).toFixed(2)}%`);
        console.log(`    Violation: ${(v.violation * 100).toFixed(2)}%`);
        console.log(`    Sample Size: ${v.sampleSize}`);
        console.log('');
      });
    } else {
      console.log('✅ No coverage violations detected');
      console.log('');
    }

    // Get automation rate over time
    const automationOverTime = await getAutomationRateOverTime(
      AB_TEST_EXPERIMENT_ID,
      7
    );

    if (automationOverTime.length > 0) {
      console.log('📅 Automation Rate Over Last 7 Days:');
      console.log('─────────────────────────────────────────');
      automationOverTime.forEach((day) => {
        console.log(`  ${day.date}: ${day.rate.toFixed(2)}%`);
      });
      console.log('');
    }

    // Recommendations
    console.log('💡 Recommendations:');
    console.log('─────────────────────────────────────────');
    
    if (metrics.calibrationDataPoints < 100) {
      console.log('  ⚠️  Low calibration data - run populate-ab-test-calibration-data.ts');
    }
    
    if (metrics.historicalValidations < 1000) {
      console.log('  ⚠️  Low historical validations - need more validated assessments');
    }
    
    if (metrics.seedSafeSetSize === 0) {
      console.log('  ⚠️  No seed safe set contexts - system will escalate everything');
    }
    
    if (metrics.criticModelObservations < 100) {
      console.log('  ⚠️  Critic model needs more observations - validate more assessments');
    }
    
    if (metrics.sfnRate > 0.1) {
      console.log('  ⚠️  SFN rate is high - review safety-critical assessments');
    }

    // Check for alerts
    console.log('\n🚨 Alert Status:');
    console.log('─────────────────────────────────────────');
    const alertCheck = await checkAlerts(AB_TEST_EXPERIMENT_ID);
    
    if (alertCheck.hasAlerts) {
      console.log(`  ⚠️  ${alertCheck.critical} critical, ${alertCheck.warning} warning, ${alertCheck.info} info alerts`);
      alertCheck.alerts.forEach(alert => {
        const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵';
        console.log(`  ${icon} [${alert.severity.toUpperCase()}] ${alert.message}`);
      });
    } else {
      console.log('  ✅ No active alerts');
    }

    // Trend visualization
    if (automationOverTime.length > 0) {
      console.log('\n📈 Automation Rate Trend (Last 7 Days):');
      console.log('─────────────────────────────────────────');
      console.log(renderTrendChart(automationOverTime));
      console.log('');
    }

    // Export to CSV if requested
    if (exportCSV) {
      exportToCSV(metrics, automationOverTime, csvPath);
    }

    console.log('\n✅ Monitoring complete');

    // Watch mode: re-run every 30 seconds
    if (watchMode) {
      console.log('\n👀 Watch mode: Refreshing every 30 seconds... (Press Ctrl+C to stop)');
      setTimeout(() => {
        console.clear();
        monitorMetrics();
      }, 30000);
    }

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

