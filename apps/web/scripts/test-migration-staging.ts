#!/usr/bin/env ts-node

/**
 * Staging Environment Testing Script for Migrated Routes
 * Tests all Phase 1 routes in staging environment with comprehensive checks
 */

import axios, { AxiosResponse } from 'axios';
import { createHash } from 'crypto';
import chalk from 'chalk';
import Table from 'cli-table3';

// Configuration
const STAGING_URL = process.env.STAGING_URL || 'https://staging.mintenance.com';
const API_KEY = process.env.STAGING_API_KEY || '';
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

interface RouteTest {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: any;
  expectedStatus: number;
  validateResponse?: (data: unknown) => boolean;
  requiresAuth: boolean;
  requiresAdmin?: boolean;
  criticalRoute?: boolean;
}

interface TestResult {
  route: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  responseTime: number;
  statusCode?: number;
  error?: string;
  usedNewController?: boolean;
}

// Define all Phase 1 routes to test
const PHASE1_ROUTES: RouteTest[] = [
  {
    name: 'Jobs Listing',
    method: 'GET',
    path: '/api/jobs',
    expectedStatus: 200,
    requiresAuth: true,
    validateResponse: (data) => Array.isArray(data.jobs)
  },
  {
    name: 'Jobs with Filters',
    method: 'GET',
    path: '/api/jobs?status=open&category=plumbing',
    expectedStatus: 200,
    requiresAuth: true,
    validateResponse: (data) => Array.isArray(data.jobs)
  },
  {
    name: 'Notifications',
    method: 'GET',
    path: '/api/notifications',
    expectedStatus: 200,
    requiresAuth: true,
    validateResponse: (data) => Array.isArray(data.notifications)
  },
  {
    name: 'Message Threads',
    method: 'GET',
    path: '/api/messages/threads',
    expectedStatus: 200,
    requiresAuth: true,
    validateResponse: (data) => Array.isArray(data.threads)
  },
  {
    name: 'Analytics Insights',
    method: 'GET',
    path: '/api/analytics/insights',
    expectedStatus: 200,
    requiresAuth: true,
    validateResponse: (data) => data.insights !== undefined
  },
  {
    name: 'Feature Flags',
    method: 'GET',
    path: '/api/feature-flags',
    expectedStatus: 200,
    requiresAuth: false,
    validateResponse: (data) => data.flags !== undefined
  },
  {
    name: 'Specific Feature Flag',
    method: 'GET',
    path: '/api/feature-flags?flag=JOBS',
    expectedStatus: 200,
    requiresAuth: false,
    validateResponse: (data) => data.flag !== undefined
  },
  {
    name: 'AI Search Suggestions',
    method: 'GET',
    path: '/api/ai/search-suggestions?q=plumber',
    expectedStatus: 200,
    requiresAuth: true,
    validateResponse: (data) => Array.isArray(data.suggestions)
  },
  {
    name: 'Contractor Bids',
    method: 'GET',
    path: '/api/contractor/bids',
    expectedStatus: 200,
    requiresAuth: true,
    validateResponse: (data) => Array.isArray(data.bids)
  },
  {
    name: 'Payment Methods',
    method: 'GET',
    path: '/api/payments/methods',
    expectedStatus: 200,
    requiresAuth: true,
    validateResponse: (data) => Array.isArray(data.methods)
  },
  {
    name: 'Admin Dashboard Metrics',
    method: 'GET',
    path: '/api/admin/dashboard/metrics',
    expectedStatus: 200,
    requiresAuth: true,
    requiresAdmin: true,
    validateResponse: (data) => data.metrics !== undefined
  },
  {
    name: 'Stripe Webhook (Test)',
    method: 'POST',
    path: '/api/webhooks/stripe',
    headers: {
      'stripe-signature': 'test_signature'
    },
    body: {
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test' } }
    },
    expectedStatus: 200,
    requiresAuth: false,
    criticalRoute: true
  }
];

class MigrationTester {
  private results: TestResult[] = [];

  async runTests(): Promise<void> {
    console.log(chalk.blue.bold('\n🧪 Starting Migration Tests for Staging Environment\n'));
    console.log(chalk.gray(`Testing against: ${STAGING_URL}`));
    console.log(chalk.gray(`Total routes to test: ${PHASE1_ROUTES.length}\n`));

    // Check environment
    await this.checkEnvironment();

    // Test each route
    for (const route of PHASE1_ROUTES) {
      await this.testRoute(route);
    }

    // Display results
    this.displayResults();

    // Performance analysis
    await this.analyzePerformance();

    // Feature flag analysis
    await this.analyzeFeatureFlags();

    // Generate summary
    this.generateSummary();
  }

