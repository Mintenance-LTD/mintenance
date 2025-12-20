#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Performance budget configuration
const PERFORMANCE_BUDGETS = {
  mainBundle: 2 * 1024 * 1024, // 2MB
  vendorBundle: 1 * 1024 * 1024, // 1MB
  totalBundle: 5 * 1024 * 1024, // 5MB
  individualAsset: 500 * 1024, // 500KB
};

class BundleAnalyzer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.buildDir = path.join(this.projectRoot, '.expo');
    this.results = {
      totalSize: 0,
      assets: [],
      violations: [],
      warnings: [],
    };
  }

  async analyze() {
    console.log('🔍 Analyzing bundle size and performance...\n');

    try {
      // Check if build exists
      if (!fs.existsSync(this.buildDir)) {
        console.log(
          '⚠️  No build directory found. Running expo export first...\n'
        );
        await this.createBundle();
      }

      await this.analyzeBundleSize();
      await this.checkPerformanceBudgets();
      this.generateReport();

      return this.results;
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
      process.exit(1);
    }
  }

  async createBundle() {
    try {
      console.log('📦 Creating optimized bundle...');
      execSync('npx expo export --platform android --dev false', {
        stdio: 'inherit',
        cwd: this.projectRoot,
      });
      console.log('✅ Bundle created successfully\n');
    } catch (error) {
      throw new Error(`Failed to create bundle: ${error.message}`);
    }
  }

  async analyzeBundleSize() {
    const distDir = path.join(this.buildDir, 'dist');

    if (!fs.existsSync(distDir)) {
      throw new Error(
        'Distribution directory not found. Please run expo export first.'
      );
    }

    console.log('📊 Analyzing bundle components...\n');

    const assets = this.getAllFiles(distDir);
    let totalSize = 0;

    for (const asset of assets) {
      const stats = fs.statSync(asset);
      const size = stats.size;
      const relativePath = path.relative(distDir, asset);

      totalSize += size;
      this.results.assets.push({
        path: relativePath,
        size,
        sizeFormatted: this.formatBytes(size),
      });

      // Check individual asset budgets
      if (size > PERFORMANCE_BUDGETS.individualAsset) {
        this.results.violations.push({
          type: 'asset',
          asset: relativePath,
          size,
          limit: PERFORMANCE_BUDGETS.individualAsset,
          message: `Asset exceeds size limit: ${this.formatBytes(size)} > ${this.formatBytes(PERFORMANCE_BUDGETS.individualAsset)}`,
        });
      }
    }

    this.results.totalSize = totalSize;

    // Sort assets by size (largest first)
    this.results.assets.sort((a, b) => b.size - a.size);
  }

  getAllFiles(dir) {
    let files = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files = files.concat(this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  async checkPerformanceBudgets() {
    console.log('🎯 Checking performance budgets...\n');

    // Check total bundle size
    if (this.results.totalSize > PERFORMANCE_BUDGETS.totalBundle) {
      this.results.violations.push({
        type: 'total',
        size: this.results.totalSize,
        limit: PERFORMANCE_BUDGETS.totalBundle,
        message: `Total bundle size exceeds budget: ${this.formatBytes(this.results.totalSize)} > ${this.formatBytes(PERFORMANCE_BUDGETS.totalBundle)}`,
      });
    }

    // Analyze JavaScript bundles
    const jsAssets = this.results.assets.filter(
      (asset) => asset.path.endsWith('.js') || asset.path.endsWith('.bundle')
    );

    let mainBundleSize = 0;
    let vendorBundleSize = 0;

    for (const asset of jsAssets) {
      if (
        asset.path.includes('vendor') ||
        asset.path.includes('node_modules')
      ) {
        vendorBundleSize += asset.size;
      } else {
        mainBundleSize += asset.size;
      }
    }

    // Check main bundle budget
    if (mainBundleSize > PERFORMANCE_BUDGETS.mainBundle) {
      this.results.violations.push({
        type: 'main-bundle',
        size: mainBundleSize,
        limit: PERFORMANCE_BUDGETS.mainBundle,
        message: `Main bundle exceeds budget: ${this.formatBytes(mainBundleSize)} > ${this.formatBytes(PERFORMANCE_BUDGETS.mainBundle)}`,
      });
    }

    // Check vendor bundle budget
    if (vendorBundleSize > PERFORMANCE_BUDGETS.vendorBundle) {
      this.results.violations.push({
        type: 'vendor-bundle',
        size: vendorBundleSize,
        limit: PERFORMANCE_BUDGETS.vendorBundle,
        message: `Vendor bundle exceeds budget: ${this.formatBytes(vendorBundleSize)} > ${this.formatBytes(PERFORMANCE_BUDGETS.vendorBundle)}`,
      });
    }
  }

  generateReport() {
    console.log('📋 Bundle Analysis Report');
    console.log('========================\n');

    console.log(
      `📦 Total Bundle Size: ${this.formatBytes(this.results.totalSize)}`
    );
    console.log(
      `🎯 Budget Limit: ${this.formatBytes(PERFORMANCE_BUDGETS.totalBundle)}`
    );

    const budgetUsage = (
      (this.results.totalSize / PERFORMANCE_BUDGETS.totalBundle) *
      100
    ).toFixed(1);
    console.log(`📊 Budget Usage: ${budgetUsage}%\n`);

    // Show largest assets
    console.log('📈 Largest Assets:');
    this.results.assets.slice(0, 10).forEach((asset, index) => {
      const percentage = ((asset.size / this.results.totalSize) * 100).toFixed(
        1
      );
      console.log(
        `  ${index + 1}. ${asset.path} - ${asset.sizeFormatted} (${percentage}%)`
      );
    });
    console.log('');

    // Show violations
    if (this.results.violations.length > 0) {
      console.log('❌ Performance Budget Violations:');
      this.results.violations.forEach((violation) => {
        console.log(`  • ${violation.message}`);
      });
      console.log('');
    }

    // Show warnings
    if (this.results.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      this.results.warnings.forEach((warning) => {
        console.log(`  • ${warning}`);
      });
      console.log('');
    }

    // Overall status
    if (this.results.violations.length === 0) {
      console.log('✅ All performance budgets are within limits!');
    } else {
      console.log(
        '❌ Performance budget violations detected. Consider optimizing bundle size.'
      );
    }

    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      totalSize: this.results.totalSize,
      budgetUsage: `${budgetUsage}%`,
      violations: this.results.violations,
      warnings: this.results.warnings,
      topAssets: this.results.assets.slice(0, 20),
    };

    fs.writeFileSync(
      path.join(this.projectRoot, 'bundle-analysis-report.json'),
      JSON.stringify(reportData, null, 2)
    );

    console.log('\n📄 Detailed report saved to: bundle-analysis-report.json');
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

// CLI execution
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  analyzer
    .analyze()
    .then(() => {
      console.log('\n🎉 Bundle analysis complete!');
    })
    .catch((error) => {
      console.error('💥 Analysis failed:', error.message);
      process.exit(1);
    });
}

module.exports = BundleAnalyzer;
