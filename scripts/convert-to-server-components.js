#!/usr/bin/env node
/**
 * Server Component Conversion Script
 * Automatically converts safe client components to server components
 *
 * Usage:
 *   node scripts/convert-to-server-components.js           # Convert all safe components
 *   node scripts/convert-to-server-components.js --dry-run # Preview changes without modifying files
 *   node scripts/convert-to-server-components.js --file <path> # Convert specific file
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

class ServerComponentConverter {
  constructor(options = {}) {
    this.dryRun = options.dryRun || process.argv.includes('--dry-run');
    this.targetFile = this.getTargetFile();
    this.converted = [];
    this.failed = [];
  }

  getTargetFile() {
    const fileIndex = process.argv.indexOf('--file');
    if (fileIndex !== -1 && process.argv[fileIndex + 1]) {
      return process.argv[fileIndex + 1];
    }
    return null;
  }

  removeUseClient(content) {
    const lines = content.split('\n');

    // Remove 'use client' from first line
    if (lines[0].includes("'use client'") || lines[0].includes('"use client"')) {
      lines[0] = '';

      // Remove empty lines at the beginning
      while (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
      }
    }

    return lines.join('\n');
  }

  addAsyncToDataFetching(content) {
    // Convert data fetching components to async
    const patterns = [
      // Make function components async if they have data fetching
      {
        from: /export\s+(default\s+)?function\s+(\w+)\s*\([^)]*\)\s*{/g,
        to: (match, defaultKeyword, name) => {
          // Check if the component likely does data fetching
          const componentBody = this.extractComponentBody(content, match);
          if (this.hasDataFetching(componentBody)) {
            return `export ${defaultKeyword || ''}async function ${name}(${this.extractParams(match)}) {`;
          }
          return match;
        }
      },
      // Make arrow function components async if they have data fetching
      {
        from: /export\s+const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*{/g,
        to: (match, name, params) => {
          const componentBody = this.extractComponentBody(content, match);
          if (this.hasDataFetching(componentBody)) {
            return `export const ${name} = async (${params}) => {`;
          }
          return match;
        }
      }
    ];

    let modifiedContent = content;
    for (const pattern of patterns) {
      if (typeof pattern.to === 'function') {
        modifiedContent = modifiedContent.replace(pattern.from, pattern.to);
      } else {
        modifiedContent = modifiedContent.replace(pattern.from, pattern.to);
      }
    }

    return modifiedContent;
  }

  extractComponentBody(content, startMatch) {
    const startIndex = content.indexOf(startMatch);
    if (startIndex === -1) return '';

    let braceCount = 0;
    let inBody = false;
    let bodyContent = '';

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      if (char === '{') {
        braceCount++;
        inBody = true;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && inBody) {
          break;
        }
      }

      if (inBody) {
        bodyContent += char;
      }
    }

    return bodyContent;
  }

  extractParams(functionDeclaration) {
    const match = functionDeclaration.match(/\(([^)]*)\)/);
    return match ? match[1] : '';
  }

  hasDataFetching(componentBody) {
    const dataFetchingPatterns = [
      /await\s+fetch/,
      /await\s+supabase/,
      /await\s+prisma/,
      /await\s+db\./,
      /getServerSideProps/,
      /getStaticProps/
    ];

    return dataFetchingPatterns.some(pattern => pattern.test(componentBody));
  }

  optimizeImports(content) {
    // Remove client-only imports that are no longer needed
    const unnecessaryImports = [
      /import\s+{\s*useClient\s*}\s+from\s+['"].*?['"];?\n/g,
      /import\s+['"]client-only['"];?\n/g
    ];

    let optimized = content;
    for (const pattern of unnecessaryImports) {
      optimized = optimized.replace(pattern, '');
    }

    // Add server-only import if component does data fetching
    if (this.hasDataFetching(content) && !content.includes('server-only')) {
      optimized = `import 'server-only';\n${optimized}`;
    }

    return optimized;
  }

  convertFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check if it's a client component
      if (!content.startsWith("'use client'") && !content.startsWith('"use client"')) {
        return { success: false, reason: 'Not a client component' };
      }

      // Remove 'use client' directive
      let converted = this.removeUseClient(content);

      // Add async to data fetching components
      converted = this.addAsyncToDataFetching(converted);

      // Optimize imports
      converted = this.optimizeImports(converted);

      if (this.dryRun) {
        console.log(colors.yellow + '  [DRY RUN] Would convert: ' + filePath + colors.reset);
        return { success: true, dryRun: true };
      }

      // Write the converted file
      fs.writeFileSync(filePath, converted, 'utf-8');

      return { success: true };
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  async convertFromAnalysis() {
    // Try v2 analysis first (with dependency tracking), fallback to v1
    let analysisPath = path.join(process.cwd(), 'web-bundle-analysis-v2.json');
    let usingV2 = true;

    if (!fs.existsSync(analysisPath)) {
      analysisPath = path.join(process.cwd(), 'web-bundle-analysis.json');
      usingV2 = false;
    }

    if (!fs.existsSync(analysisPath)) {
      console.error(colors.red + '❌ No bundle analysis found. Run "node scripts/analyze-web-bundle-v2.js" first.' + colors.reset);
      process.exit(1);
    }

    if (usingV2) {
      console.log(colors.green + '✅ Using enhanced analysis with dependency tracking (v2)' + colors.reset);
    } else {
      console.log(colors.yellow + '⚠️  Using basic analysis (v1) - may contain false positives!' + colors.reset);
    }

    const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));

    if (!analysis.convertible || analysis.convertible.length === 0) {
      console.log(colors.yellow + '⚠️  No convertible components found.' + colors.reset);
      return;
    }

    console.log(colors.cyan + `🔄 Converting ${analysis.convertible.length} components to server components...` + colors.reset);

    for (const component of analysis.convertible) {
      const fullPath = path.join(process.cwd(), component.path);
      const result = this.convertFile(fullPath);

      if (result.success) {
        this.converted.push({
          path: component.path,
          size: component.size,
          name: component.componentName
        });
        console.log(colors.green + '  ✅ ' + component.path + colors.reset);
      } else {
        this.failed.push({
          path: component.path,
          reason: result.reason
        });
        console.log(colors.red + '  ❌ ' + component.path + ' - ' + result.reason + colors.reset);
      }
    }
  }

  convertSingleFile() {
    const fullPath = path.resolve(this.targetFile);

    if (!fs.existsSync(fullPath)) {
      console.error(colors.red + `❌ File not found: ${fullPath}` + colors.reset);
      process.exit(1);
    }

    console.log(colors.cyan + `🔄 Converting ${this.targetFile}...` + colors.reset);

    const result = this.convertFile(fullPath);

    if (result.success) {
      console.log(colors.green + `✅ Successfully converted ${this.targetFile}` + colors.reset);
    } else {
      console.log(colors.red + `❌ Failed to convert: ${result.reason}` + colors.reset);
      process.exit(1);
    }
  }

  printSummary() {
    if (this.dryRun) {
      console.log('\n' + colors.yellow + '🔍 DRY RUN COMPLETE - No files were modified' + colors.reset);
      return;
    }

    console.log('\n' + colors.bright + colors.blue + '═══════════════════════════════════════════════════════════');
    console.log('                    CONVERSION SUMMARY                       ');
    console.log('═══════════════════════════════════════════════════════════' + colors.reset);

    if (this.converted.length > 0) {
      const totalSize = this.converted.reduce((sum, c) => sum + c.size, 0);
      console.log(colors.green + `✅ Successfully converted: ${this.converted.length} components` + colors.reset);
      console.log(colors.green + `💾 Bundle reduction: ~${this.formatFileSize(totalSize)}` + colors.reset);

      console.log('\n' + colors.gray + 'Converted components:' + colors.reset);
      this.converted.forEach(c => {
        console.log(`  • ${c.name} (${c.path})`);
      });
    }

    if (this.failed.length > 0) {
      console.log('\n' + colors.red + `❌ Failed conversions: ${this.failed.length}` + colors.reset);
      this.failed.forEach(f => {
        console.log(`  • ${f.path}: ${f.reason}`);
      });
    }

    console.log('\n' + colors.bright + colors.blue + '🎯 NEXT STEPS' + colors.reset);
    console.log('1. Run tests to ensure components still work: ' + colors.cyan + 'npm test' + colors.reset);
    console.log('2. Build the application: ' + colors.cyan + 'npm run build' + colors.reset);
    console.log('3. Check bundle size: ' + colors.cyan + 'npm run analyze' + colors.reset);
    console.log('4. Test in browser for any issues');

    console.log('\n' + colors.bright + colors.blue + '═══════════════════════════════════════════════════════════' + colors.reset);
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async run() {
    console.log(colors.bright + colors.blue + '🚀 Server Component Converter' + colors.reset);

    if (this.dryRun) {
      console.log(colors.yellow + '📋 Running in DRY RUN mode - no files will be modified' + colors.reset);
    }

    if (this.targetFile) {
      this.convertSingleFile();
    } else {
      await this.convertFromAnalysis();
      this.printSummary();
    }
  }
}

// Run the converter
const converter = new ServerComponentConverter();
converter.run().catch(console.error);