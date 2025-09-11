#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📊 Performance Monitoring Dashboard');
console.log('==================================\n');

// Performance budgets configuration
const PERFORMANCE_BUDGETS = {
  bundleSize: {
    warning: 15 * 1024 * 1024, // 15MB
    error: 20 * 1024 * 1024, // 20MB
  },
  memoryUsage: {
    warning: 150 * 1024 * 1024, // 150MB
    error: 300 * 1024 * 1024, // 300MB
  },
  startupTime: {
    warning: 3000, // 3 seconds
    error: 5000, // 5 seconds
  },
  apiResponseTime: {
    warning: 2000, // 2 seconds
    error: 5000, // 5 seconds
  },
};

class PerformanceDashboard {
  constructor() {
    this.metrics = {};
    this.violations = [];
    this.recommendations = [];
  }

  async generateReport() {
    console.log('🏃‍♂️ Generating performance report...\n');

    // Analyze bundle size
    await this.analyzeBundleSize();

    // Check performance monitors in code
    this.analyzePerformanceMonitoring();

    // Analyze dependencies
    this.analyzeDependencies();

    // Generate recommendations
    this.generateRecommendations();

    // Create dashboard HTML
    this.createDashboard();

    // Print summary
    this.printSummary();
  }

  async analyzeBundleSize() {
    console.log('📦 Analyzing bundle size...');

    try {
      // Create a production build analysis
      const buildOutput = execSync(
        'npx expo export --platform android --dev false',
        {
          stdio: 'pipe',
          encoding: 'utf8',
        }
      );

      // Get bundle size (simplified - would need more sophisticated analysis)
      const bundlePath = './dist/bundles';
      if (fs.existsSync(bundlePath)) {
        const files = fs.readdirSync(bundlePath);
        let totalSize = 0;

        files.forEach((file) => {
          const filePath = path.join(bundlePath, file);
          if (fs.statSync(filePath).isFile()) {
            totalSize += fs.statSync(filePath).size;
          }
        });

        this.metrics.bundleSize = totalSize;

        console.log(
          `   Bundle size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`
        );

        if (totalSize > PERFORMANCE_BUDGETS.bundleSize.error) {
          this.violations.push({
            type: 'bundle_size',
            severity: 'error',
            actual: totalSize,
            threshold: PERFORMANCE_BUDGETS.bundleSize.error,
            message: `Bundle size exceeds error threshold`,
          });
        } else if (totalSize > PERFORMANCE_BUDGETS.bundleSize.warning) {
          this.violations.push({
            type: 'bundle_size',
            severity: 'warning',
            actual: totalSize,
            threshold: PERFORMANCE_BUDGETS.bundleSize.warning,
            message: `Bundle size exceeds warning threshold`,
          });
        }
      }
    } catch (error) {
      console.log('   ⚠️  Could not analyze bundle size:', error.message);
    }

    console.log();
  }

  analyzePerformanceMonitoring() {
    console.log('⚡ Analyzing performance monitoring implementation...');

    // Check if performance monitor is implemented
    const performanceMonitorPath = './src/utils/performanceMonitor.ts';
    if (fs.existsSync(performanceMonitorPath)) {
      console.log('   ✅ Performance monitor found');

      const content = fs.readFileSync(performanceMonitorPath, 'utf8');

      // Check for different monitoring features
      const features = [
        { name: 'Memory monitoring', pattern: /recordMemoryUsage/ },
        {
          name: 'API response time tracking',
          pattern: /recordApiResponseTime/,
        },
        { name: 'Navigation timing', pattern: /recordNavigationTime/ },
        { name: 'Startup time tracking', pattern: /recordStartupTime/ },
        { name: 'FPS monitoring', pattern: /recordFPS/ },
      ];

      features.forEach((feature) => {
        if (feature.pattern.test(content)) {
          console.log(`   ✅ ${feature.name} implemented`);
        } else {
          console.log(`   ❌ ${feature.name} missing`);
          this.recommendations.push(`Implement ${feature.name.toLowerCase()}`);
        }
      });
    } else {
      console.log('   ❌ Performance monitor not found');
      this.violations.push({
        type: 'performance_monitoring',
        severity: 'warning',
        message: 'Performance monitoring not implemented',
      });
    }

    console.log();
  }

  analyzeDependencies() {
    console.log('📚 Analyzing dependencies for performance impact...');

    const packageJsonPath = './package.json';
    if (!fs.existsSync(packageJsonPath)) {
      console.log('   ❌ package.json not found');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Known heavy dependencies
    const heavyDependencies = [
      'react-native-maps',
      'react-native-video',
      '@react-native-community/blur',
      'react-native-svg',
      'lottie-react-native',
    ];

    let heavyCount = 0;
    heavyDependencies.forEach((dep) => {
      if (dependencies[dep]) {
        console.log(`   ⚠️  Heavy dependency detected: ${dep}`);
        heavyCount++;
      }
    });

    if (heavyCount > 3) {
      this.violations.push({
        type: 'dependencies',
        severity: 'warning',
        message: `${heavyCount} heavy dependencies detected. Consider code splitting.`,
      });
    }

    console.log(`   Total dependencies: ${Object.keys(dependencies).length}`);
    console.log(`   Heavy dependencies: ${heavyCount}`);
    console.log();
  }

  generateRecommendations() {
    console.log('💡 Generating performance recommendations...');

    // Bundle size recommendations
    if (this.metrics.bundleSize) {
      const sizeMB = this.metrics.bundleSize / 1024 / 1024;
      if (sizeMB > 10) {
        this.recommendations.push(
          'Consider implementing code splitting to reduce bundle size'
        );
        this.recommendations.push(
          'Use dynamic imports for rarely used features'
        );
        this.recommendations.push(
          'Enable tree shaking for unused code elimination'
        );
      }
    }

    // Check for potential optimizations
    const srcFiles = this.findFiles('./src', /\.(ts|tsx)$/);

    // Check for console.log statements (performance impact)
    let consoleLogCount = 0;
    srcFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      const matches = content.match(/console\.log/g);
      if (matches) {
        consoleLogCount += matches.length;
      }
    });