  private async checkEnvironment(): Promise<void> {
    console.log(chalk.yellow('Checking environment...'));

    try {
      // Test basic connectivity
      const response = await axios.get(`${STAGING_URL}/api/health`, {
        timeout: 5000
      });

      if (response.status === 200) {
        console.log(chalk.green('✓ Staging environment is reachable\n'));
      }
    } catch (error) {
      console.log(chalk.red('✗ Could not reach staging environment'));
      console.log(chalk.gray('Continuing with tests...\n'));
    }
  }

  private async testRoute(route: RouteTest): Promise<void> {
    const startTime = Date.now();
    const result: TestResult = {
      route: `${route.method} ${route.path}`,
      status: 'SKIP',
      responseTime: 0
    };

    try {
      console.log(chalk.cyan(`Testing: ${route.name}`));

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...route.headers
      };

      if (route.requiresAuth) {
        headers['Authorization'] = `Bearer ${route.requiresAdmin ? ADMIN_TOKEN : TEST_USER_TOKEN}`;
      }

      // Make request
      const response = await axios({
        method: route.method,
        url: `${STAGING_URL}${route.path}`,
        headers,
        data: route.body,
        validateStatus: () => true, // Don't throw on any status
        timeout: 10000
      });

      const responseTime = Date.now() - startTime;

      // Check status code
      if (response.status === route.expectedStatus) {
        // Validate response if validator provided
        if (route.validateResponse) {
          if (route.validateResponse(response.data)) {
            result.status = 'PASS';
            console.log(chalk.green(`  ✓ Passed (${responseTime}ms)`));
          } else {
            result.status = 'FAIL';
            result.error = 'Response validation failed';
            console.log(chalk.red(`  ✗ Failed: Invalid response structure`));
          }
        } else {
          result.status = 'PASS';
          console.log(chalk.green(`  ✓ Passed (${responseTime}ms)`));
        }
      } else {
        result.status = 'FAIL';
        result.error = `Expected ${route.expectedStatus}, got ${response.status}`;
        console.log(chalk.red(`  ✗ Failed: ${result.error}`));
      }

      result.statusCode = response.status;
      result.responseTime = responseTime;

      // Check if new controller was used (from response headers)
      if (response.headers['x-controller-version'] === 'new') {
        result.usedNewController = true;
        console.log(chalk.blue(`  → Used new controller`));
      }

      // Check for performance warnings
      if (responseTime > 200) {
        console.log(chalk.yellow(`  ⚠ Slow response: ${responseTime}ms`));
      }

      // Critical route check
      if (route.criticalRoute && result.status === 'FAIL') {
        console.log(chalk.red.bold(`  🚨 CRITICAL ROUTE FAILURE!`));
      }

    } catch (error) {
      result.status = 'FAIL';
      result.responseTime = Date.now() - startTime;
      result.error = error.message;
      console.log(chalk.red(`  ✗ Error: ${error.message}`));
    }

