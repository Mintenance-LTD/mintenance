/**
 * PERFORMANCE TESTING AUTOMATION PIPELINE
 * Comprehensive performance monitoring, benchmarking, and optimization tracking
 *
 * This pipeline provides:
 * - Automated performance monitoring during E2E tests
 * - Bundle size analysis and tracking
 * - Memory leak detection
 * - Network performance validation
 * - Core Web Vitals measurement
 * - Performance regression detection
 */

const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

class PerformanceTestingPipeline {
  constructor(options = {}) {
    this.resultsDir = options.resultsDir || path.join(__dirname, '../test-results/performance');
    this.baselineFile = path.join(this.resultsDir, 'performance-baseline.json');
    this.reportFile = path.join(this.resultsDir, 'performance-report.html');

    this.thresholds = {
      bundleSize: 2 * 1024 * 1024, // 2MB
      loadTime: 3000, // 3 seconds
      fcp: 1800, // First Contentful Paint
      lcp: 2500, // Largest Contentful Paint
      fid: 100, // First Input Delay
      cls: 0.1, // Cumulative Layout Shift
      memoryUsage: 50 * 1024 * 1024, // 50MB
      apiResponseTime: 1000, // 1 second
      ...options.thresholds,
    };

    this.metrics = {
      loadTimes: [],
      bundleAnalysis: null,
      coreWebVitals: {},
      memorySnapshots: [],
      networkRequests: [],
      userInteractions: [],
      customMetrics: new Map(),
    };

    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  // ============================================================================
  // INITIALIZATION & SETUP
  // ============================================================================

  async initialize() {
    await this.ensureDirectories();
    await this.loadBaseline();
    console.log('⚡ Performance Testing Pipeline initialized');
  }

  async ensureDirectories() {
    await fs.mkdir(this.resultsDir, { recursive: true });
  }

  async loadBaseline() {
    try {
      const baselineData = await fs.readFile(this.baselineFile, 'utf8');
      this.baseline = JSON.parse(baselineData);
      console.log('📊 Performance baseline loaded');
    } catch {
      this.baseline = null;
      console.log('📊 No performance baseline found, will create new one');
    }
  }

  // ============================================================================
  // CORE WEB VITALS MEASUREMENT
  // ============================================================================

  async measureCoreWebVitals(page) {
    console.log('📊 Measuring Core Web Vitals...');

    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {};
        const entries = [];

        // Create a performance observer for Core Web Vitals
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            entries.push({
              name: entry.name,
              startTime: entry.startTime,
              value: entry.value || entry.startTime,
              entryType: entry.entryType,
            });

            // Collect specific vitals
            switch (entry.entryType) {
              case 'largest-contentful-paint':
                vitals.lcp = entry.startTime;
                break;
              case 'first-input':
                vitals.fid = entry.processingStart - entry.startTime;
                break;
              case 'layout-shift':
                if (!vitals.cls) vitals.cls = 0;
                if (!entry.hadRecentInput) {
                  vitals.cls += entry.value;
                }
                break;
            }
          }
        });

        // Observe Core Web Vitals
        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

        // Get navigation timing
        const navigationEntry = performance.getEntriesByType('navigation')[0];
        if (navigationEntry) {
          vitals.fcp = navigationEntry.responseStart - navigationEntry.navigationStart;
          vitals.loadTime = navigationEntry.loadEventEnd - navigationEntry.navigationStart;
          vitals.domContentLoaded = navigationEntry.domContentLoadedEventEnd - navigationEntry.navigationStart;
          vitals.timeToInteractive = navigationEntry.domInteractive - navigationEntry.navigationStart;
        }

        // Get paint timing
        const paintEntries = performance.getEntriesByType('paint');
        for (const entry of paintEntries) {
          if (entry.name === 'first-contentful-paint') {
            vitals.fcp = entry.startTime;
          }
        }

        // Measure memory usage if available
        if (performance.memory) {
          vitals.memoryUsage = {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit,
          };
        }

        // Return results after a delay to collect layout shifts
        setTimeout(() => {
          resolve({
            vitals,
            allEntries: entries,
            timestamp: Date.now(),
          });
        }, 3000);
      });
    });

    this.metrics.coreWebVitals = webVitals;
    return webVitals;
  }

  // ============================================================================
  // LOAD TIME MEASUREMENT
  // ============================================================================

  async measureLoadTime(page, testName) {
    console.log(`⏱️ Measuring load time for ${testName}...`);

    const startTime = performance.now();

    // Navigate and wait for load
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => document.readyState === 'complete');

    const endTime = performance.now();
    const loadTime = endTime - startTime;

    // Get detailed timing information
    const timingData = await page.evaluate(() => {
      const timing = performance.timing;
      const navigationStart = timing.navigationStart;

      return {
        navigationStart: 0,
        redirectTime: timing.redirectEnd - timing.redirectStart,
        dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
        connectTime: timing.connectEnd - timing.connectStart,
        requestTime: timing.responseStart - timing.requestStart,
        responseTime: timing.responseEnd - timing.responseStart,
        domProcessingTime: timing.domInteractive - timing.responseEnd,
        domContentLoadedTime: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
        loadEventTime: timing.loadEventEnd - timing.loadEventStart,
        totalTime: timing.loadEventEnd - navigationStart,
      };
    });

    const loadMetrics = {
      testName,
      timestamp: Date.now(),
      clientLoadTime: loadTime,
      serverTimings: timingData,
      passed: loadTime <= this.thresholds.loadTime,
    };

    this.metrics.loadTimes.push(loadMetrics);
    return loadMetrics;
  }

  // ============================================================================
  // BUNDLE SIZE ANALYSIS
  // ============================================================================

  async analyzeBundleSize(buildPath) {
    console.log('📦 Analyzing bundle size...');

    try {
      const stats = await this.getBuildStats(buildPath);
      const analysis = await this.analyzeAssets(stats);

      this.metrics.bundleAnalysis = {
        timestamp: Date.now(),
        totalSize: analysis.totalSize,
        jsSize: analysis.jsSize,
        cssSize: analysis.cssSize,
        assetSize: analysis.assetSize,
        chunkSizes: analysis.chunks,
        recommendations: this.generateBundleRecommendations(analysis),
        passed: analysis.totalSize <= this.thresholds.bundleSize,
      };

      return this.metrics.bundleAnalysis;
    } catch (error) {
      console.error('Failed to analyze bundle:', error);
      return null;
    }
  }

  async getBuildStats(buildPath) {
    const files = await fs.readdir(buildPath, { withFileTypes: true });
    const stats = [];

    for (const file of files) {
      if (file.isFile()) {
        const filePath = path.join(buildPath, file.name);
        const stat = await fs.stat(filePath);
        stats.push({
          name: file.name,
          size: stat.size,
          type: this.getFileType(file.name),
        });
      }
    }

    return stats;
  }

  analyzeAssets(stats) {
    const analysis = {
      totalSize: 0,
      jsSize: 0,
      cssSize: 0,
      assetSize: 0,
      chunks: [],
    };

    for (const file of stats) {
      analysis.totalSize += file.size;

      switch (file.type) {
        case 'javascript':
          analysis.jsSize += file.size;
          if (file.name.includes('chunk') || file.name.includes('bundle')) {
            analysis.chunks.push({
              name: file.name,
              size: file.size,
              type: 'js',
            });
          }
          break;
        case 'css':
          analysis.cssSize += file.size;
          break;
        default:
          analysis.assetSize += file.size;
      }
    }

    return analysis;
  }

  getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.js':
      case '.jsx':
      case '.ts':
      case '.tsx':
        return 'javascript';
      case '.css':
      case '.scss':
      case '.sass':
        return 'css';
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.svg':
      case '.webp':
        return 'image';
      case '.woff':
      case '.woff2':
      case '.ttf':
      case '.otf':
        return 'font';
      default:
        return 'other';
    }
  }

  generateBundleRecommendations(analysis) {
    const recommendations = [];

    if (analysis.totalSize > this.thresholds.bundleSize) {
      recommendations.push('Bundle size exceeds threshold - consider code splitting');
    }

    if (analysis.jsSize > analysis.totalSize * 0.7) {
      recommendations.push('JavaScript comprises >70% of bundle - optimize JS code');
    }

    const largeChunks = analysis.chunks.filter(chunk => chunk.size > 500 * 1024);
    if (largeChunks.length > 0) {
      recommendations.push(`Large chunks detected: ${largeChunks.map(c => c.name).join(', ')}`);
    }

    if (analysis.assetSize > analysis.totalSize * 0.4) {
      recommendations.push('Assets comprise >40% of bundle - optimize images and fonts');
    }

    return recommendations;
  }

  // ============================================================================
  // MEMORY MONITORING
  // ============================================================================

  async startMemoryMonitoring(page) {
    console.log('🧠 Starting memory monitoring...');

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      if (!this.isMonitoring) return;

      try {
        const memorySnapshot = await this.captureMemorySnapshot(page);
        this.metrics.memorySnapshots.push(memorySnapshot);

        // Check for memory leaks
        if (this.metrics.memorySnapshots.length > 10) {
          const leak = this.detectMemoryLeak();
          if (leak) {
            console.warn('🚨 Potential memory leak detected:', leak);
          }
        }
      } catch (error) {
        console.error('Memory monitoring error:', error);
      }
    }, 5000); // Every 5 seconds
  }

  async captureMemorySnapshot(page) {
    const memoryInfo = await page.evaluate(() => {
      const memory = {};

      if (performance.memory) {
        memory.heap = {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
        };
      }

      // Count DOM nodes
      memory.domNodes = document.querySelectorAll('*').length;

      // Count event listeners (approximation)
      memory.eventListeners = document.querySelectorAll('[onclick], [onload], [onerror]').length;

      // Check for detached DOM nodes
      memory.detachedNodes = this.countDetachedNodes?.() || 0;

      return memory;
    });

    return {
      timestamp: Date.now(),
      ...memoryInfo,
    };
  }

  detectMemoryLeak() {
    const recent = this.metrics.memorySnapshots.slice(-10);
    if (recent.length < 10) return null;

    const firstUsage = recent[0].heap?.used || 0;
    const lastUsage = recent[recent.length - 1].heap?.used || 0;
    const growthRate = (lastUsage - firstUsage) / firstUsage;

    if (growthRate > 0.2) { // 20% growth
      return {
        type: 'heap_growth',
        growthRate: growthRate * 100,
        startUsage: firstUsage,
        endUsage: lastUsage,
      };
    }

    // Check for DOM node growth
    const firstNodes = recent[0].domNodes || 0;
    const lastNodes = recent[recent.length - 1].domNodes || 0;
    const nodeGrowth = (lastNodes - firstNodes) / firstNodes;

    if (nodeGrowth > 0.3) { // 30% growth
      return {
        type: 'dom_growth',
        growthRate: nodeGrowth * 100,
        startNodes: firstNodes,
        endNodes: lastNodes,
      };
    }

    return null;
  }

  stopMemoryMonitoring() {
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('🧠 Memory monitoring stopped');
  }

  // ============================================================================
  // NETWORK PERFORMANCE
  // ============================================================================

  async monitorNetworkPerformance(page) {
    console.log('🌐 Monitoring network performance...');

    const networkRequests = [];

    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        startTime: Date.now(),
      });
    });

    page.on('response', response => {
      const request = networkRequests.find(req =>
        req.url === response.url() && !req.endTime
      );

      if (request) {
        request.endTime = Date.now();
        request.duration = request.endTime - request.startTime;
        request.status = response.status();
        request.size = response.headers()['content-length'] || 0;
      }
    });

    this.metrics.networkRequests = networkRequests;
    return networkRequests;
  }

  analyzeNetworkPerformance() {
    const analysis = {
      totalRequests: this.metrics.networkRequests.length,
      averageResponseTime: 0,
      slowRequests: [],
      failedRequests: [],
      largeRequests: [],
      cacheHitRatio: 0,
    };

    let totalDuration = 0;
    let cacheHits = 0;

    for (const request of this.metrics.networkRequests) {
      if (request.duration) {
        totalDuration += request.duration;

        if (request.duration > this.thresholds.apiResponseTime) {
          analysis.slowRequests.push(request);
        }
      }

      if (request.status >= 400) {
        analysis.failedRequests.push(request);
      }

      if (request.size > 1024 * 1024) { // 1MB
        analysis.largeRequests.push(request);
      }

      if (request.status === 304 || request.resourceType === 'cached') {
        cacheHits++;
      }
    }

    if (analysis.totalRequests > 0) {
      analysis.averageResponseTime = totalDuration / analysis.totalRequests;
      analysis.cacheHitRatio = cacheHits / analysis.totalRequests;
    }

    return analysis;
  }

  // ============================================================================
  // USER INTERACTION TRACKING
  // ============================================================================

  async trackUserInteractions(page) {
    await page.addInitScript(() => {
      const interactions = [];

      function trackInteraction(type, target, timestamp) {
        interactions.push({
          type,
          target: target.tagName + (target.id ? `#${target.id}` : ''),
          timestamp,
        });
      }

      document.addEventListener('click', (e) => trackInteraction('click', e.target, Date.now()));
      document.addEventListener('keydown', (e) => trackInteraction('keydown', e.target, Date.now()));
      document.addEventListener('scroll', () => trackInteraction('scroll', document.body, Date.now()));

      window.__getInteractions = () => interactions;
    });
  }

  async getInteractionMetrics(page) {
    const interactions = await page.evaluate(() => window.__getInteractions?.() || []);

    const analysis = {
      totalInteractions: interactions.length,
      interactionTypes: {},
      averageResponseTime: 0,
      slowInteractions: [],
    };

    let previousTimestamp = null;
    let totalResponseTime = 0;

    for (const interaction of interactions) {
      analysis.interactionTypes[interaction.type] =
        (analysis.interactionTypes[interaction.type] || 0) + 1;

      if (previousTimestamp) {
        const responseTime = interaction.timestamp - previousTimestamp;
        totalResponseTime += responseTime;

        if (responseTime > 100) { // Slow interaction threshold
          analysis.slowInteractions.push({
            ...interaction,
            responseTime,
          });
        }
      }

      previousTimestamp = interaction.timestamp;
    }

    if (interactions.length > 1) {
      analysis.averageResponseTime = totalResponseTime / (interactions.length - 1);
    }

    this.metrics.userInteractions = analysis;
    return analysis;
  }

  // ============================================================================
  // PERFORMANCE REGRESSION DETECTION
  // ============================================================================

  detectRegressions() {
    if (!this.baseline) return { hasRegressions: false, message: 'No baseline available' };

    const regressions = [];
    const current = this.getCurrentMetrics();

    // Check load time regression
    if (current.averageLoadTime > this.baseline.averageLoadTime * 1.2) {
      regressions.push({
        metric: 'Load Time',
        baseline: this.baseline.averageLoadTime,
        current: current.averageLoadTime,
        regression: ((current.averageLoadTime / this.baseline.averageLoadTime) - 1) * 100,
      });
    }

    // Check bundle size regression
    if (current.bundleSize > this.baseline.bundleSize * 1.1) {
      regressions.push({
        metric: 'Bundle Size',
        baseline: this.baseline.bundleSize,
        current: current.bundleSize,
        regression: ((current.bundleSize / this.baseline.bundleSize) - 1) * 100,
      });
    }

    // Check Core Web Vitals regressions
    const vitalsRegressions = this.checkVitalsRegressions(current.coreWebVitals, this.baseline.coreWebVitals);
    regressions.push(...vitalsRegressions);

    return {
      hasRegressions: regressions.length > 0,
      regressions,
      summary: `Found ${regressions.length} performance regressions`,
    };
  }

  checkVitalsRegressions(current, baseline) {
    const regressions = [];
    const vitalsToCheck = ['lcp', 'fid', 'cls', 'fcp'];

    for (const vital of vitalsToCheck) {
      if (baseline[vital] && current[vital]) {
        const regressionThreshold = vital === 'cls' ? 0.02 : baseline[vital] * 0.2; // 20% or 0.02 for CLS

        if (current[vital] > baseline[vital] + regressionThreshold) {
          regressions.push({
            metric: vital.toUpperCase(),
            baseline: baseline[vital],
            current: current[vital],
            regression: ((current[vital] / baseline[vital]) - 1) * 100,
          });
        }
      }
    }

    return regressions;
  }

  getCurrentMetrics() {
    return {
      averageLoadTime: this.metrics.loadTimes.reduce((sum, lt) => sum + lt.clientLoadTime, 0) / this.metrics.loadTimes.length || 0,
      bundleSize: this.metrics.bundleAnalysis?.totalSize || 0,
      coreWebVitals: this.metrics.coreWebVitals?.vitals || {},
      memoryUsage: this.metrics.memorySnapshots.length > 0 ?
        this.metrics.memorySnapshots[this.metrics.memorySnapshots.length - 1].heap?.used || 0 : 0,
    };
  }

  // ============================================================================
  // REPORTING
  // ============================================================================

  async generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(),
      metrics: this.metrics,
      regressions: this.detectRegressions(),
      recommendations: this.generateRecommendations(),
      thresholds: this.thresholds,
    };

    // Save JSON report
    const jsonPath = path.join(this.resultsDir, 'performance-results.json');
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    await this.generateHTMLReport(report);

    // Update baseline if this is a good run
    if (!report.regressions.hasRegressions) {
      await this.updateBaseline();
    }

    console.log(`📊 Performance report generated: ${this.reportFile}`);
    return report;
  }

  generateSummary() {
    const current = this.getCurrentMetrics();

    return {
      loadTime: {
        average: current.averageLoadTime,
        passed: current.averageLoadTime <= this.thresholds.loadTime,
      },
      bundleSize: {
        total: current.bundleSize,
        passed: current.bundleSize <= this.thresholds.bundleSize,
      },
      coreWebVitals: {
        lcp: current.coreWebVitals.lcp,
        fid: current.coreWebVitals.fid,
        cls: current.coreWebVitals.cls,
        passed: this.checkVitalsPassed(current.coreWebVitals),
      },
      memoryUsage: {
        peak: Math.max(...this.metrics.memorySnapshots.map(s => s.heap?.used || 0)),
        passed: current.memoryUsage <= this.thresholds.memoryUsage,
      },
    };
  }

  checkVitalsPassed(vitals) {
    return (vitals.lcp || 0) <= this.thresholds.lcp &&
           (vitals.fid || 0) <= this.thresholds.fid &&
           (vitals.cls || 0) <= this.thresholds.cls;
  }

  generateRecommendations() {
    const recommendations = [];
    const current = this.getCurrentMetrics();

    if (current.averageLoadTime > this.thresholds.loadTime) {
      recommendations.push('Optimize load time: Consider code splitting and lazy loading');
    }

    if (current.bundleSize > this.thresholds.bundleSize) {
      recommendations.push('Reduce bundle size: Remove unused dependencies and implement tree shaking');
    }

    if (current.coreWebVitals.lcp > this.thresholds.lcp) {
      recommendations.push('Improve LCP: Optimize largest contentful paint element');
    }

    if (current.coreWebVitals.cls > this.thresholds.cls) {
      recommendations.push('Reduce CLS: Set dimensions for images and avoid layout shifts');
    }

    if (this.metrics.networkRequests.filter(r => r.duration > 1000).length > 5) {
      recommendations.push('Optimize API calls: Reduce number of slow network requests');
    }

    return recommendations;
  }

  async generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .metric-card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
        .passed { border-left: 4px solid #28a745; }
        .failed { border-left: 4px solid #dc3545; }
        .metric-value { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .chart-container { margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .regressions { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚡ Performance Test Report</h1>
        <p>Generated: ${report.timestamp}</p>
    </div>

    ${this.generateSummaryHTML(report.summary)}
    ${report.regressions.hasRegressions ? this.generateRegressionsHTML(report.regressions) : ''}
    ${this.generateRecommendationsHTML(report.recommendations)}
    ${this.generateChartsHTML(report.metrics)}
</body>
</html>`;

    await fs.writeFile(this.reportFile, html);
  }

  generateSummaryHTML(summary) {
    return `
<div class="summary">
    <div class="metric-card ${summary.loadTime.passed ? 'passed' : 'failed'}">
        <h3>Load Time</h3>
        <div class="metric-value">${summary.loadTime.average.toFixed(0)}ms</div>
        <div>Threshold: ${this.thresholds.loadTime}ms</div>
    </div>
    <div class="metric-card ${summary.bundleSize.passed ? 'passed' : 'failed'}">
        <h3>Bundle Size</h3>
        <div class="metric-value">${(summary.bundleSize.total / 1024 / 1024).toFixed(2)}MB</div>
        <div>Threshold: ${(this.thresholds.bundleSize / 1024 / 1024).toFixed(2)}MB</div>
    </div>
    <div class="metric-card ${summary.coreWebVitals.passed ? 'passed' : 'failed'}">
        <h3>Core Web Vitals</h3>
        <div>LCP: ${(summary.coreWebVitals.lcp || 0).toFixed(0)}ms</div>
        <div>FID: ${(summary.coreWebVitals.fid || 0).toFixed(0)}ms</div>
        <div>CLS: ${(summary.coreWebVitals.cls || 0).toFixed(3)}</div>
    </div>
    <div class="metric-card ${summary.memoryUsage.passed ? 'passed' : 'failed'}">
        <h3>Memory Usage</h3>
        <div class="metric-value">${(summary.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB</div>
        <div>Threshold: ${(this.thresholds.memoryUsage / 1024 / 1024).toFixed(2)}MB</div>
    </div>
</div>`;
  }

  generateRegressionsHTML(regressions) {
    if (!regressions.hasRegressions) return '';

    return `
<div class="regressions">
    <h3>🚨 Performance Regressions Detected</h3>
    <ul>
        ${regressions.regressions.map(reg => `
            <li>${reg.metric}: ${reg.regression.toFixed(1)}% slower (${reg.current} vs ${reg.baseline})</li>
        `).join('')}
    </ul>
</div>`;
  }

  generateRecommendationsHTML(recommendations) {
    if (recommendations.length === 0) return '';

    return `
<div class="recommendations">
    <h3>💡 Performance Recommendations</h3>
    <ul>
        ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
</div>`;
  }

  generateChartsHTML(metrics) {
    return `
<div class="chart-container">
    <h3>📈 Performance Trends</h3>
    <p>Load Time Trend: ${metrics.loadTimes.map(lt => lt.clientLoadTime.toFixed(0)).join('ms, ')}ms</p>
    <p>Memory Usage Trend: ${metrics.memorySnapshots.slice(-5).map(s => (s.heap?.used / 1024 / 1024).toFixed(1)).join('MB, ')}MB</p>
</div>`;
  }

  async updateBaseline() {
    const newBaseline = this.getCurrentMetrics();
    newBaseline.timestamp = new Date().toISOString();

    await fs.writeFile(this.baselineFile, JSON.stringify(newBaseline, null, 2));
    this.baseline = newBaseline;
    console.log('📊 Performance baseline updated');
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async cleanup() {
    this.stopMemoryMonitoring();

    // Archive old reports
    const archiveDir = path.join(this.resultsDir, 'archive');
    await fs.mkdir(archiveDir, { recursive: true });

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      await fs.rename(this.reportFile, path.join(archiveDir, `performance-report-${timestamp}.html`));
    } catch (error) {
      console.warn('Failed to archive old report:', error.message);
    }

    console.log('🧹 Performance testing pipeline cleanup complete');
  }
}

module.exports = { PerformanceTestingPipeline };