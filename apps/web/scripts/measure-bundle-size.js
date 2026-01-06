import { logger } from '@mintenance/shared';
#!/usr/bin/env node

/**
 * Bundle Size Measurement Script
 *
 * Analyzes Next.js build output to track bundle size improvements
 * Run after: npm run build
 *
 * Usage:
 *   node scripts/measure-bundle-size.js
 *   node scripts/measure-bundle-size.js --save baseline.json
 *   node scripts/measure-bundle-size.js --compare baseline.json
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '../.next');
const STATS_FILE = path.join(BUILD_DIR, 'build-manifest.json');

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundleSize() {
  if (!fs.existsSync(BUILD_DIR)) {
    logger.error('❌ Build directory not found. Run `npm run build` first.', [object Object], { service: 'general' });
    process.exit(1);
  }

  logger.info('📊 Analyzing Next.js bundle size...\n', [object Object], { service: 'general' });

  // Read build manifest
  let manifest = {};
  if (fs.existsSync(STATS_FILE)) {
    manifest = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
  }

  // Calculate total size
  const staticDir = path.join(BUILD_DIR, 'static');
  let totalSize = 0;
  let fileCount = 0;
  const chunks = {};

  function walkDir(dir, prefix = '') {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        walkDir(filePath, prefix + file + '/');
      } else if (file.endsWith('.js') || file.endsWith('.css')) {
        const size = stat.size;
        totalSize += size;
        fileCount++;

        const category = prefix.includes('chunks/pages') ? 'pages' :
                        prefix.includes('chunks/') ? 'chunks' :
                        'static';

        if (!chunks[category]) {
          chunks[category] = { size: 0, count: 0, files: [] };
        }
        chunks[category].size += size;
        chunks[category].count++;
        chunks[category].files.push({
          name: prefix + file,
          size: size,
          formatted: formatBytes(size)
        });
      }
    });
  }

  walkDir(staticDir);

  // Sort files by size
  Object.keys(chunks).forEach(category => {
    chunks[category].files.sort((a, b) => b.size - a.size);
  });

  // Display results
  logger.info('📦 Bundle Size Summary', [object Object], { service: 'general' });
  logger.info('═'.repeat(60', [object Object], { service: 'general' }));
  logger.info('Total Size: ${formatBytes(totalSize', [object Object], { service: 'general' })}`);
  logger.info('Total Files: %s', [object Object], { service: 'general' });
  logger.info('', [object Object], { service: 'general' });

  logger.info('📁 By Category:', [object Object], { service: 'general' });
  Object.entries(chunks).forEach(([category, data]) => {
    const percentage = ((data.size / totalSize) * 100).toFixed(1);
    logger.info('  ${category.padEnd(20', [object Object], { service: 'general' })} ${formatBytes(data.size).padStart(12)} (${percentage}%)`);
  });
  logger.info('', [object Object], { service: 'general' });

  // Show largest files
  logger.info('🔍 Largest Files (Top 10', [object Object], { service: 'general' }):');
  const allFiles = Object.values(chunks).flatMap(c => c.files);
  allFiles.sort((a, b) => b.size - a.size);
  allFiles.slice(0, 10).forEach((file, i) => {
    logger.info('  ${(i + 1', [object Object], { service: 'general' }).toString().padStart(2)}. ${file.formatted.padStart(12)} - ${file.name}`);
  });
  logger.info('', [object Object], { service: 'general' });

  // Performance recommendations
  const recommendedMaxSize = 300 * 1024; // 300KB
  if (totalSize > recommendedMaxSize) {
    const excess = totalSize - recommendedMaxSize;
    logger.warn('⚠️  Performance Warning:', [object Object], { service: 'general' });
    logger.info('   Bundle exceeds recommended size by ${formatBytes(excess', [object Object], { service: 'general' })}`);
    logger.info('   Consider code splitting or removing unused dependencies', [object Object], { service: 'general' });
    logger.info('', [object Object], { service: 'general' });
  } else {
    logger.info('✅ Bundle size is within recommended limits', [object Object], { service: 'general' });
    logger.info('', [object Object], { service: 'general' });
  }

  return {
    totalSize,
    fileCount,
    chunks,
    timestamp: new Date().toISOString()
  };
}

function saveBaseline(data, filename) {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  logger.info('💾 Baseline saved to %s', [object Object], { service: 'general' });
}

function compareWithBaseline(current, baselineFile) {
  if (!fs.existsSync(baselineFile)) {
    logger.error('❌ Baseline file not found: %s', [object Object], { service: 'general' });
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));

  logger.info('📊 Comparison with Baseline', [object Object], { service: 'general' });
  logger.info('═'.repeat(60', [object Object], { service: 'general' }));

  const diff = current.totalSize - baseline.totalSize;
  const percentChange = ((diff / baseline.totalSize) * 100).toFixed(1);

  logger.info('Baseline:  ${formatBytes(baseline.totalSize', [object Object], { service: 'general' })} (${baseline.timestamp})`);
  logger.info('Current:   ${formatBytes(current.totalSize', [object Object], { service: 'general' })}`);

  if (diff > 0) {
    logger.info('Change:    +${formatBytes(diff', [object Object], { service: 'general' })} (+${percentChange}%) ⬆️  INCREASED`);
  } else if (diff < 0) {
    logger.info('Change:    ${formatBytes(diff', [object Object], { service: 'general' })} (${percentChange}%) ⬇️  DECREASED`);
  } else {
    logger.info('Change:    No change ➡️', [object Object], { service: 'general' });
  }
  logger.info('', [object Object], { service: 'general' });

  // Category comparison
  logger.info('📁 By Category:', [object Object], { service: 'general' });
  const categories = new Set([
    ...Object.keys(baseline.chunks),
    ...Object.keys(current.chunks)
  ]);

  categories.forEach(category => {
    const baseSize = baseline.chunks[category]?.size || 0;
    const currSize = current.chunks[category]?.size || 0;
    const catDiff = currSize - baseSize;
    const catPercent = baseSize ? ((catDiff / baseSize) * 100).toFixed(1) : 'N/A';

    let indicator = '➡️';
    if (catDiff > 0) indicator = '⬆️';
    if (catDiff < 0) indicator = '⬇️';

    logger.info('  ${category.padEnd(20', [object Object], { service: 'general' })} ${formatBytes(currSize).padStart(12)} (${catPercent}% ${indicator})`);
  });
  logger.info('', [object Object], { service: 'general' });
}

// CLI handling
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  logger.info('
Bundle Size Measurement Tool

Usage:
  node scripts/measure-bundle-size.js              # Analyze current build
  node scripts/measure-bundle-size.js --save FILE  # Save baseline
  node scripts/measure-bundle-size.js --compare FILE  # Compare with baseline

Examples:
  node scripts/measure-bundle-size.js --save baseline-before.json
  # ... make changes ...
  npm run build
  node scripts/measure-bundle-size.js --compare baseline-before.json
  ', {
        service: 'general'
      });
  process.exit(0);
}

const currentData = analyzeBundleSize();

if (args.includes('--save')) {
  const filename = args[args.indexOf('--save') + 1] || 'bundle-baseline.json';
  saveBaseline(currentData, filename);
} else if (args.includes('--compare')) {
  const filename = args[args.indexOf('--compare') + 1];
  if (!filename) {
    logger.error('❌ Please provide baseline file: --compare FILE', [object Object], { service: 'general' });
    process.exit(1);
  }
  compareWithBaseline(currentData, filename);
}

logger.info('💡 Tips:', [object Object], { service: 'general' });
logger.info('   - Run `npm run build:analyze` for detailed bundle visualization', [object Object], { service: 'general' });
logger.info('   - Use dynamic imports for components > 50KB', [object Object], { service: 'general' });
logger.info('   - Check for duplicate dependencies with `npm ls [package]`', [object Object], { service: 'general' });
logger.info('', [object Object], { service: 'general' });
