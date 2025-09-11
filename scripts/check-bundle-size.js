#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Bundle size limits (in bytes)
const BUNDLE_SIZE_LIMITS = {
  android: {
    warning: 20 * 1024 * 1024, // 20MB
    error: 25 * 1024 * 1024,   // 25MB
  },
  ios: {
    warning: 20 * 1024 * 1024, // 20MB
    error: 25 * 1024 * 1024,   // 25MB
  },
  web: {
    warning: 5 * 1024 * 1024,  // 5MB
    error: 10 * 1024 * 1024,   // 10MB
  },
};

// Asset size limits
const ASSET_LIMITS = {
  image: {
    warning: 500 * 1024,  // 500KB
    error: 1024 * 1024,   // 1MB
  },
  font: {
    warning: 100 * 1024,  // 100KB
    error: 200 * 1024,    // 200KB
  },
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function checkBundleSize() {
  console.log('🔍 Checking bundle sizes...\n');
  
  const violations = [];
  const warnings = [];
  const reportData = {
    platform: process.env.PLATFORM || 'all',
    timestamp: new Date().toISOString(),
    bundles: [],
    assets: [],
    violations: [],
    warnings: []
  };

  // Check if bundle analysis report exists
  const reportPath = path.join(process.cwd(), 'bundle-analysis-report.json');
  if (!fs.existsSync(reportPath)) {
    console.log('⚠️  Bundle analysis report not found. Run `npm run bundle:analyze` first.');
    return;
  }

  try {
    const bundleReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    // Check main bundle sizes
    if (bundleReport.bundles) {
      bundleReport.bundles.forEach(bundle => {
        const platform = bundle.platform || 'unknown';
        const size = bundle.size || 0;
        const limits = BUNDLE_SIZE_LIMITS[platform] || BUNDLE_SIZE_LIMITS.android;
        
        reportData.bundles.push({
          platform,
          size,
          sizeFormatted: formatBytes(size),
          status: size > limits.error ? 'error' : size > limits.warning ? 'warning' : 'ok'
        });

        if (size > limits.error) {
          const violation = `❌ ${platform} bundle size (${formatBytes(size)}) exceeds limit (${formatBytes(limits.error)})`;
          violations.push(violation);
          reportData.violations.push({
            type: 'bundle_size',
            platform,
            actual: size,
            limit: limits.error,
            message: violation
          });
          console.log(violation);
        } else if (size > limits.warning) {
          const warning = `⚠️  ${platform} bundle size (${formatBytes(size)}) exceeds warning threshold (${formatBytes(limits.warning)})`;
          warnings.push(warning);
          reportData.warnings.push({
            type: 'bundle_size',
            platform,
            actual: size,
            limit: limits.warning,
            message: warning
          });
          console.log(warning);
        } else {
          console.log(`✅ ${platform} bundle size: ${formatBytes(size)}`);
        }
      });
    }

    // Check individual asset sizes
    if (bundleReport.assets) {
      bundleReport.assets.forEach(asset => {
        const { name, size, type } = asset;
        const limits = ASSET_LIMITS[type] || ASSET_LIMITS.image;
        
        reportData.assets.push({
          name,
          size,
          sizeFormatted: formatBytes(size),
          type,
          status: size > limits.error ? 'error' : size > limits.warning ? 'warning' : 'ok'
        });

        if (size > limits.error) {
          const violation = `❌ Asset ${name} (${formatBytes(size)}) exceeds ${type} limit (${formatBytes(limits.error)})`;
          violations.push(violation);
          reportData.violations.push({
            type: 'asset_size',
            name,
            assetType: type,
            actual: size,
            limit: limits.error,
            message: violation
          });
          console.log(violation);
        } else if (size > limits.warning) {
          const warning = `⚠️  Asset ${name} (${formatBytes(size)}) exceeds ${type} warning threshold (${formatBytes(limits.warning)})`;
          warnings.push(warning);
          reportData.warnings.push({
            type: 'asset_size',
            name,
            assetType: type,
            actual: size,
            limit: limits.warning,
            message: warning
          });
        }
      });
    }

    // Generate performance report for PR comments
    generatePerformanceReport(reportData);

    // Write violations file for CI
    if (violations.length > 0) {
      fs.writeFileSync('performance-violations.txt', violations.join('\n'));
      console.log(`\n❌ ${violations.length} performance budget violation(s) detected!`);
      process.exit(1);
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  ${warnings.length} performance warning(s) detected.`);
    }

    console.log('\n✅ All bundle size checks passed!');

  } catch (error) {
    console.error('Error checking bundle sizes:', error.message);
    process.exit(1);
  }
}

function generatePerformanceReport(data) {
  const report = [
    '## 📊 Performance Budget Report',
    '',
    `**Platform:** ${data.platform}`,
    `**Timestamp:** ${new Date(data.timestamp).toLocaleString()}`,
    '',
  ];

  // Bundle sizes section
  if (data.bundles.length > 0) {
    report.push('### 📦 Bundle Sizes');
    report.push('');
    report.push('| Platform | Size | Status | Limit |');
    report.push('|----------|------|--------|-------|');
    
    data.bundles.forEach(bundle => {
      const limits = BUNDLE_SIZE_LIMITS[bundle.platform] || BUNDLE_SIZE_LIMITS.android;
      const statusIcon = bundle.status === 'error' ? '❌' : bundle.status === 'warning' ? '⚠️' : '✅';
      const limitFormatted = formatBytes(bundle.status === 'error' ? limits.error : limits.warning);
      
      report.push(`| ${bundle.platform} | ${bundle.sizeFormatted} | ${statusIcon} ${bundle.status} | ${limitFormatted} |`);
    });
    report.push('');
  }

  // Violations section
  if (data.violations.length > 0) {
    report.push('### ❌ Budget Violations');
    report.push('');
    data.violations.forEach(violation => {
      report.push(`- ${violation.message}`);
    });
    report.push('');
  }

  // Warnings section
  if (data.warnings.length > 0) {
    report.push('### ⚠️ Warnings');
    report.push('');
    data.warnings.forEach(warning => {
      report.push(`- ${warning.message}`);
    });
    report.push('');
  }

  // Summary
  const totalViolations = data.violations.length;
  const totalWarnings = data.warnings.length;
  
  if (totalViolations === 0 && totalWarnings === 0) {
    report.push('### ✅ Summary');
    report.push('');
    report.push('All performance budgets are within acceptable limits!');
  } else {
    report.push('### 📋 Summary');
    report.push('');
    report.push(`- **Violations:** ${totalViolations}`);
    report.push(`- **Warnings:** ${totalWarnings}`);
    
    if (totalViolations > 0) {
      report.push('');
      report.push('> ⚠️ **Action Required:** Performance budget violations must be resolved before merging.');
    }
  }

  fs.writeFileSync('performance-report.md', report.join('\n'));
}

if (require.main === module) {
  checkBundleSize();
}

module.exports = { checkBundleSize, formatBytes };