// =====================================================
// Comprehensive Load Testing Suite for Mintenance
// Tests critical user flows under production load
// =====================================================

const { performance } = require('perf_hooks');
const axios = require('axios');
const WebSocket = require('ws');

// Test Configuration
const CONFIG = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  wsUrl: process.env.WS_BASE_URL || 'ws://localhost:3001',
  testUsers: parseInt(process.env.TEST_USERS) || 1000,
  rampUpSeconds: parseInt(process.env.RAMP_UP_SECONDS) || 60,
  testDurationMinutes: parseInt(process.env.TEST_DURATION_MINUTES) || 10,
  thresholds: {
    responseTime: 500, // ms
    errorRate: 0.01, // 1%
    throughput: 100, // requests per second
  },
};

// Performance Metrics Collector
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: [],
      errors: [],
      responseTimePercentiles: {},
      throughput: 0,
      concurrentUsers: 0,
      memoryUsage: [],
      dbConnections: [],
    };
  }

  recordRequest(endpoint, responseTime, success, statusCode) {
    this.metrics.requests.push({
      endpoint,
      responseTime,
      success,
      statusCode,
      timestamp: Date.now(),
    });

    if (!success) {
      this.metrics.errors.push({
        endpoint,
        statusCode,
        timestamp: Date.now(),
      });
    }
  }

  calculateMetrics() {
    const responseTimes = this.metrics.requests.map((r) => r.responseTime);
    const errors = this.metrics.errors.length;
    const totalRequests = this.metrics.requests.length;

    return {
      totalRequests,
      totalErrors: errors,
      errorRate: totalRequests > 0 ? errors / totalRequests : 0,
      avgResponseTime:
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      throughput: this.calculateThroughput(),
      memoryPeakUsage: Math.max(...this.metrics.memoryUsage),
    };
  }

  calculatePercentile(values, percentile) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  calculateThroughput() {
    const timeSpan =
      Math.max(...this.metrics.requests.map((r) => r.timestamp)) -
      Math.min(...this.metrics.requests.map((r) => r.timestamp));
    return this.metrics.requests.length / (timeSpan / 1000); // requests per second
  }
}

// Load Test Scenarios
class LoadTestScenarios {
  constructor(baseUrl, metricsCollector) {
    this.baseUrl = baseUrl;
    this.metrics = metricsCollector;
    this.authTokens = new Map(); // Store user tokens
  }

  // Scenario 1: User Registration and Authentication Flow
  async testUserRegistration(userId) {
    const startTime = performance.now();

    try {
      // Register new user
      const registerResponse = await axios.post(
        `${this.baseUrl}/api/auth/register`,
        {
          email: `loadtest${userId}@example.com`,
          password: 'LoadTest123!',
          firstName: 'Load',
          lastName: `Test${userId}`,
          userType: Math.random() > 0.5 ? 'homeowner' : 'contractor',
        }
      );

      const registrationTime = performance.now() - startTime;
      this.metrics.recordRequest(
        '/api/auth/register',
        registrationTime,
        true,
        201
      );

      // Login user
      const loginStart = performance.now();
      const loginResponse = await axios.post(`${this.baseUrl}/api/auth/login`, {
        email: `loadtest${userId}@example.com`,
        password: 'LoadTest123!',
      });

      const loginTime = performance.now() - loginStart;
      this.metrics.recordRequest('/api/auth/login', loginTime, true, 200);

      // Store auth token
      this.authTokens.set(userId, loginResponse.data.token);

      return true;
    } catch (error) {
      const totalTime = performance.now() - startTime;
      this.metrics.recordRequest(
        '/api/auth/register',
        totalTime,
        false,
        error.response?.status || 500
      );
      return false;
    }
  }

