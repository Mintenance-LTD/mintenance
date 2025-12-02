#!/usr/bin/env npx ts-node

/**
 * 2025 UI Migration Script
 *
 * This script handles the file operations for migrating from legacy to 2025 UI:
 * 1. Archives legacy page.tsx files to _archive/pre-2025/
 * 2. Renames page2025.tsx files to page.tsx
 * 3. Archives legacy components
 *
 * Usage:
 *   npx ts-node apps/web/scripts/migrate-to-2025.ts [--dry-run] [--step archive|rename|components]
 *
 * Options:
 *   --dry-run      Preview changes without making them
 *   --step         Run only a specific step (archive, rename, or components)
 */

import * as fs from 'fs';
import * as path from 'path';

// ==========================================================
// CONFIGURATION
// ==========================================================

const WEB_APP_ROOT = path.resolve(__dirname, '..');
const ARCHIVE_DIR = path.join(WEB_APP_ROOT, 'app', '_archive', 'pre-2025');
const COMPONENTS_ARCHIVE_DIR = path.join(
  WEB_APP_ROOT,
  'app',
  'dashboard',
  'components',
  '_archive',
  'pre-2025'
);

// Legacy components to archive
const LEGACY_COMPONENTS = [
  'app/dashboard/components/LargeChart.tsx',
  'app/dashboard/components/JobStatusStepper.tsx',
  'app/dashboard/components/PrimaryMetricCard.tsx',
];

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================

interface MigrationResult {
  success: boolean;
  action: string;
  source: string;
  destination?: string;
  error?: string;
}

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
  const prefix = {
    info: '\x1b[36m[INFO]\x1b[0m',
    success: '\x1b[32m[SUCCESS]\x1b[0m',
    error: '\x1b[31m[ERROR]\x1b[0m',
    warn: '\x1b[33m[WARN]\x1b[0m',
  };
  console.log(`${prefix[type]} ${message}`);
}

function ensureDirectoryExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`Created directory: ${dir}`, 'success');
  }
}

function findPage2025Files(dir: string, files: string[] = []): string[] {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      // Skip archive and node_modules directories
      if (item.name === '_archive' || item.name === 'node_modules') {
        continue;
      }
      findPage2025Files(fullPath, files);
    } else if (item.name === 'page2025.tsx') {
      files.push(fullPath);
    }
  }

  return files;
}

