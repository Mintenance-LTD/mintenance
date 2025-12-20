#!/usr/bin/env node

// ============================================================================
// BUNDLE ANALYZER
// Analyzes React Native bundle size and composition
// ============================================================================

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// ============================================================================
// BUNDLE ANALYSIS UTILITIES
// ============================================================================

class BundleAnalyzer {
  constructor(bundlePath) {
    this.bundlePath = bundlePath;
    this.modules = new Map();
    this.stats = {
      totalSize: 0,
      moduleCount: 0,
      duplicates: new Set(),
      categories: new Map(),
      largestModules: [],
    };
  }

  async analyze() {
    if (!fs.existsSync(this.bundlePath)) {
      console.error(chalk.red(`Bundle file not found: ${this.bundlePath}`));
      process.exit(1);
    }

    console.log(chalk.blue('📊 Analyzing bundle...'));
    console.log(chalk.gray(`Bundle: ${this.bundlePath}\n`));

    const bundleContent = fs.readFileSync(this.bundlePath, 'utf8');
    this.extractModules(bundleContent);
    this.categorizeModules();
    this.findDuplicates();
    this.calculateStats();

    return this.generateReport();
  }

  extractModules(content) {
    // Extract module definitions from the bundle
    // This regex matches Metro's module format: __d(function(g,r,i,a,m,e,d){...},moduleId,"path/to/module")
    const moduleRegex = /__d\(function\([^)]+\)\{([^}]+(?:\{[^}]*\})*[^}]*)\},(\d+),"([^"]+)"\)/g;
    let match;

    while ((match = moduleRegex.exec(content)) !== null) {
      const [, moduleCode, moduleId, modulePath] = match;
      const moduleSize = Buffer.byteLength(moduleCode, 'utf8');

      this.modules.set(moduleId, {
        id: moduleId,
        path: modulePath,
        code: moduleCode,
        size: moduleSize,
        category: this.categorizeModule(modulePath),
      });

      this.stats.totalSize += moduleSize;
      this.stats.moduleCount++;
    }
  }

  categorizeModule(modulePath) {
    if (modulePath.includes('node_modules/react-native/')) return 'React Native Core';
    if (modulePath.includes('node_modules/react/')) return 'React';
    if (modulePath.includes('node_modules/@react-navigation/')) return 'Navigation';
    if (modulePath.includes('node_modules/')) return 'Third Party';
    if (modulePath.includes('src/components/ui/')) return 'UI Components';
    if (modulePath.includes('src/components/')) return 'Components';
    if (modulePath.includes('src/screens/')) return 'Screens';
    if (modulePath.includes('src/services/')) return 'Services';
    if (modulePath.includes('src/utils/')) return 'Utilities';
    if (modulePath.includes('src/hooks/')) return 'Hooks';
    if (modulePath.includes('src/')) return 'App Code';
    return 'Other';
  }

  categorizeModules() {
    for (const module of this.modules.values()) {
      const category = module.category;
      if (!this.stats.categories.has(category)) {
        this.stats.categories.set(category, {
          size: 0,
          count: 0,
          modules: [],
        });
      }

      const categoryData = this.stats.categories.get(category);
      categoryData.size += module.size;
      categoryData.count++;
      categoryData.modules.push(module);
    }

    // Sort modules within categories by size
    for (const categoryData of this.stats.categories.values()) {
      categoryData.modules.sort((a, b) => b.size - a.size);
    }
  }

  findDuplicates() {
    const pathCounts = new Map();

    for (const module of this.modules.values()) {
      const normalizedPath = module.path.replace(/\\/g, '/');
      const baseName = path.basename(normalizedPath);

      if (!pathCounts.has(baseName)) {
        pathCounts.set(baseName, []);
      }
      pathCounts.get(baseName).push(module);
    }

    for (const [fileName, modules] of pathCounts.entries()) {
      if (modules.length > 1) {
        this.stats.duplicates.add({
          fileName,
          modules,
          wastedSize: modules.slice(1).reduce((sum, m) => sum + m.size, 0),
        });
      }
    }
  }

  calculateStats() {
    // Find largest modules
    this.stats.largestModules = Array.from(this.modules.values())
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    // Sort categories by size
    this.stats.categories = new Map(
      Array.from(this.stats.categories.entries())
        .sort(([, a], [, b]) => b.size - a.size)
    );
  }

  generateReport() {
    const report = {
      summary: this.generateSummary(),
      categories: this.generateCategoryReport(),
      largestModules: this.generateLargestModulesReport(),
      duplicates: this.generateDuplicatesReport(),
      recommendations: this.generateRecommendations(),
    };

    this.printReport(report);
    return report;
  }

  generateSummary() {
    return {
      totalSize: this.formatSize(this.stats.totalSize),
      moduleCount: this.stats.moduleCount,
      duplicateCount: this.stats.duplicates.size,
      categoryCount: this.stats.categories.size,
    };
  }

  generateCategoryReport() {
    const categories = [];

    for (const [name, data] of this.stats.categories.entries()) {
      const percentage = ((data.size / this.stats.totalSize) * 100).toFixed(1);
      categories.push({
        name,
        size: this.formatSize(data.size),
        percentage: `${percentage}%`,
        moduleCount: data.count,
        averageSize: this.formatSize(data.size / data.count),
      });
    }

    return categories;
  }

  generateLargestModulesReport() {
    return this.stats.largestModules.map(module => ({
      path: module.path,
      size: this.formatSize(module.size),
      percentage: ((module.size / this.stats.totalSize) * 100).toFixed(2) + '%',
      category: module.category,
    }));
  }

  generateDuplicatesReport() {
    return Array.from(this.stats.duplicates.values()).map(duplicate => ({
      fileName: duplicate.fileName,
      instances: duplicate.modules.length,
      wastedSize: this.formatSize(duplicate.wastedSize),
      paths: duplicate.modules.map(m => m.path),
    }));
  }

  generateRecommendations() {
    const recommendations = [];

    // Large bundle warning
    if (this.stats.totalSize > 20 * 1024 * 1024) {
      recommendations.push({
        type: 'warning',
        title: 'Large Bundle Size',
        description: 'Bundle exceeds 20MB. Consider code splitting or removing unused dependencies.',
        impact: 'high',
      });
    }

    // Too many modules warning
    if (this.stats.moduleCount > 1000) {
      recommendations.push({
        type: 'warning',
        title: 'High Module Count',
        description: `${this.stats.moduleCount} modules detected. Consider consolidating similar modules.`,
        impact: 'medium',
      });
    }

    // Duplicate modules
    if (this.stats.duplicates.size > 0) {
      const totalWasted = Array.from(this.stats.duplicates.values())
        .reduce((sum, dup) => sum + dup.wastedSize, 0);

      recommendations.push({
        type: 'optimization',
        title: 'Duplicate Modules',
        description: `${this.stats.duplicates.size} duplicate modules wasting ${this.formatSize(totalWasted)}`,
        impact: 'medium',
      });
    }

    // Large third-party dependencies
    const thirdPartyCategory = this.stats.categories.get('Third Party');
    if (thirdPartyCategory && thirdPartyCategory.size > this.stats.totalSize * 0.5) {
      recommendations.push({
        type: 'optimization',
        title: 'Heavy Third-Party Dependencies',
        description: 'Third-party modules comprise over 50% of bundle. Review necessity of each dependency.',
        impact: 'high',
      });
    }

    // Unused UI components check
    const uiCategory = this.stats.categories.get('UI Components');
    if (uiCategory && uiCategory.count > 50) {
      recommendations.push({
        type: 'optimization',
        title: 'Many UI Components',
        description: `${uiCategory.count} UI components detected. Ensure all are being used.`,
        impact: 'low',
      });
    }

    return recommendations;
  }

  printReport(report) {
    console.log(chalk.bold.blue('📊 BUNDLE ANALYSIS REPORT'));
    console.log(''.padEnd(50, '='));

    // Summary
    console.log(chalk.bold('\n📋 Summary:'));
    console.log(`Total Size: ${chalk.yellow(report.summary.totalSize)}`);
    console.log(`Modules: ${chalk.cyan(report.summary.moduleCount)}`);
    console.log(`Categories: ${chalk.cyan(report.summary.categoryCount)}`);
    console.log(`Duplicates: ${chalk.red(report.summary.duplicateCount)}`);

    // Categories
    console.log(chalk.bold('\n📂 Categories:'));
    report.categories.forEach(category => {
      console.log(
        `${category.name.padEnd(20)} ${category.size.padStart(10)} ${category.percentage.padStart(7)} ${chalk.gray(`(${category.moduleCount} modules)`)}`
      );
    });

    // Largest modules
    console.log(chalk.bold('\n🔍 Largest Modules:'));
    report.largestModules.forEach((module, index) => {
      console.log(
        `${(index + 1).toString().padStart(2)}. ${module.size.padStart(10)} ${module.percentage.padStart(7)} ${chalk.gray(this.truncatePath(module.path))}`
      );
    });

    // Duplicates
    if (report.duplicates.length > 0) {
      console.log(chalk.bold('\n⚠️  Duplicate Modules:'));
      report.duplicates.slice(0, 5).forEach(duplicate => {
        console.log(
          `${duplicate.fileName.padEnd(30)} ${duplicate.instances} instances ${chalk.red(duplicate.wastedSize + ' wasted')}`
        );
      });
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log(chalk.bold('\n💡 Recommendations:'));
      report.recommendations.forEach(rec => {
        const icon = rec.type === 'warning' ? '⚠️' : '💡';
        const color = rec.impact === 'high' ? chalk.red : rec.impact === 'medium' ? chalk.yellow : chalk.gray;
        console.log(`${icon} ${color(rec.title)}: ${rec.description}`);
      });
    }

    console.log('\n' + ''.padEnd(50, '='));
  }

  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)}${units[unitIndex]}`;
  }

  truncatePath(path, maxLength = 60) {
    if (path.length <= maxLength) return path;
    return '...' + path.slice(-(maxLength - 3));
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(chalk.yellow('Usage: node bundle-analyzer.js <bundle-path>'));
    console.log(chalk.gray('Example: node bundle-analyzer.js ./android/app/build/outputs/bundle.js'));
    process.exit(1);
  }

  const bundlePath = args[0];
  const analyzer = new BundleAnalyzer(bundlePath);

  try {
    const report = await analyzer.analyze();

    // Save report to JSON file
    const reportPath = path.join(path.dirname(bundlePath), 'bundle-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(chalk.green(`\n✅ Report saved to: ${reportPath}`));

  } catch (error) {
    console.error(chalk.red('❌ Analysis failed:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = BundleAnalyzer;