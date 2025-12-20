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
    console.error('❌ Build directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  console.log('📊 Analyzing Next.js bundle size...\n');

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
  console.log('📦 Bundle Size Summary');
  console.log('═'.repeat(60));
  console.log(`Total Size: ${formatBytes(totalSize)}`);
  console.log(`Total Files: ${fileCount}`);
  console.log('');

  console.log('📁 By Category:');
  Object.entries(chunks).forEach(([category, data]) => {
    const percentage = ((data.size / totalSize) * 100).toFixed(1);
    console.log(`  ${category.padEnd(20)} ${formatBytes(data.size).padStart(12)} (${percentage}%)`);
  });
  console.log('');

  // Show largest files
  console.log('🔍 Largest Files (Top 10):');
  const allFiles = Object.values(chunks).flatMap(c => c.files);
  allFiles.sort((a, b) => b.size - a.size);
  allFiles.slice(0, 10).forEach((file, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${file.formatted.padStart(12)} - ${file.name}`);
  });
  console.log('');

  // Performance recommendations
  const recommendedMaxSize = 300 * 1024; // 300KB
  if (totalSize > recommendedMaxSize) {
    const excess = totalSize - recommendedMaxSize;
    console.log('⚠️  Performance Warning:');
    console.log(`   Bundle exceeds recommended size by ${formatBytes(excess)}`);
    console.log('   Consider code splitting or removing unused dependencies');
    console.log('');
  } else {
    console.log('✅ Bundle size is within recommended limits');
    console.log('');
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
  console.log(`💾 Baseline saved to ${filename}`);
}

function compareWithBaseline(current, baselineFile) {
  if (!fs.existsSync(baselineFile)) {
    console.error(`❌ Baseline file not found: ${baselineFile}`);
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));

  console.log('📊 Comparison with Baseline');
  console.log('═'.repeat(60));

  const diff = current.totalSize - baseline.totalSize;
  const percentChange = ((diff / baseline.totalSize) * 100).toFixed(1);

  console.log(`Baseline:  ${formatBytes(baseline.totalSize)} (${baseline.timestamp})`);
  console.log(`Current:   ${formatBytes(current.totalSize)}`);

  if (diff > 0) {
    console.log(`Change:    +${formatBytes(diff)} (+${percentChange}%) ⬆️  INCREASED`);
  } else if (diff < 0) {
    console.log(`Change:    ${formatBytes(diff)} (${percentChange}%) ⬇️  DECREASED`);
  } else {
    console.log('Change:    No change ➡️');
  }
  console.log('');

  // Category comparison
  console.log('📁 By Category:');
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

    console.log(`  ${category.padEnd(20)} ${formatBytes(currSize).padStart(12)} (${catPercent}% ${indicator})`);
  });
  console.log('');
}

// CLI handling
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
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
  `);
  process.exit(0);
}

const currentData = analyzeBundleSize();

if (args.includes('--save')) {
  const filename = args[args.indexOf('--save') + 1] || 'bundle-baseline.json';
  saveBaseline(currentData, filename);
} else if (args.includes('--compare')) {
  const filename = args[args.indexOf('--compare') + 1];
  if (!filename) {
    console.error('❌ Please provide baseline file: --compare FILE');
    process.exit(1);
  }
  compareWithBaseline(currentData, filename);
}

console.log('💡 Tips:');
console.log('   - Run `npm run build:analyze` for detailed bundle visualization');
console.log('   - Use dynamic imports for components > 50KB');
console.log('   - Check for duplicate dependencies with `npm ls [package]`');
console.log('');