function getArchivePath(originalPath: string): string {
  // Convert app/dashboard/page.tsx -> dashboard-page.tsx
  const relativePath = path.relative(path.join(WEB_APP_ROOT, 'app'), originalPath);
  const archiveName = relativePath.replace(/\//g, '-').replace(/\\/g, '-');
  return path.join(ARCHIVE_DIR, archiveName);
}

// ==========================================================
// MIGRATION STEPS
// ==========================================================

/**
 * Step 1: Archive legacy page.tsx files
 */
function archiveLegacyPages(dryRun: boolean): MigrationResult[] {
  log('\n=== Step 1: Archive Legacy Pages ===\n', 'info');
  const results: MigrationResult[] = [];

  // Find all page2025.tsx files
  const page2025Files = findPage2025Files(path.join(WEB_APP_ROOT, 'app'));
  log(`Found ${page2025Files.length} page2025.tsx files`, 'info');

  for (const page2025Path of page2025Files) {
    const dir = path.dirname(page2025Path);
    const legacyPagePath = path.join(dir, 'page.tsx');

    // Check if legacy page.tsx exists
    if (fs.existsSync(legacyPagePath)) {
      const archivePath = getArchivePath(legacyPagePath);

      if (dryRun) {
        log(`Would archive: ${legacyPagePath} -> ${archivePath}`, 'info');
        results.push({
          success: true,
          action: 'archive',
          source: legacyPagePath,
          destination: archivePath,
        });
      } else {
        try {
          ensureDirectoryExists(path.dirname(archivePath));
          fs.renameSync(legacyPagePath, archivePath);
          log(`Archived: ${legacyPagePath} -> ${archivePath}`, 'success');
          results.push({
            success: true,
            action: 'archive',
            source: legacyPagePath,
            destination: archivePath,
          });
        } catch (error) {
          log(`Failed to archive: ${legacyPagePath} - ${error}`, 'error');
          results.push({
            success: false,
            action: 'archive',
            source: legacyPagePath,
            error: String(error),
          });
        }
      }
    } else {
      log(`No legacy page.tsx found for: ${page2025Path}`, 'warn');
    }
  }

  return results;
}

/**
 * Step 2: Rename page2025.tsx files to page.tsx
 */
function renamePage2025Files(dryRun: boolean): MigrationResult[] {
  log('\n=== Step 2: Rename page2025.tsx to page.tsx ===\n', 'info');
  const results: MigrationResult[] = [];

  const page2025Files = findPage2025Files(path.join(WEB_APP_ROOT, 'app'));

  for (const page2025Path of page2025Files) {
    const dir = path.dirname(page2025Path);
    const newPagePath = path.join(dir, 'page.tsx');

    // Check if page.tsx already exists (should be archived by now)
    if (fs.existsSync(newPagePath)) {
      log(`page.tsx already exists at: ${newPagePath} - skipping rename`, 'warn');
      results.push({
        success: false,
        action: 'rename',
        source: page2025Path,
        error: 'Destination file already exists',
      });
      continue;
    }

    if (dryRun) {
      log(`Would rename: ${page2025Path} -> ${newPagePath}`, 'info');
      results.push({
        success: true,
        action: 'rename',
        source: page2025Path,
        destination: newPagePath,
      });
    } else {
      try {
        fs.renameSync(page2025Path, newPagePath);
        log(`Renamed: ${page2025Path} -> ${newPagePath}`, 'success');
        results.push({
          success: true,
          action: 'rename',
          source: page2025Path,
          destination: newPagePath,
        });
      } catch (error) {
        log(`Failed to rename: ${page2025Path} - ${error}`, 'error');
        results.push({
          success: false,
          action: 'rename',
          source: page2025Path,
          error: String(error),
        });
      }
    }
  }

  return results;
}

/**
 * Step 3: Archive legacy components
 */
function archiveLegacyComponents(dryRun: boolean): MigrationResult[] {
  log('\n=== Step 3: Archive Legacy Components ===\n', 'info');
  const results: MigrationResult[] = [];

  for (const componentPath of LEGACY_COMPONENTS) {
    const fullPath = path.join(WEB_APP_ROOT, componentPath);
    const fileName = path.basename(componentPath);
    const archivePath = path.join(COMPONENTS_ARCHIVE_DIR, fileName);

    if (!fs.existsSync(fullPath)) {
      log(`Component not found: ${fullPath}`, 'warn');
      continue;
    }

    if (dryRun) {
      log(`Would archive: ${fullPath} -> ${archivePath}`, 'info');
      results.push({
        success: true,
        action: 'archive-component',
        source: fullPath,
        destination: archivePath,
      });
    } else {
      try {
        ensureDirectoryExists(path.dirname(archivePath));
        fs.renameSync(fullPath, archivePath);
        log(`Archived: ${fullPath} -> ${archivePath}`, 'success');
        results.push({
          success: true,
          action: 'archive-component',
          source: fullPath,
          destination: archivePath,
        });
      } catch (error) {
        log(`Failed to archive: ${fullPath} - ${error}`, 'error');
        results.push({
          success: false,
          action: 'archive-component',
          source: fullPath,
          error: String(error),
        });
      }
    }
  }

  return results;
}

// ==========================================================
// MAIN EXECUTION
// ==========================================================

function printSummary(results: MigrationResult[]): void {
  log('\n=== Migration Summary ===\n', 'info');

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  log(`Total operations: ${results.length}`, 'info');
  log(`Successful: ${successful.length}`, 'success');
  log(`Failed: ${failed.length}`, failed.length > 0 ? 'error' : 'info');

  if (failed.length > 0) {
    log('\nFailed operations:', 'error');
    for (const result of failed) {
      log(`  - ${result.source}: ${result.error}`, 'error');
    }
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const stepArg = args.find((arg) => arg.startsWith('--step='));
  const step = stepArg ? stepArg.split('=')[1] : null;

  log('');
  log('=======================================', 'info');
  log('  2025 UI MIGRATION SCRIPT', 'info');
  log('=======================================', 'info');
  log('');

  if (dryRun) {
    log('DRY RUN MODE - No changes will be made\n', 'warn');
  }

  let results: MigrationResult[] = [];

  if (!step || step === 'archive') {
    results = results.concat(archiveLegacyPages(dryRun));
  }

  if (!step || step === 'rename') {
    results = results.concat(renamePage2025Files(dryRun));
  }

  if (!step || step === 'components') {
    results = results.concat(archiveLegacyComponents(dryRun));
  }

  printSummary(results);

  if (dryRun) {
    log('\nTo execute these changes, run without --dry-run', 'info');
  }
}

main();

