#!/usr/bin/env node
/**
 * Bundle Optimization Script
 * Analyzes bundle size and implements code splitting optimizations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUNDLE_SIZE_LIMIT = 20 * 1024 * 1024; // 20MB
const CHUNK_SIZE_LIMIT = 2 * 1024 * 1024;   // 2MB per chunk
const INITIAL_BUNDLE_LIMIT = 5 * 1024 * 1024; // 5MB initial bundle

/**
 * Large modules that should be code-split
 */
const LARGE_MODULES = [
  {
    name: 'ML Training Pipeline',
    path: 'src/services/MLTrainingPipeline.ts',
    estimatedSize: 2.5 * 1024 * 1024,
    splitStrategy: 'lazy',
    priority: 'low'
  },
  {
    name: 'Advanced ML Service',
    path: 'src/services/AdvancedMLService.ts',
    estimatedSize: 1.8 * 1024 * 1024,
    splitStrategy: 'lazy',
    priority: 'low'
  },
  {
    name: 'Video Call Service',
    path: 'src/services/VideoCallService.ts',
    estimatedSize: 1.5 * 1024 * 1024,
    splitStrategy: 'lazy',
    priority: 'medium'
  },
  {
    name: 'Business Dashboard',
    path: 'src/components/analytics/BusinessDashboard.tsx',
    estimatedSize: 1.2 * 1024 * 1024,
    splitStrategy: 'preload',
    priority: 'high'
  },
  {
    name: 'Advanced Search Service',
    path: 'src/services/AdvancedSearchService.ts',
    estimatedSize: 800 * 1024,
    splitStrategy: 'preload',
    priority: 'medium'
  }
];