  // Scenario 2: Job Posting and AI Pricing
  async testJobPostingWithAIPricing(userId) {
    const token = this.authTokens.get(userId);
    if (!token) return false;

    const startTime = performance.now();

    try {
      // Create job with AI pricing analysis
      const jobData = {
        title: `Load Test Job ${userId}`,
        description:
          'Testing job creation under load with AI pricing analysis. Need plumbing repair for kitchen sink.',
        category: 'plumbing',
        location: 'Central London',
        urgency: 'medium',
      };

      const response = await axios.post(`${this.baseUrl}/api/jobs`, jobData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const responseTime = performance.now() - startTime;
      this.metrics.recordRequest('/api/jobs', responseTime, true, 201);

      // Test AI pricing endpoint
      const pricingStart = performance.now();
      const pricingResponse = await axios.post(
        `${this.baseUrl}/api/ai/pricing/analyze`,
        jobData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const pricingTime = performance.now() - pricingStart;
      this.metrics.recordRequest(
        '/api/ai/pricing/analyze',
        pricingTime,
        true,
        200
      );

      return true;
    } catch (error) {
      const totalTime = performance.now() - startTime;
      this.metrics.recordRequest(
        '/api/jobs',
        totalTime,
        false,
        error.response?.status || 500
      );
      return false;
    }
  }

  // Scenario 3: Complex Business Analytics Query
  async testBusinessAnalytics(userId) {
    const token = this.authTokens.get(userId);
    if (!token) return false;

    const startTime = performance.now();

    try {
      // Test business metrics calculation
      const metricsResponse = await axios.get(
        `${this.baseUrl}/api/business/metrics?period=monthly&months=6`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const metricsTime = performance.now() - startTime;
      this.metrics.recordRequest(
        '/api/business/metrics',
        metricsTime,
        true,
        200
      );

      // Test sustainability scoring
      const esgStart = performance.now();
      const esgResponse = await axios.get(
        `${this.baseUrl}/api/sustainability/esg-score`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const esgTime = performance.now() - esgStart;
      this.metrics.recordRequest(
        '/api/sustainability/esg-score',
        esgTime,
        true,
        200
      );

      return true;
    } catch (error) {
      const totalTime = performance.now() - startTime;
      this.metrics.recordRequest(
        '/api/business/metrics',
        totalTime,
        false,
        error.response?.status || 500
      );
      return false;
    }
  }

  // Scenario 4: Real-time Features (WebSocket)
  async testRealTimeFeatures(userId) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const ws = new WebSocket(`${this.wsUrl}?userId=${userId}`);

      ws.on('open', () => {
        // Send job update
        ws.send(
          JSON.stringify({
            type: 'job_update',
            jobId: `test-job-${userId}`,
            status: 'in_progress',
          })
        );
      });

      ws.on('message', (data) => {
        const responseTime = performance.now() - startTime;
        this.metrics.recordRequest('websocket', responseTime, true, 200);
        ws.close();
        resolve(true);
      });

      ws.on('error', () => {
        const responseTime = performance.now() - startTime;
        this.metrics.recordRequest('websocket', responseTime, false, 500);
        resolve(false);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        ws.close();
        resolve(false);
      }, 5000);
    });
  }

  // Scenario 5: Database-Heavy Operations
  async testDatabaseQueries(userId) {
    const token = this.authTokens.get(userId);
    if (!token) return false;

    const queries = [
      '/api/neighborhoods/leaderboard',
      '/api/contractors/rankings',
      '/api/jobs/search?category=plumbing&location=london',
      '/api/sustainability/materials/alternatives',
      '/api/business/financial-summary',
    ];

    const results = await Promise.all(
      queries.map(async (endpoint) => {
        const startTime = performance.now();
        try {
          await axios.get(`${this.baseUrl}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const responseTime = performance.now() - startTime;
          this.metrics.recordRequest(endpoint, responseTime, true, 200);
          return true;
        } catch (error) {
          const responseTime = performance.now() - startTime;
          this.metrics.recordRequest(
            endpoint,
            responseTime,
            false,
            error.response?.status || 500
          );
          return false;
        }
      })
    );

    return results.every((r) => r);
  }
}

// Main Load Test Runner
class LoadTestRunner {
  constructor() {
    this.metrics = new MetricsCollector();
    this.scenarios = new LoadTestScenarios(CONFIG.baseUrl, this.metrics);
    this.activeUsers = 0;
    this.testStartTime = null;
  }

  async runLoadTest() {
    console.log('🚀 Starting Mintenance Load Test Suite');
    console.log(`👥 Target Users: ${CONFIG.testUsers}`);
    console.log(`⏱️  Ramp-up: ${CONFIG.rampUpSeconds}s`);
    console.log(`🕐 Duration: ${CONFIG.testDurationMinutes}m`);
    console.log('');

    this.testStartTime = Date.now();

    // Start monitoring
    const monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 1000);

    // Ramp up users gradually
    const userPromises = [];
    const rampUpDelay = (CONFIG.rampUpSeconds * 1000) / CONFIG.testUsers;

    for (let i = 0; i < CONFIG.testUsers; i++) {
      setTimeout(() => {
        userPromises.push(this.simulateUser(i));
      }, i * rampUpDelay);
    }

    // Wait for test duration
    await new Promise((resolve) =>
      setTimeout(resolve, CONFIG.testDurationMinutes * 60 * 1000)
    );

    clearInterval(monitoringInterval);

    // Generate report
    await this.generateReport();
  }

  async simulateUser(userId) {
    this.activeUsers++;

    try {
      // User journey simulation
      const success1 = await this.scenarios.testUserRegistration(userId);
      if (!success1) return;

      await this.randomDelay(1000, 3000); // Think time

      const success2 = await this.scenarios.testJobPostingWithAIPricing(userId);
      if (!success2) return;

      await this.randomDelay(2000, 5000);

      const success3 = await this.scenarios.testBusinessAnalytics(userId);
      await this.randomDelay(1000, 2000);

      const success4 = await this.scenarios.testRealTimeFeatures(userId);
      await this.randomDelay(1000, 3000);

      const success5 = await this.scenarios.testDatabaseQueries(userId);

      // Repeat critical flows
      const iterations = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < iterations; i++) {
        await this.randomDelay(5000, 10000);
        await this.scenarios.testJobPostingWithAIPricing(userId);
      }
    } catch (error) {
      console.error(`User ${userId} failed:`, error.message);
    } finally {
      this.activeUsers--;
    }
  }

  randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  collectSystemMetrics() {
    // Collect memory usage
    if (process.memoryUsage) {
      this.metrics.metrics.memoryUsage.push(process.memoryUsage().heapUsed);
    }

    // Update concurrent users
    this.metrics.metrics.concurrentUsers = Math.max(
      this.metrics.metrics.concurrentUsers,
      this.activeUsers
    );
  }

  async generateReport() {
    const results = this.metrics.calculateMetrics();
    const testDuration = (Date.now() - this.testStartTime) / 1000;

    console.log('\n📊 LOAD TEST RESULTS');
    console.log('====================');
    console.log(`⏱️  Test Duration: ${Math.round(testDuration)}s`);
    console.log(`📈 Total Requests: ${results.totalRequests}`);
    console.log(`❌ Total Errors: ${results.totalErrors}`);
    console.log(`📉 Error Rate: ${(results.errorRate * 100).toFixed(2)}%`);
    console.log(`⚡ Throughput: ${results.throughput.toFixed(2)} req/s`);
    console.log(
      `👥 Peak Concurrent Users: ${this.metrics.metrics.concurrentUsers}`
    );
    console.log('');
    console.log('Response Times:');
    console.log(`  📊 Average: ${results.avgResponseTime.toFixed(2)}ms`);
    console.log(
      `  📊 95th Percentile: ${results.p95ResponseTime.toFixed(2)}ms`
    );
    console.log(
      `  📊 99th Percentile: ${results.p99ResponseTime.toFixed(2)}ms`
    );
    console.log(`  📊 Max: ${results.maxResponseTime.toFixed(2)}ms`);
    console.log('');

    // Performance Analysis
    this.analyzePerformance(results);

    // Save detailed report
    await this.saveDetailedReport(results, testDuration);
  }

  analyzePerformance(results) {
    console.log('🔍 PERFORMANCE ANALYSIS');
    console.log('========================');

    const issues = [];
    const recommendations = [];

    // Check response time threshold
    if (results.p95ResponseTime > CONFIG.thresholds.responseTime) {
      issues.push(
        `⚠️  95th percentile response time (${results.p95ResponseTime.toFixed(2)}ms) exceeds threshold (${CONFIG.thresholds.responseTime}ms)`
      );
      recommendations.push(
        '📝 Consider database query optimization and caching'
      );
    }

    // Check error rate threshold
    if (results.errorRate > CONFIG.thresholds.errorRate) {
      issues.push(
        `⚠️  Error rate (${(results.errorRate * 100).toFixed(2)}%) exceeds threshold (${(CONFIG.thresholds.errorRate * 100).toFixed(2)}%)`
      );
      recommendations.push(
        '📝 Investigate error patterns and implement better error handling'
      );
    }

    // Check throughput threshold
    if (results.throughput < CONFIG.thresholds.throughput) {
      issues.push(
        `⚠️  Throughput (${results.throughput.toFixed(2)} req/s) below target (${CONFIG.thresholds.throughput} req/s)`
      );
      recommendations.push(
        '📝 Scale application servers or optimize resource usage'
      );
    }

    if (issues.length === 0) {
      console.log('✅ All performance thresholds met!');
    } else {
      console.log('Issues Found:');
      issues.forEach((issue) => console.log(issue));
      console.log('');
      console.log('Recommendations:');
      recommendations.forEach((rec) => console.log(rec));
    }

    console.log('');
  }

  async saveDetailedReport(results, duration) {
    const report = {
      testConfiguration: CONFIG,
      testResults: results,
      testDuration: duration,
      timestamp: new Date().toISOString(),
      detailedMetrics: {
        requestBreakdown: this.getRequestBreakdown(),
        errorBreakdown: this.getErrorBreakdown(),
        performanceByEndpoint: this.getPerformanceByEndpoint(),
      },
    };

    // Save to file
    const fs = require('fs');
    const filename = `load-test-report-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));

    console.log(`📄 Detailed report saved: ${filename}`);
  }

  getRequestBreakdown() {
    const breakdown = {};
    this.metrics.metrics.requests.forEach((req) => {
      if (!breakdown[req.endpoint]) {
        breakdown[req.endpoint] = { count: 0, totalTime: 0, errors: 0 };
      }
      breakdown[req.endpoint].count++;
      breakdown[req.endpoint].totalTime += req.responseTime;
      if (!req.success) breakdown[req.endpoint].errors++;
    });

    // Calculate averages
    Object.keys(breakdown).forEach((endpoint) => {
      const data = breakdown[endpoint];
      data.avgResponseTime = data.totalTime / data.count;
      data.errorRate = data.errors / data.count;
    });

    return breakdown;
  }

  getErrorBreakdown() {
    const breakdown = {};
    this.metrics.metrics.errors.forEach((error) => {
      const key = `${error.endpoint}-${error.statusCode}`;
      breakdown[key] = (breakdown[key] || 0) + 1;
    });
    return breakdown;
  }

  getPerformanceByEndpoint() {
    const performance = {};
    this.metrics.metrics.requests.forEach((req) => {
      if (!performance[req.endpoint]) {
        performance[req.endpoint] = [];
      }
      performance[req.endpoint].push(req.responseTime);
    });

    // Calculate statistics for each endpoint
    Object.keys(performance).forEach((endpoint) => {
      const times = performance[endpoint];
      performance[endpoint] = {
        count: times.length,
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        p95: this.metrics.calculatePercentile(times, 95),
        p99: this.metrics.calculatePercentile(times, 99),
      };
    });

    return performance;
  }
}

// Run the load test
if (require.main === module) {
  const runner = new LoadTestRunner();
  runner.runLoadTest().catch(console.error);
}

module.exports = { LoadTestRunner, LoadTestScenarios, MetricsCollector };