    if (consoleLogCount > 20) {
      this.recommendations.push(
        `Remove ${consoleLogCount} console.log statements for better performance`
      );
    }

    // Check for inline styles (performance anti-pattern)
    let inlineStyleCount = 0;
    srcFiles
      .filter((f) => f.endsWith('.tsx'))
      .forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const matches = content.match(/style=\{\{/g);
        if (matches) {
          inlineStyleCount += matches.length;
        }
      });

    if (inlineStyleCount > 10) {
      this.recommendations.push(
        `Replace ${inlineStyleCount} inline styles with StyleSheet for better performance`
      );
    }

    console.log();
  }

  createDashboard() {
    console.log('🎨 Creating performance dashboard...');

    const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mintenance - Performance Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; 
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric-card { 
            background: white; 
            border-radius: 8px; 
            padding: 20px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .metric-value { font-size: 2.5em; font-weight: bold; color: #007bff; }
        .metric-label { font-size: 0.9em; color: #666; margin-top: 8px; }
        .violations { margin: 20px 0; }
        .violation { 
            padding: 10px; 
            margin: 10px 0; 
            border-radius: 4px; 
            border-left: 4px solid;
        }
        .violation.error { background: #f8d7da; border-color: #dc3545; }
        .violation.warning { background: #fff3cd; border-color: #ffc107; }
        .recommendations { margin: 20px 0; }
        .recommendation { 
            background: #d1ecf1; 
            padding: 10px; 
            margin: 10px 0; 
            border-radius: 4px; 
            border-left: 4px solid #17a2b8;
        }
        .timestamp { text-align: center; color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 Mintenance Performance Dashboard</h1>
            <p>Real-time performance metrics and recommendations</p>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${this.metrics.bundleSize ? `${(this.metrics.bundleSize / 1024 / 1024).toFixed(1)}MB` : 'N/A'}</div>
                <div class="metric-label">Bundle Size</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.violations.length}</div>
                <div class="metric-label">Performance Violations</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.recommendations.length}</div>
                <div class="metric-label">Optimization Opportunities</div>
            </div>
        </div>
        
        ${
          this.violations.length > 0
            ? `
        <div class="violations">
            <h2>⚠️ Performance Violations</h2>
            ${this.violations
              .map(
                (v) => `
                <div class="violation ${v.severity}">
                    <strong>${v.type.replace('_', ' ').toUpperCase()}</strong>: ${v.message}
                    ${v.actual ? `<br>Actual: ${v.actual}, Threshold: ${v.threshold}` : ''}
                </div>
            `
              )
              .join('')}
        </div>
        `
            : ''
        }
        
        ${
          this.recommendations.length > 0
            ? `
        <div class="recommendations">
            <h2>💡 Performance Recommendations</h2>
            ${this.recommendations
              .map(
                (r) => `
                <div class="recommendation">${r}</div>
            `
              )
              .join('')}
        </div>
        `
            : ''
        }
        
        <div class="timestamp">
            Generated on ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync('./performance-dashboard.html', dashboardHTML);
    console.log('   ✅ Dashboard created: ./performance-dashboard.html');
    console.log();
  }

  printSummary() {
    console.log('📋 Performance Summary');
    console.log('====================');

    if (this.violations.length === 0) {
      console.log('✅ No performance violations detected!');
    } else {
      console.log(
        `❌ ${this.violations.length} performance violations detected:`
      );
      this.violations.forEach((v) => {
        console.log(`   ${v.severity.toUpperCase()}: ${v.message}`);
      });
    }

    if (this.recommendations.length > 0) {
      console.log(
        `\\n💡 ${this.recommendations.length} optimization opportunities:`
      );
      this.recommendations.slice(0, 5).forEach((r) => {
        console.log(`   • ${r}`);
      });

      if (this.recommendations.length > 5) {
        console.log(
          `   ... and ${this.recommendations.length - 5} more recommendations`
        );
      }
    }

    console.log(`\\n📊 Full report available at: ./performance-dashboard.html`);
  }

  findFiles(dir, pattern) {
    let results = [];

    if (!fs.existsSync(dir)) return results;

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
          results = results.concat(this.findFiles(filePath, pattern));
        }
      } else if (pattern.test(file)) {
        results.push(filePath);
      }
    }

    return results;
  }
}

async function main() {
  try {
    const dashboard = new PerformanceDashboard();
    await dashboard.generateReport();

    // Return appropriate exit code
    const criticalViolations = dashboard.violations.filter(
      (v) => v.severity === 'error'
    );
    if (criticalViolations.length > 0) {
      console.log('\\n❌ Critical performance issues detected.');
      process.exit(1);
    } else {
      console.log('\\n✅ Performance monitoring completed successfully.');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error generating performance dashboard:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PerformanceDashboard;