    this.results.push(result);
    console.log();
  }

  private displayResults(): void {
    const table = new Table({
      head: ['Route', 'Status', 'Response Time', 'Controller', 'Notes'],
      colWidths: [40, 10, 15, 12, 30],
      style: {
        head: ['cyan']
      }
    });

    for (const result of this.results) {
      const status = result.status === 'PASS'
        ? chalk.green('PASS')
        : result.status === 'FAIL'
        ? chalk.red('FAIL')
        : chalk.yellow('SKIP');

      const responseTime = result.responseTime > 200
        ? chalk.yellow(`${result.responseTime}ms`)
        : chalk.green(`${result.responseTime}ms`);

      const controller = result.usedNewController ? 'New' : 'Old';
      const notes = result.error || '';

      table.push([
        result.route,
        status,
        responseTime,
        controller,
        notes
      ]);
    }

    console.log(chalk.blue.bold('\n📊 Test Results Summary\n'));
    console.log(table.toString());
  }

  private async analyzePerformance(): Promise<void> {
    console.log(chalk.blue.bold('\n⚡ Performance Analysis\n'));

    const performanceMetrics = {
      avgResponseTime: 0,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      slowestRoute: '',
      fastestRoute: '',
      routesOver200ms: 0
    };

    const responseTimes = this.results
      .filter(r => r.status === 'PASS')
      .map(r => r.responseTime)
      .sort((a, b) => a - b);

    if (responseTimes.length > 0) {
      // Calculate metrics
      performanceMetrics.avgResponseTime = Math.round(
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      );
      performanceMetrics.p50ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.5)];
      performanceMetrics.p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];

      const slowest = this.results.reduce((a, b) =>
        a.responseTime > b.responseTime ? a : b
      );
      performanceMetrics.slowestRoute = slowest.route;

      const fastest = this.results.reduce((a, b) =>
        a.responseTime < b.responseTime ? a : b
      );
      performanceMetrics.fastestRoute = fastest.route;

      performanceMetrics.routesOver200ms = this.results.filter(
        r => r.responseTime > 200
      ).length;

      // Display metrics
      console.log(`Average Response Time: ${performanceMetrics.avgResponseTime}ms`);
      console.log(`P50 Response Time: ${performanceMetrics.p50ResponseTime}ms`);
      console.log(`P95 Response Time: ${performanceMetrics.p95ResponseTime}ms`);
      console.log(`Fastest Route: ${performanceMetrics.fastestRoute}`);
      console.log(`Slowest Route: ${performanceMetrics.slowestRoute}`);
      console.log(`Routes Over 200ms: ${performanceMetrics.routesOver200ms}`);

      // Performance rating
      if (performanceMetrics.avgResponseTime < 100) {
        console.log(chalk.green('\n✓ Excellent performance!'));
      } else if (performanceMetrics.avgResponseTime < 200) {
        console.log(chalk.green('\n✓ Good performance'));
      } else {
        console.log(chalk.yellow('\n⚠ Performance needs improvement'));
      }
    }
  }

  private async analyzeFeatureFlags(): Promise<void> {
    console.log(chalk.blue.bold('\n🚩 Feature Flag Analysis\n'));

    try {
      // Get current feature flag status
      const response = await axios.get(`${STAGING_URL}/api/feature-flags?metrics=true`);

      if (response.status === 200 && response.data.flags) {
        const flags = response.data.flags;

        const table = new Table({
          head: ['Controller', 'Enabled', 'Rollout %', 'Users (New)', 'Users (Old)'],
          style: { head: ['cyan'] }
        });

        for (const [key, flag] of Object.entries(flags as any)) {
          if (key.includes('CONTROLLER')) {
            table.push([
              key,
              flag.enabled ? chalk.green('Yes') : chalk.red('No'),
              `${flag.rolloutPercentage || 0}%`,
              flag.metrics?.newUsers || 0,
              flag.metrics?.oldUsers || 0
            ]);
          }
        }

        console.log(table.toString());
      }
    } catch (error) {
      console.log(chalk.yellow('Could not fetch feature flag metrics'));
    }
  }

  private generateSummary(): void {
    console.log(chalk.blue.bold('\n📈 Migration Test Summary\n'));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;

    const successRate = Math.round((passed / total) * 100);

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${chalk.green(passed)}`);
    console.log(`Failed: ${chalk.red(failed)}`);
    console.log(`Skipped: ${chalk.yellow(skipped)}`);
    console.log(`Success Rate: ${successRate >= 90 ? chalk.green(successRate + '%') : chalk.yellow(successRate + '%')}`);

    // Critical routes check
    const criticalFailures = PHASE1_ROUTES
      .filter(r => r.criticalRoute)
      .filter(r => {
        const result = this.results.find(res => res.route.includes(r.path));
        return result?.status === 'FAIL';
      });

    if (criticalFailures.length > 0) {
      console.log(chalk.red.bold('\n⚠️  CRITICAL ROUTES FAILED:'));
      criticalFailures.forEach(r => console.log(chalk.red(`  - ${r.name}`)));
    }

    // Recommendations
    console.log(chalk.blue.bold('\n💡 Recommendations:\n'));

    if (successRate === 100) {
      console.log(chalk.green('✓ All tests passing! Ready to increase rollout percentage.'));
    } else if (successRate >= 90) {
      console.log(chalk.yellow('⚠ Fix failing tests before increasing rollout.'));
    } else {
      console.log(chalk.red('✗ Significant issues detected. Do not increase rollout.'));
    }

    const slowRoutes = this.results.filter(r => r.responseTime > 200).length;
    if (slowRoutes > 0) {
      console.log(chalk.yellow(`⚠ ${slowRoutes} routes exceed 200ms response time target.`));
    }

    // Exit code based on results
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run tests
(async () => {
  const tester = new MigrationTester();
  await tester.runTests();
})();