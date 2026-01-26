#!/usr/bin/env ts-node

/**
 * Rollout Adjustment Utility for Migrated Routes
 * Safely adjust feature flag rollout percentages based on metrics
 */

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import inquirer from 'inquirer';
import Table from 'cli-table3';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const CONTROLLER_FLAGS = {
  JOBS: 'new-jobs-controller',
  NOTIFICATIONS: 'new-notifications-controller',
  MESSAGES: 'new-messages-controller',
  ANALYTICS_INSIGHTS: 'new-analytics-controller',
  WEBHOOKS: 'new-webhooks-controller',
  FEATURE_FLAGS: 'new-feature-flags-controller',
  AI_SEARCH: 'new-ai-search-controller',
  CONTRACTOR_BIDS: 'new-contractor-bids-controller',
  PAYMENT_METHODS: 'new-payment-methods-controller',
  ADMIN_DASHBOARD: 'new-admin-dashboard-controller'
};

const SAFE_ROLLOUT_INCREMENTS = {
  conservative: [0, 1, 5, 10, 25, 50, 75, 100],
  moderate: [0, 5, 10, 25, 50, 100],
  aggressive: [0, 10, 25, 50, 100]
};

interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  rollout_percentage: number;
  user_whitelist: string[];
  user_blacklist: string[];
  description: string;
  metadata: any;
  updated_at: string;
}

interface RolloutMetrics {
  controller: string;
  currentRollout: number;
  totalRequests: number;
  errorRate: number;
  avgResponseTime: number;
  fallbackRate: number;
  recommendation: 'increase' | 'maintain' | 'decrease';
  suggestedRollout: number;
}

class RolloutManager {
  private supabase: any;
  private flags: Map<string, FeatureFlag> = new Map();
  private metrics: Map<string, RolloutMetrics> = new Map();

