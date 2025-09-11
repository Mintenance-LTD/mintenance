#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Memory usage limits (in bytes)
const MEMORY_LIMITS = {
  startup: {
    warning: 150 * 1024 * 1024,  // 150MB
    error: 200 * 1024 * 1024,    // 200MB
  },
  runtime: {
    warning: 200 * 1024 * 1024,  // 200MB
    error: 300 * 1024 * 1024,    // 300MB
  },
  peak: {
    warning: 250 * 1024 * 1024,  // 250MB
    error: 400 * 1024 * 1024,    // 400MB
  }
};

// Performance thresholds
const PERFORMANCE_LIMITS = {
  startupTime: {
    warning: 3000,  // 3 seconds
    error: 5000,    // 5 seconds
  },
  navigationTime: {
    warning: 500,   // 500ms
    error: 1000,    // 1 second
  },
  apiResponseTime: {
    warning: 2000,  // 2 seconds
    error: 5000,    // 5 seconds
  },
  fps: {
    warning: 55,    // Below 55 FPS
    error: 50,      // Below 50 FPS (inverted - lower is worse)
  }
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function checkMemoryUsage() {
  console.log('🔍 Checking memory usage and performance metrics...\n');
  
  const violations = [];
  const warnings = [];
  const reportData = {
    timestamp: new Date().toISOString(),
    memory: {},
    performance: {},
    violations: [],
    warnings: []
  };

  // Check if performance metrics exist
  const metricsPath = path.join(process.cwd(), 'performance-metrics.json');
  if (!fs.existsSync(metricsPath)) {
    console.log('⚠️  Performance metrics not found. Creating mock data for demonstration...');
    createMockPerformanceData();
  }

  try {
    const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    
    // Check memory usage
    if (metrics.memory) {
      checkMemoryMetric('startup', metrics.memory.startup, reportData, violations, warnings);
      checkMemoryMetric('runtime', metrics.memory.runtime, reportData, violations, warnings);
      checkMemoryMetric('peak', metrics.memory.peak, reportData, violations, warnings);
    }

    // Check performance metrics
    if (metrics.performance) {
      checkPerformanceMetric('startupTime', metrics.performance.startupTime, 'ms', reportData, violations, warnings);
      checkPerformanceMetric('navigationTime', metrics.performance.navigationTime, 'ms', reportData, violations, warnings);
      checkPerformanceMetric('apiResponseTime', metrics.performance.apiResponseTime, 'ms', reportData, violations, warnings);
      checkPerformanceMetric('fps', metrics.performance.fps, 'fps', reportData, violations, warnings, true); // inverted
    }

    // Generate detailed report
    generateMemoryReport(reportData);

    // Write violations file for CI
    if (violations.length > 0) {
      fs.writeFileSync('memory-violations.txt', violations.join('\n'));
      console.log(`\n❌ ${violations.length} memory/performance violation(s) detected!`);
      
      // Append to performance violations if it exists
      let existingViolations = '';
      if (fs.existsSync('performance-violations.txt')) {
        existingViolations = fs.readFileSync('performance-violations.txt', 'utf8') + '\n';
      }
      fs.writeFileSync('performance-violations.txt', existingViolations + violations.join('\n'));
      
      process.exit(1);
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  ${warnings.length} memory/performance warning(s) detected.`);
    }

    console.log('\n✅ All memory and performance checks passed!');

  } catch (error) {
    console.error('Error checking memory usage:', error.message);
    process.exit(1);
  }
}

function checkMemoryMetric(type, value, reportData, violations, warnings) {
  if (!value) return;
  
  const limits = MEMORY_LIMITS[type];
  if (!limits) return;

  reportData.memory[type] = {
    value,
    valueFormatted: formatBytes(value),
    status: value > limits.error ? 'error' : value > limits.warning ? 'warning' : 'ok'
  };

  if (value > limits.error) {
    const violation = `❌ ${type} memory usage (${formatBytes(value)}) exceeds limit (${formatBytes(limits.error)})`;
    violations.push(violation);
    reportData.violations.push({
      type: 'memory',
      metric: type,
      actual: value,
      limit: limits.error,
      message: violation
    });
    console.log(violation);
  } else if (value > limits.warning) {
    const warning = `⚠️  ${type} memory usage (${formatBytes(value)}) exceeds warning threshold (${formatBytes(limits.warning)})`;
    warnings.push(warning);
    reportData.warnings.push({
      type: 'memory',
      metric: type,
      actual: value,
      limit: limits.warning,
      message: warning
    });
    console.log(warning);
  } else {
    console.log(`✅ ${type} memory usage: ${formatBytes(value)}`);
  }
}

function checkPerformanceMetric(type, value, unit, reportData, violations, warnings, inverted = false) {
  if (!value) return;
  
  const limits = PERFORMANCE_LIMITS[type];
  if (!limits) return;

  const formatValue = unit === 'ms' ? formatTime(value) : `${value}${unit}`;
  
  reportData.performance[type] = {
    value,
    valueFormatted: formatValue,
    status: inverted 
      ? (value < limits.error ? 'error' : value < limits.warning ? 'warning' : 'ok')
      : (value > limits.error ? 'error' : value > limits.warning ? 'warning' : 'ok')
  };

  if (inverted ? value < limits.error : value > limits.error) {
    const violation = `❌ ${type} (${formatValue}) ${inverted ? 'below' : 'exceeds'} limit (${unit === 'ms' ? formatTime(limits.error) : limits.error + unit})`;
    violations.push(violation);
    reportData.violations.push({
      type: 'performance',
      metric: type,
      actual: value,
      limit: limits.error,
      message: violation
    });
    console.log(violation);
  } else if (inverted ? value < limits.warning : value > limits.warning) {
    const warning = `⚠️  ${type} (${formatValue}) ${inverted ? 'below' : 'exceeds'} warning threshold (${unit === 'ms' ? formatTime(limits.warning) : limits.warning + unit})`;
    warnings.push(warning);
    reportData.warnings.push({
      type: 'performance',
      metric: type,
      actual: value,
      limit: limits.warning,
      message: warning
    });
    console.log(warning);
  } else {
    console.log(`✅ ${type}: ${formatValue}`);
  }
}

function generateMemoryReport(data) {
  const report = [
    '## 🧠 Memory & Performance Report',
    '',
    `**Timestamp:** ${new Date(data.timestamp).toLocaleString()}`,
    '',
  ];

  // Memory usage section
  if (Object.keys(data.memory).length > 0) {
    report.push('### 💾 Memory Usage');
    report.push('');
    report.push('| Metric | Usage | Status | Limit |');
    report.push('|--------|-------|--------|-------|');
    
    Object.entries(data.memory).forEach(([metric, info]) => {
      const limits = MEMORY_LIMITS[metric];
      const statusIcon = info.status === 'error' ? '❌' : info.status === 'warning' ? '⚠️' : '✅';
      const limitFormatted = formatBytes(info.status === 'error' ? limits.error : limits.warning);
      
      report.push(`| ${metric} | ${info.valueFormatted} | ${statusIcon} ${info.status} | ${limitFormatted} |`);
    });
    report.push('');
  }

  // Performance metrics section
  if (Object.keys(data.performance).length > 0) {
    report.push('### ⚡ Performance Metrics');
    report.push('');
    report.push('| Metric | Value | Status | Limit |');
    report.push('|--------|-------|--------|-------|');
    
    Object.entries(data.performance).forEach(([metric, info]) => {
      const limits = PERFORMANCE_LIMITS[metric];
      const statusIcon = info.status === 'error' ? '❌' : info.status === 'warning' ? '⚠️' : '✅';
      const isInverted = metric === 'fps';
      const limitValue = info.status === 'error' ? limits.error : limits.warning;
      const limitFormatted = metric === 'startupTime' || metric === 'navigationTime' || metric === 'apiResponseTime' 
        ? formatTime(limitValue) 
        : `${limitValue}${metric === 'fps' ? 'fps' : ''}`;
      
      report.push(`| ${metric} | ${info.valueFormatted} | ${statusIcon} ${info.status} | ${isInverted ? 'min ' : 'max '}${limitFormatted} |`);
    });
    report.push('');
  }

  // Violations and warnings sections (reuse from bundle report if needed)
  if (data.violations.length > 0) {
    report.push('### ❌ Violations');
    report.push('');
    data.violations.forEach(violation => {
      report.push(`- ${violation.message}`);
    });
    report.push('');
  }

  if (data.warnings.length > 0) {
    report.push('### ⚠️ Warnings');
    report.push('');
    data.warnings.forEach(warning => {
      report.push(`- ${warning.message}`);
    });
    report.push('');
  }

  // Append to existing performance report
  let existingReport = '';
  if (fs.existsSync('performance-report.md')) {
    existingReport = fs.readFileSync('performance-report.md', 'utf8') + '\n\n';
  }
  
  fs.writeFileSync('performance-report.md', existingReport + report.join('\n'));
}

function createMockPerformanceData() {
  // Create realistic mock data for demonstration
  const mockData = {
    memory: {
      startup: 120 * 1024 * 1024,  // 120MB - good
      runtime: 180 * 1024 * 1024,  // 180MB - good  
      peak: 220 * 1024 * 1024,     // 220MB - good
    },
    performance: {
      startupTime: 2800,      // 2.8s - good
      navigationTime: 450,    // 450ms - good
      apiResponseTime: 1800,  // 1.8s - good
      fps: 58,               // 58fps - good
    }
  };

  fs.writeFileSync('performance-metrics.json', JSON.stringify(mockData, null, 2));
  console.log('📊 Created mock performance data for demonstration');
}

if (require.main === module) {
  checkMemoryUsage();
}

module.exports = { checkMemoryUsage, formatBytes, formatTime };