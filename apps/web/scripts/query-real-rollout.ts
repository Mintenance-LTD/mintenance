#!/usr/bin/env ts-node

/**
 * Query Real Rollout Percentages from Database
 * This script queries the actual feature flag percentages from Supabase
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(chalk.red('❌ Missing Supabase credentials in .env.local'));
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Controller feature flags to check
const CONTROLLER_FLAGS = [
  { key: 'JOBS', name: 'new-jobs-controller', route: 'GET /api/jobs' },
  { key: 'NOTIFICATIONS', name: 'new-notifications-controller', route: 'GET /api/notifications' },
  { key: 'MESSAGES', name: 'new-messages-controller', route: 'GET /api/messages/threads' },
  { key: 'ANALYTICS', name: 'new-analytics-controller', route: 'GET /api/analytics/insights' },
  { key: 'WEBHOOKS', name: 'new-webhooks-controller', route: 'POST /api/webhooks/stripe' },
  { key: 'FEATURE_FLAGS', name: 'new-feature-flags-controller', route: 'GET /api/feature-flags' },
  { key: 'AI_SEARCH', name: 'new-ai-search-controller', route: 'POST /api/ai/search-suggestions' },
  { key: 'CONTRACTOR_BIDS', name: 'new-contractor-bids-controller', route: 'POST /api/contractor/bids' },
  { key: 'PAYMENT_METHODS', name: 'new-payment-methods-controller', route: 'GET /api/payments/methods' },
  { key: 'ADMIN_DASHBOARD', name: 'new-admin-dashboard-controller', route: 'GET /api/admin/dashboard/metrics' }
];

async function queryFeatureFlags() {
  console.log(chalk.blue.bold('\n🔍 Querying Real Feature Flag Percentages from Database\n'));
  console.log(chalk.gray(`Database: ${supabaseUrl}\n`));

  try {
    // Query all feature flags from database
    const { data: flags, error } = await supabase
      .from('feature_flags')
      .select('*')
      .in('name', CONTROLLER_FLAGS.map(f => f.name))
      .order('name');

    if (error) {
      console.error(chalk.red('❌ Error querying database:'), error);
      return;
    }

    // Create a map of flag data
    const flagMap = new Map(flags?.map(f => [f.name, f]) || []);

    // Display results in table
    const table = new Table({
      head: ['Controller', 'Flag Name', 'Rollout %', 'Enabled', 'Whitelist', 'Last Updated'],
      colWidths: [18, 30, 12, 10, 12, 20],
      style: { head: ['cyan'] }
    });

    let totalPercentage = 0;
    let flagCount = 0;

    for (const controller of CONTROLLER_FLAGS) {
      const flag = flagMap.get(controller.name);

      if (flag) {
        const rolloutPercent = flag.rollout_percentage || 0;
        totalPercentage += rolloutPercent;
        flagCount++;

        const rolloutColor = rolloutPercent === 0 ? chalk.gray(`${rolloutPercent}%`)
          : rolloutPercent < 25 ? chalk.yellow(`${rolloutPercent}%`)
          : rolloutPercent < 75 ? chalk.blue(`${rolloutPercent}%`)
          : rolloutPercent < 100 ? chalk.green.bold(`${rolloutPercent}%`)
          : chalk.green(`${rolloutPercent}%`);

        const enabledColor = flag.enabled ? chalk.green('✅ Yes') : chalk.red('❌ No');

        const whitelist = flag.user_whitelist?.length
          ? chalk.yellow(`${flag.user_whitelist.length} users`)
          : chalk.gray('None');

        const lastUpdated = flag.updated_at
          ? new Date(flag.updated_at).toLocaleString()
          : 'Never';

        table.push([
          controller.key.replace(/_/g, ' '),
          controller.name,
          rolloutColor,
          enabledColor,
          whitelist,
          lastUpdated
        ]);
      } else {
        // Flag doesn't exist in database
        table.push([
          controller.key.replace(/_/g, ' '),
          controller.name,
          chalk.gray('Not found'),
          chalk.gray('-'),
          chalk.gray('-'),
          chalk.gray('-')
        ]);
      }
    }

    console.log(table.toString());

    // Display summary
    console.log(chalk.cyan.bold('\n📊 Summary\n'));

    if (flagCount > 0) {
      const avgRollout = Math.round(totalPercentage / flagCount);

      console.log(`  • Feature flags in database: ${chalk.green(flagCount)}/${CONTROLLER_FLAGS.length}`);
      console.log(`  • Average rollout percentage: ${chalk.blue.bold(`${avgRollout}%`)}`);

      if (avgRollout >= 75) {
        console.log(`  • Status: ${chalk.green.bold('🎉 Three-quarters rollout achieved!')}`);
        console.log(chalk.yellow('\n  📌 Next step: Monitor for 4-8 hours before proceeding to 100%'));
      } else if (avgRollout >= 50) {
        console.log(`  • Status: ${chalk.blue.bold('Halfway point reached')}`);
      } else if (avgRollout >= 25) {
        console.log(`  • Status: ${chalk.yellow('Quarter rollout in progress')}`);
      } else {
        console.log(`  • Status: ${chalk.gray('Initial rollout phase')}`);
      }
    } else {
      console.log(chalk.yellow('  ⚠️ No feature flags found in database'));
      console.log(chalk.gray('  Feature flags may be controlled via environment variables or code'));
    }

    // Check environment variables as fallback
    console.log(chalk.cyan.bold('\n🔍 Checking Environment Variables\n'));

    const envFlags = [];
    for (const controller of CONTROLLER_FLAGS) {
      const envKey = `FF_${controller.key.replace(/-/g, '_').toUpperCase()}_ROLLOUT`;
      const envValue = process.env[envKey];
      if (envValue) {
        envFlags.push(`  • ${envKey}: ${chalk.green(envValue + '%')}`);
      }
    }

    if (envFlags.length > 0) {
      console.log('Found environment variable overrides:');
      envFlags.forEach(f => console.log(f));
    } else {
      console.log(chalk.gray('  No environment variable overrides found'));
    }

  } catch (error) {
    console.error(chalk.red('❌ Unexpected error:'), error);
  }
}

// Additional metrics query
async function queryMigrationMetrics() {
  console.log(chalk.cyan.bold('\n📈 Migration Metrics (Last 24 Hours)\n'));

  try {
    // Query controller usage logs
    const { data: usage, error } = await supabase
      .from('controller_usage_logs')
      .select('controller_name, use_new_controller, count')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('controller_name');

    if (error) {
      console.log(chalk.yellow('  ⚠️ Controller usage logs not available'));
      return;
    }

    if (usage && usage.length > 0) {
      // Aggregate metrics
      const metrics = new Map();

      usage.forEach(log => {
        if (!metrics.has(log.controller_name)) {
          metrics.set(log.controller_name, { new: 0, old: 0 });
        }
        const stat = metrics.get(log.controller_name);
        if (log.use_new_controller) {
          stat.new += log.count || 1;
        } else {
          stat.old += log.count || 1;
        }
      });

      // Display metrics
      const metricsTable = new Table({
        head: ['Controller', 'New Controller', 'Old Controller', 'Actual %'],
        colWidths: [25, 15, 15, 12],
        style: { head: ['cyan'] }
      });

      metrics.forEach((stat, name) => {
        const total = stat.new + stat.old;
        const percentage = total > 0 ? Math.round((stat.new / total) * 100) : 0;

        const percentColor = percentage >= 75 ? chalk.green :
                            percentage >= 50 ? chalk.blue :
                            percentage >= 25 ? chalk.yellow : chalk.gray;

        metricsTable.push([
          name,
          chalk.green(stat.new.toLocaleString()),
          chalk.gray(stat.old.toLocaleString()),
          percentColor(`${percentage}%`)
        ]);
      });

      console.log(metricsTable.toString());
    } else {
      console.log(chalk.gray('  No usage metrics available'));
    }
  } catch (error) {
    console.log(chalk.yellow('  ⚠️ Metrics query failed'));
  }
}

// Main execution
(async () => {
  console.clear();

  // ASCII Art Header
  console.log(chalk.blue(`
╔═══════════════════════════════════════════╗
║   REAL-TIME FEATURE FLAG DATABASE QUERY    ║
╚═══════════════════════════════════════════╝
  `));

  await queryFeatureFlags();
  await queryMigrationMetrics();

  console.log(chalk.gray('\n─'.repeat(50)));
  console.log(chalk.gray('\nCommands:'));
  console.log(chalk.gray('  • npm run rollout:100    - Execute final 100% rollout'));
  console.log(chalk.gray('  • npm run rollout:emergency - Activate kill switch'));
  console.log(chalk.gray('  • npm run monitor:production - Monitor production metrics'));
  console.log('');
})();