  constructor() {
    if (!SUPABASE_SERVICE_KEY) {
      console.error(chalk.red('Error: SUPABASE_SERVICE_ROLE_KEY is required'));
      process.exit(1);
    }

    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  async run(): Promise<void> {
    console.log(chalk.blue.bold('🎛️  Rollout Adjustment Utility\n'));

    // Fetch current state
    await this.fetchFeatureFlags();
    await this.fetchMetrics();

    // Display current status
    this.displayCurrentStatus();

    // Show recommendations
    this.generateRecommendations();

    // Interactive menu
    await this.interactiveMenu();
  }

  private async fetchFeatureFlags(): Promise<void> {
    console.log(chalk.gray('Fetching feature flags...'));

    const { data, error } = await this.supabase
      .from('feature_flags')
      .select('*')
      .in('name', Object.values(CONTROLLER_FLAGS));

    if (error) {
      console.error(chalk.red('Error fetching flags:'), error);
      return;
    }

    for (const flag of data || []) {
      this.flags.set(flag.name, flag);
    }

    console.log(chalk.green(`✓ Loaded ${this.flags.size} feature flags\n`));
  }

  private async fetchMetrics(): Promise<void> {
    console.log(chalk.gray('Analyzing controller metrics...'));

    // Fetch last 24 hours of metrics
    const { data, error } = await this.supabase
      .from('controller_usage_logs')
      .select('*')
      .gte('logged_at', new Date(Date.now() - 86400000).toISOString());

    if (error) {
      console.error(chalk.red('Error fetching metrics:'), error);
      return;
    }

    // Process metrics by controller
    const controllerStats = new Map<string, any>();

    for (const log of data || []) {
      const stats = controllerStats.get(log.module) || {
        total: 0,
        errors: 0,
        fallbacks: 0,
        responseTimes: []
      };

      stats.total++;
      if (log.metadata?.error) stats.errors++;
      if (log.metadata?.fallback) stats.fallbacks++;
      if (log.metadata?.responseTime) {
        stats.responseTimes.push(log.metadata.responseTime);
      }

      controllerStats.set(log.module, stats);
    }

    // Calculate metrics for each controller
    for (const [key, flagName] of Object.entries(CONTROLLER_FLAGS)) {
      const flag = this.flags.get(flagName);
      const stats = controllerStats.get(key.toLowerCase().replace('_', '-')) || {
        total: 0,
        errors: 0,
        fallbacks: 0,
        responseTimes: []
      };

      const avgResponseTime = stats.responseTimes.length > 0
        ? Math.round(stats.responseTimes.reduce((a: number, b: number) => a + b, 0) / stats.responseTimes.length)
        : 0;

      const metrics: RolloutMetrics = {
        controller: key,
        currentRollout: flag?.rollout_percentage || 0,
        totalRequests: stats.total,
        errorRate: stats.total > 0 ? stats.errors / stats.total : 0,
        avgResponseTime,
        fallbackRate: stats.total > 0 ? stats.fallbacks / stats.total : 0,
        recommendation: 'maintain',
        suggestedRollout: flag?.rollout_percentage || 0
      };

      // Generate recommendation
      this.calculateRecommendation(metrics);

      this.metrics.set(key, metrics);
    }

    console.log(chalk.green(`✓ Analyzed metrics for ${this.metrics.size} controllers\n`));
  }

  private calculateRecommendation(metrics: RolloutMetrics): void {
    // Safety thresholds
    const MAX_ERROR_RATE = 0.01; // 1%
    const MAX_FALLBACK_RATE = 0.05; // 5%
    const MAX_RESPONSE_TIME = 500; // 500ms

    if (metrics.errorRate > MAX_ERROR_RATE || metrics.fallbackRate > MAX_FALLBACK_RATE) {
      // High errors or fallbacks - decrease rollout
      metrics.recommendation = 'decrease';
      metrics.suggestedRollout = Math.max(0, metrics.currentRollout - 10);
    } else if (
      metrics.totalRequests > 100 && // Enough data
      metrics.errorRate < MAX_ERROR_RATE / 2 && // Low errors
      metrics.fallbackRate < MAX_FALLBACK_RATE / 2 && // Low fallbacks
      metrics.avgResponseTime < MAX_RESPONSE_TIME // Good performance
    ) {
      // Everything looks good - increase rollout
      metrics.recommendation = 'increase';

      // Find next increment based on current rollout
      const increments = SAFE_ROLLOUT_INCREMENTS.moderate;
      const currentIndex = increments.findIndex(v => v >= metrics.currentRollout);
      const nextIndex = Math.min(currentIndex + 1, increments.length - 1);
      metrics.suggestedRollout = increments[nextIndex];
    } else {
      // Maintain current rollout
      metrics.recommendation = 'maintain';
      metrics.suggestedRollout = metrics.currentRollout;
    }

    // Special case: Critical routes (payments) should be more conservative
    if (metrics.controller === 'WEBHOOKS') {
      if (metrics.currentRollout === 0 && metrics.recommendation === 'increase') {
        metrics.suggestedRollout = 1; // Start with 1% for critical routes
      }
    }
  }

  private displayCurrentStatus(): void {
    console.log(chalk.blue.bold('📊 Current Rollout Status\n'));

    const table = new Table({
      head: ['Controller', 'Current %', 'Requests (24h)', 'Error Rate', 'Avg RT (ms)', 'Status'],
      colWidths: [20, 12, 15, 12, 12, 15],
      style: { head: ['cyan'] }
    });

    for (const [key, metrics] of this.metrics) {
      const errorRate = `${(metrics.errorRate * 100).toFixed(2)}%`;
      const errorRateColor = metrics.errorRate > 0.01
        ? chalk.red(errorRate)
        : chalk.green(errorRate);

      const status = metrics.currentRollout === 0 ? chalk.gray('Not Started')
        : metrics.currentRollout === 100 ? chalk.green('Complete')
        : chalk.yellow('In Progress');

      table.push([
        key,
        `${metrics.currentRollout}%`,
        metrics.totalRequests,
        errorRateColor,
        metrics.avgResponseTime,
        status
      ]);
    }

    console.log(table.toString());
  }

  private generateRecommendations(): void {
    console.log(chalk.blue.bold('\n🎯 Rollout Recommendations\n'));

    const recommendations = new Table({
      head: ['Controller', 'Current', 'Suggested', 'Action', 'Reason'],
      colWidths: [20, 10, 10, 12, 40],
      style: { head: ['cyan'] }
    });

    for (const [key, metrics] of this.metrics) {
      if (metrics.recommendation === 'maintain') continue;

      const action = metrics.recommendation === 'increase'
        ? chalk.green('↑ Increase')
        : chalk.red('↓ Decrease');

      let reason = '';
      if (metrics.recommendation === 'increase') {
        reason = 'Low error rate, good performance';
      } else if (metrics.recommendation === 'decrease') {
        if (metrics.errorRate > 0.01) {
          reason = `High error rate: ${(metrics.errorRate * 100).toFixed(2)}%`;
        } else if (metrics.fallbackRate > 0.05) {
          reason = `High fallback rate: ${(metrics.fallbackRate * 100).toFixed(2)}%`;
        }
      }

      recommendations.push([
        key,
        `${metrics.currentRollout}%`,
        `${metrics.suggestedRollout}%`,
        action,
        reason
      ]);
    }

    if (recommendations.length > 0) {
      console.log(recommendations.toString());
    } else {
      console.log(chalk.gray('No rollout changes recommended at this time.'));
    }
  }

  private async interactiveMenu(): Promise<void> {
    const choices = [
      { name: 'Apply all recommendations', value: 'apply-all' },
      { name: 'Adjust individual controller', value: 'adjust-one' },
      { name: 'Batch update by percentage', value: 'batch-update' },
      { name: 'Emergency rollback all', value: 'rollback-all' },
      { name: 'View detailed metrics', value: 'view-metrics' },
      { name: 'Exit', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices
      }
    ]);

    switch (action) {
      case 'apply-all':
        await this.applyAllRecommendations();
        break;
      case 'adjust-one':
        await this.adjustIndividualController();
        break;
      case 'batch-update':
        await this.batchUpdateRollout();
        break;
      case 'rollback-all':
        await this.emergencyRollback();
        break;
      case 'view-metrics':
        await this.viewDetailedMetrics();
        await this.interactiveMenu();
        break;
      case 'exit':
        console.log(chalk.gray('\nExiting...'));
        process.exit(0);
    }
  }