class BundleOptimizer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.srcDir = path.join(this.projectRoot, 'src');
    this.optimizationsApplied = [];
  }

  /**
   * Run complete bundle optimization
   */
  async optimize() {
    console.log('🚀 Starting Bundle Optimization...\n');

    try {
      // Step 1: Analyze current bundle
      console.log('📊 Step 1: Analyzing current bundle...');
      const analysis = await this.analyzeBundleSize();
      this.printAnalysis(analysis);

      // Step 2: Identify optimization opportunities
      console.log('\n🔍 Step 2: Identifying optimization opportunities...');
      const opportunities = this.identifyOptimizations(analysis);
      this.printOpportunities(opportunities);

      // Step 3: Apply code splitting
      console.log('\n⚡ Step 3: Applying code splitting optimizations...');
      await this.applyCodeSplitting();

      // Step 4: Update lazy loading implementation
      console.log('\n🔄 Step 4: Updating lazy loading implementation...');
      await this.updateLazyLoading();

      // Step 5: Create bundle analysis report
      console.log('\n📋 Step 5: Generating optimization report...');
      const report = this.generateOptimizationReport(analysis);
      await this.saveReport(report);

      console.log('\n✅ Bundle optimization completed successfully!');
      console.log(`📄 Report saved to: bundle-optimization-report.md`);

    } catch (error) {
      console.error('\n❌ Bundle optimization failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Analyze current bundle size
   */
  async analyzeBundleSize() {
    const analysis = {
      totalFiles: 0,
      totalSize: 0,
      largestFiles: [],
      modulesBySize: [],
      estimatedBundleSize: 0
    };

    // Recursively analyze all TypeScript/JavaScript files
    const analyzeDirectory = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          analyzeDirectory(fullPath);
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          const stats = fs.statSync(fullPath);
          const relativePath = path.relative(this.srcDir, fullPath);

          analysis.totalFiles++;
          analysis.totalSize += stats.size;

          const fileInfo = {
            path: relativePath,
            size: stats.size,
            category: this.categorizeFile(relativePath)
          };

          analysis.largestFiles.push(fileInfo);
        }
      }
    };

    analyzeDirectory(this.srcDir);

    // Sort by size and keep top 20
    analysis.largestFiles.sort((a, b) => b.size - a.size);
    analysis.largestFiles = analysis.largestFiles.slice(0, 20);

    // Group by category
    analysis.modulesBySize = this.groupByCategory(analysis.largestFiles);

    // Estimate final bundle size (source code + dependencies)
    analysis.estimatedBundleSize = analysis.totalSize * 3; // Rough estimate including dependencies

    return analysis;
  }

  /**
   * Categorize files by their purpose
   */
  categorizeFile(filePath) {
    if (filePath.includes('ML') || filePath.includes('ml-engine')) return 'ML/AI';
    if (filePath.includes('analytics') || filePath.includes('Dashboard')) return 'Analytics';
    if (filePath.includes('video') || filePath.includes('VideoCall')) return 'Video';
    if (filePath.includes('search') || filePath.includes('Search')) return 'Search';
    if (filePath.includes('social') || filePath.includes('Social')) return 'Social';
    if (filePath.includes('payment') || filePath.includes('Payment')) return 'Payment';
    if (filePath.includes('auth') || filePath.includes('Auth')) return 'Auth';
    if (filePath.includes('navigation') || filePath.includes('Navigator')) return 'Navigation';
    if (filePath.includes('components')) return 'Components';
    if (filePath.includes('services')) return 'Services';
    if (filePath.includes('screens')) return 'Screens';
    if (filePath.includes('utils')) return 'Utils';
    return 'Core';
  }

  /**
   * Group files by category and calculate totals
   */
  groupByCategory(files) {
    const groups = {};

    files.forEach(file => {
      if (!groups[file.category]) {
        groups[file.category] = {
          category: file.category,
          files: [],
          totalSize: 0,
          canSplit: this.categoryCanSplit(file.category)
        };
      }

      groups[file.category].files.push(file);
      groups[file.category].totalSize += file.size;
    });

    return Object.values(groups).sort((a, b) => b.totalSize - a.totalSize);
  }

  /**
   * Determine if category can be code-split
   */
  categoryCanSplit(category) {
    const nonSplittableCategories = ['Core', 'Navigation', 'Auth', 'Utils'];
    return !nonSplittableCategories.includes(category);
  }

  /**
   * Identify optimization opportunities
   */
  identifyOptimizations(analysis) {
    const opportunities = [];

    // Check bundle size limits
    if (analysis.estimatedBundleSize > BUNDLE_SIZE_LIMIT) {
      opportunities.push({
        type: 'Bundle Size',
        severity: 'high',
        current: analysis.estimatedBundleSize,
        limit: BUNDLE_SIZE_LIMIT,
        recommendation: 'Implement aggressive code splitting for large modules'
      });
    }

    // Check for large splittable modules
    analysis.modulesBySize.forEach(module => {
      if (module.canSplit && module.totalSize > 500 * 1024) { // 500KB
        opportunities.push({
          type: 'Code Splitting',
          severity: module.totalSize > 1024 * 1024 ? 'high' : 'medium',
          module: module.category,
          size: module.totalSize,
          recommendation: `Implement lazy loading for ${module.category} modules`
        });
      }
    });

    // Check specific large files
    LARGE_MODULES.forEach(module => {
      if (fs.existsSync(path.join(this.projectRoot, module.path))) {
        opportunities.push({
          type: 'Lazy Loading',
          severity: module.priority === 'high' ? 'medium' : 'low',
          module: module.name,
          strategy: module.splitStrategy,
          recommendation: `Apply ${module.splitStrategy} loading for ${module.name}`
        });
      }
    });

    return opportunities.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Apply code splitting optimizations
   */
  async applyCodeSplitting() {
    for (const module of LARGE_MODULES) {
      const fullPath = path.join(this.projectRoot, module.path);

      if (fs.existsSync(fullPath)) {
        console.log(`  🔄 Processing ${module.name}...`);

        try {
          await this.createLazyWrapper(module);
          this.optimizationsApplied.push({
            module: module.name,
            strategy: module.splitStrategy,
            status: 'success'
          });
          console.log(`    ✅ Applied ${module.splitStrategy} loading`);
        } catch (error) {
          console.log(`    ⚠️  Failed to optimize: ${error.message}`);
          this.optimizationsApplied.push({
            module: module.name,
            strategy: module.splitStrategy,
            status: 'failed',
            error: error.message
          });
        }
      } else {
        console.log(`  ⏭️  Skipping ${module.name} (file not found)`);
      }
    }
  }

  /**
   * Create lazy wrapper for large modules
   */
  async createLazyWrapper(module) {
    const lazyDir = path.join(this.srcDir, 'components', 'lazy');
    if (!fs.existsSync(lazyDir)) {
      fs.mkdirSync(lazyDir, { recursive: true });
    }

    const componentName = module.name.replace(/[^a-zA-Z0-9]/g, '');
    const wrapperPath = path.join(lazyDir, `${componentName}.tsx`);

    const wrapperContent = this.generateLazyWrapperContent(module, componentName);

    fs.writeFileSync(wrapperPath, wrapperContent);
  }

  /**
   * Generate lazy wrapper component content
   */
  generateLazyWrapperContent(module, componentName) {
    const importPath = module.path.replace('src/', '../').replace('.ts', '').replace('.tsx', '');

    return `/**
 * Lazy-loaded wrapper for ${module.name}
 * Generated by bundle optimization script
 */

import React, { Suspense } from 'react';
import { createLazyComponent } from '../../utils/codeSplitting';
import { LoadingSpinner } from '../LoadingSpinner';

const Lazy${componentName} = createLazyComponent(
  () => import('${importPath}'),
  {
    chunkName: '${module.name.toLowerCase().replace(/\s+/g, '-')}',
    timeout: 10000,
    retryAttempts: 3,
    preload: ${module.splitStrategy === 'preload'},
  }
);

export const ${componentName} = (props: any) => (
  <Suspense fallback={<LoadingSpinner />}>
    <Lazy${componentName} {...props} />
  </Suspense>
);

export default ${componentName};
`;
  }

  /**
   * Update lazy loading implementation
   */
  async updateLazyLoading() {
    const lazyIndexPath = path.join(this.srcDir, 'components', 'lazy', 'index.ts');

    const exports = this.optimizationsApplied
      .filter(opt => opt.status === 'success')
      .map(opt => {
        const componentName = opt.module.replace(/[^a-zA-Z0-9]/g, '');
        return `export { ${componentName} } from './${componentName}';`;
      })
      .join('\n');

    const indexContent = `/**
 * Lazy-loaded components index
 * Generated by bundle optimization script
 */

${exports}
`;

    fs.writeFileSync(lazyIndexPath, indexContent);
    console.log(`  ✅ Updated lazy components index`);
  }

  /**
   * Generate optimization report
   */
  generateOptimizationReport(analysis) {
    const successfulOptimizations = this.optimizationsApplied.filter(opt => opt.status === 'success');
    const failedOptimizations = this.optimizationsApplied.filter(opt => opt.status === 'failed');

    const estimatedSavings = successfulOptimizations.length * 1.5 * 1024 * 1024; // Rough estimate

    return `# Bundle Optimization Report

## Summary
- **Analysis Date**: ${new Date().toLocaleString()}
- **Total Source Files**: ${analysis.totalFiles}
- **Total Source Size**: ${this.formatBytes(analysis.totalSize)}
- **Estimated Bundle Size**: ${this.formatBytes(analysis.estimatedBundleSize)}
- **Optimizations Applied**: ${successfulOptimizations.length}
- **Estimated Savings**: ${this.formatBytes(estimatedSavings)}

## Bundle Analysis Results

### Performance Status
${analysis.estimatedBundleSize > BUNDLE_SIZE_LIMIT ? '❌' : '✅'} **Bundle Size**: ${this.formatBytes(analysis.estimatedBundleSize)} / ${this.formatBytes(BUNDLE_SIZE_LIMIT)}

### Largest Files
${analysis.largestFiles.slice(0, 10).map(file =>
  `- **${file.path}**: ${this.formatBytes(file.size)} (${file.category})`
).join('\n')}

### Modules by Category
${analysis.modulesBySize.map(module =>
  `- **${module.category}**: ${this.formatBytes(module.totalSize)} (${module.files.length} files) ${module.canSplit ? '✅ Can Split' : '❌ Core Module'}`
).join('\n')}

## Applied Optimizations

### ✅ Successful Optimizations
${successfulOptimizations.length > 0 ?
  successfulOptimizations.map(opt => `- **${opt.module}**: ${opt.strategy} loading implemented`).join('\n') :
  'None'
}

### ❌ Failed Optimizations
${failedOptimizations.length > 0 ?
  failedOptimizations.map(opt => `- **${opt.module}**: ${opt.error}`).join('\n') :
  'None'
}

## Recommendations

### High Priority
- Implement lazy loading for ML Training Pipeline (saves ~2.5MB)
- Split video call components into separate bundle (saves ~1.5MB)
- Optimize analytics dashboard loading (saves ~1.2MB)

### Medium Priority
- Implement preloading for social features
- Optimize search components with code splitting
- Consider service worker for caching large modules

### Low Priority
- Tree shake unused exports
- Optimize image assets
- Consider dynamic imports for utility functions

## Next Steps

1. **Monitor Performance**: Use the performance monitoring system to track loading times
2. **Bundle Analysis**: Set up automated bundle size monitoring in CI/CD
3. **User Testing**: Validate that lazy loading doesn't negatively impact UX
4. **Metrics Collection**: Track bundle loading performance in production

---
*Generated by Bundle Optimization Script v1.0*
`;
  }

  /**
   * Save optimization report
   */
  async saveReport(report) {
    const reportPath = path.join(this.projectRoot, 'bundle-optimization-report.md');
    fs.writeFileSync(reportPath, report);
  }

  /**
   * Print analysis results
   */
  printAnalysis(analysis) {
    console.log(`  📁 Total Files: ${analysis.totalFiles}`);
    console.log(`  📏 Total Size: ${this.formatBytes(analysis.totalSize)}`);
    console.log(`  📦 Estimated Bundle: ${this.formatBytes(analysis.estimatedBundleSize)}`);

    const status = analysis.estimatedBundleSize > BUNDLE_SIZE_LIMIT ? '❌ EXCEEDS LIMIT' : '✅ Within Limit';
    console.log(`  🎯 Status: ${status}`);
  }

  /**
   * Print optimization opportunities
   */
  printOpportunities(opportunities) {
    if (opportunities.length === 0) {
      console.log('  ✅ No major optimization opportunities found');
      return;
    }

    opportunities.forEach((opp, index) => {
      const emoji = opp.severity === 'high' ? '🔴' : opp.severity === 'medium' ? '🟡' : '🟢';
      console.log(`  ${emoji} ${opp.type}: ${opp.recommendation}`);
    });
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
      return `${mb.toFixed(2)}MB`;
    }
    const kb = bytes / 1024;
    return `${kb.toFixed(0)}KB`;
  }
}

// Run optimization if called directly
if (require.main === module) {
  const optimizer = new BundleOptimizer();
  optimizer.optimize().catch(console.error);
}

module.exports = { BundleOptimizer };