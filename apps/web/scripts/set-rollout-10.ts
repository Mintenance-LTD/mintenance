#!/usr/bin/env ts-node

/**
 * Set All Controllers to 10% Rollout
 * Updates all non-critical routes from current percentage to 10%
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import Table from 'cli-table3';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const CONTROLLER_FLAGS = {
  JOBS: 'new-jobs-controller',
  NOTIFICATIONS: 'new-notifications-controller',
  MESSAGES: 'new-messages-controller',
  ANALYTICS_INSIGHTS: 'new-analytics-controller',
  FEATURE_FLAGS: 'new-feature-flags-controller',
  AI_SEARCH: 'new-ai-search-controller',
  CONTRACTOR_BIDS: 'new-contractor-bids-controller',
  PAYMENT_METHODS: 'new-payment-methods-controller',
  ADMIN_DASHBOARD: 'new-admin-dashboard-controller',
  // WEBHOOKS excluded - critical route, stays at 0%
};

const TARGET_ROLLOUT = 10;

async function updateRolloutTo10(): Promise<void> {
  if (!SUPABASE_SERVICE_KEY) {
    console.error(chalk.red('Error: SUPABASE_SERVICE_ROLE_KEY is required'));
    console.error(chalk.yellow('Set it in your .env.local file'));
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log(chalk.blue.bold('🚀 Setting Rollout to 10%\n'));

  // Fetch current rollout percentages
  const currentRollouts = new Map<string, number>();
  
  console.log(chalk.gray('Fetching current rollout percentages...'));
  
  for (const [controller, flagName] of Object.entries(CONTROLLER_FLAGS)) {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('rollout_percentage')
      .eq('name', flagName)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error(chalk.red(`Error fetching ${controller}:`), error.message);
      continue;
    }

    currentRollouts.set(controller, data?.rollout_percentage ?? 0);
  }

  // Display what will be updated
  const updateTable = new Table({
    head: ['Controller', 'Flag Name', 'Current %', 'New %', 'Status'],
    colWidths: [20, 30, 12, 10, 15],
    style: { head: ['cyan'] }
  });

  const controllersToUpdate: Array<{ controller: string; flagName: string }> = [];

  for (const [controller, flagName] of Object.entries(CONTROLLER_FLAGS)) {
    const current = currentRollouts.get(controller) ?? 0;
    const needsUpdate = current !== TARGET_ROLLOUT;

    if (needsUpdate) {
      controllersToUpdate.push({ controller, flagName });
      updateTable.push([
        controller,
        flagName,
        `${current}%`,
        chalk.green(`${TARGET_ROLLOUT}%`),
        chalk.yellow('UPDATE')
      ]);
    } else {
      updateTable.push([
        controller,
        flagName,
        `${current}%`,
        `${TARGET_ROLLOUT}%`,
        chalk.gray('SKIP (already 10%)')
      ]);
    }
  }

  console.log(updateTable.toString());

  if (controllersToUpdate.length === 0) {
    console.log(chalk.green('\n✓ All controllers are already at 10% rollout'));
    return;
  }

  console.log(chalk.yellow(`\n⏳ Updating ${controllersToUpdate.length} controllers...\n`));

  // Update each controller
  let successCount = 0;
  let errorCount = 0;

  for (const { controller, flagName } of controllersToUpdate) {
    const { error } = await supabase
      .from('feature_flags')
      .upsert({
        name: flagName,
        enabled: true,
        rollout_percentage: TARGET_ROLLOUT,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'name'
      });

    if (error) {
      console.error(chalk.red(`✗ ${controller}: ${error.message}`));
      errorCount++;
    } else {
      console.log(chalk.green(`✓ ${controller}: Updated to ${TARGET_ROLLOUT}%`));
      successCount++;
    }
  }

  // Summary
  console.log(chalk.blue.bold('\n📊 Rollout Update Summary\n'));

  const summaryTable = new Table({
    head: ['Metric', 'Value'],
    colWidths: [30, 20],
    style: { head: ['cyan'] }
  });

  summaryTable.push(
    ['Controllers Updated', chalk.green(`${successCount}`)],
    ['Errors', errorCount > 0 ? chalk.red(`${errorCount}`) : chalk.green('0')],
    ['Target Rollout', `${TARGET_ROLLOUT}%`],
    ['Webhooks Status', chalk.gray('0% (unchanged - critical route)')]
  );

  console.log(summaryTable.toString());

  // Next steps
  console.log(chalk.cyan('\n📋 Next Steps:\n'));
  console.log('  1. Monitor metrics for next 2 hours');
  console.log('  2. Check error rates: npm run rollout:status');
  console.log('  3. If stable after 24 hours → increase to 25%');
  console.log('  4. Continue Stripe webhook whitelist testing\n');

  const timestamp = new Date().toISOString();
  console.log(chalk.gray(`📅 Rollout executed at: ${timestamp}\n`));
}

// Run the script
(async () => {
  try {
    await updateRolloutTo10();
  } catch (error) {
    console.error(chalk.red('\n✗ Fatal error:'), error);
    process.exit(1);
  }
})();