  private async applyAllRecommendations(): Promise<void> {
    const changes = Array.from(this.metrics.values())
      .filter(m => m.recommendation !== 'maintain');

    if (changes.length === 0) {
      console.log(chalk.yellow('\nNo recommendations to apply.'));
      return this.interactiveMenu();
    }

    console.log(chalk.yellow(`\nThis will update ${changes.length} controllers:`));
    for (const change of changes) {
      const arrow = change.recommendation === 'increase' ? '↑' : '↓';
      console.log(`  ${change.controller}: ${change.currentRollout}% ${arrow} ${change.suggestedRollout}%`);
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Apply these changes?',
        default: false
      }
    ]);

    if (!confirm) {
      return this.interactiveMenu();
    }

    // Apply changes
    for (const change of changes) {
      const flagName = CONTROLLER_FLAGS[change.controller as keyof typeof CONTROLLER_FLAGS];
      await this.updateRollout(flagName, change.suggestedRollout);
    }

    console.log(chalk.green('\n✓ All recommendations applied successfully!'));
    return this.interactiveMenu();
  }

  private async adjustIndividualController(): Promise<void> {
    const controllers = Array.from(this.metrics.keys());

    const { controller } = await inquirer.prompt([
      {
        type: 'list',
        name: 'controller',
        message: 'Select controller to adjust:',
        choices: controllers.map(c => ({
          name: `${c} (current: ${this.metrics.get(c)?.currentRollout}%)`,
          value: c
        }))
      }
    ]);

    const metrics = this.metrics.get(controller)!;

    // Show current metrics
    console.log(chalk.cyan(`\n${controller} Metrics:`));
    console.log(`  Current Rollout: ${metrics.currentRollout}%`);
    console.log(`  Total Requests (24h): ${metrics.totalRequests}`);
    console.log(`  Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
    console.log(`  Avg Response Time: ${metrics.avgResponseTime}ms`);
    console.log(`  Suggested: ${metrics.suggestedRollout}%`);

    const { percentage } = await inquirer.prompt([
      {
        type: 'number',
        name: 'percentage',
        message: 'New rollout percentage (0-100):',
        default: metrics.suggestedRollout,
        validate: (value) => value >= 0 && value <= 100
      }
    ]);

    const flagName = CONTROLLER_FLAGS[controller as keyof typeof CONTROLLER_FLAGS];
    await this.updateRollout(flagName, percentage);

    console.log(chalk.green(`\n✓ ${controller} rollout updated to ${percentage}%`));
    return this.interactiveMenu();
  }

  private async batchUpdateRollout(): Promise<void> {
    const { percentage } = await inquirer.prompt([
      {
        type: 'number',
        name: 'percentage',
        message: 'Set all controllers to percentage (0-100):',
        validate: (value) => value >= 0 && value <= 100
      }
    ]);

    const { excludeCritical } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'excludeCritical',
        message: 'Exclude critical routes (webhooks)?',
        default: true
      }
    ]);

    const toUpdate = Array.from(this.metrics.keys())
      .filter(c => !excludeCritical || c !== 'WEBHOOKS');

    console.log(chalk.yellow(`\nThis will update ${toUpdate.length} controllers to ${percentage}%`));

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Continue?',
        default: false
      }
    ]);

    if (!confirm) {
      return this.interactiveMenu();
    }

    for (const controller of toUpdate) {
      const flagName = CONTROLLER_FLAGS[controller as keyof typeof CONTROLLER_FLAGS];
      await this.updateRollout(flagName, percentage);
    }

    console.log(chalk.green(`\n✓ Updated ${toUpdate.length} controllers to ${percentage}%`));
    return this.interactiveMenu();
  }

  private async emergencyRollback(): Promise<void> {
    console.log(chalk.red.bold('\n⚠️  EMERGENCY ROLLBACK'));
    console.log(chalk.red('This will set all controllers to 0% rollout!'));

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you absolutely sure?',
        default: false
      }
    ]);

    if (!confirm) {
      return this.interactiveMenu();
    }

    const { doubleConfirm } = await inquirer.prompt([
      {
        type: 'input',
        name: 'doubleConfirm',
        message: 'Type "ROLLBACK" to confirm:',
        validate: (value) => value === 'ROLLBACK'
      }
    ]);

    // Rollback all
    for (const flagName of Object.values(CONTROLLER_FLAGS)) {
      await this.updateRollout(flagName, 0);
    }

    console.log(chalk.red('\n✓ Emergency rollback complete. All controllers set to 0%.'));
    return this.interactiveMenu();
  }

  private async viewDetailedMetrics(): Promise<void> {
    const { controller } = await inquirer.prompt([
      {
        type: 'list',
        name: 'controller',
        message: 'Select controller for detailed metrics:',
        choices: Array.from(this.metrics.keys())
      }
    ]);

    const metrics = this.metrics.get(controller)!;

    console.log(chalk.blue.bold(`\n📊 Detailed Metrics: ${controller}\n`));

    // Fetch more detailed metrics
    const { data } = await this.supabase
      .from('controller_usage_logs')
      .select('*')
      .eq('module', controller.toLowerCase().replace('_', '-'))
      .gte('logged_at', new Date(Date.now() - 86400000).toISOString())
      .order('logged_at', { ascending: false })
      .limit(100);

    // Calculate percentiles
    const responseTimes = data
      ?.map((d: unknown) => d.metadata?.responseTime)
      .filter((t: unknown) => t)
      .sort((a: number, b: number) => a - b) || [];

    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)] || 0;
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;

    console.log(`Current Rollout: ${metrics.currentRollout}%`);
    console.log(`Total Requests (24h): ${metrics.totalRequests}`);
    console.log(`Error Rate: ${(metrics.errorRate * 100).toFixed(3)}%`);
    console.log(`Fallback Rate: ${(metrics.fallbackRate * 100).toFixed(3)}%`);
    console.log(`\nResponse Times:`);
    console.log(`  Average: ${metrics.avgResponseTime}ms`);
    console.log(`  P50: ${p50}ms`);
    console.log(`  P95: ${p95}ms`);
    console.log(`  P99: ${p99}ms`);

    // Recent errors
    const recentErrors = data?.filter((d: unknown) => d.metadata?.error).slice(0, 5) || [];
    if (recentErrors.length > 0) {
      console.log(chalk.red('\nRecent Errors:'));
      for (const error of recentErrors) {
        console.log(`  - ${new Date(error.logged_at).toLocaleString()}: ${error.metadata.error}`);
      }
    }

    console.log('');
  }

  private async updateRollout(flagName: string, percentage: number): Promise<void> {
    const { error } = await this.supabase
      .from('feature_flags')
      .update({
        rollout_percentage: percentage,
        updated_at: new Date().toISOString()
      })
      .eq('name', flagName);

    if (error) {
      console.error(chalk.red(`Error updating ${flagName}:`), error);
    }
  }
}

// Run the utility
(async () => {
  const manager = new RolloutManager();
  await manager.run();
})();