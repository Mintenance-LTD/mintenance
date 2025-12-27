#!/usr/bin/env node

/**
 * Static Accessibility Testing Script for Mintenance Platform
 * Performs static code analysis for accessibility issues
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

// Patterns to check for accessibility issues
const ACCESSIBILITY_PATTERNS = {
  // Images without alt text
  imgWithoutAlt: /<img(?![^>]*alt=)[^>]*>/gi,

  // Buttons without text or aria-label
  emptyButton: /<button[^>]*>[\s]*<\/button>/gi,
  buttonWithoutLabel: /<button(?![^>]*aria-label=)(?![^>]*title=)[^>]*>[\s]*<[^>]+>[\s]*<\/button>/gi,

  // Form inputs without labels
  inputWithoutLabel: /<input(?![^>]*aria-label=)(?![^>]*aria-labelledby=)[^>]*type=["'](?!hidden|submit|button)[^"']*["'][^>]*>/gi,

  // Links without text
  emptyLink: /<a[^>]*href=[^>]*>[\s]*<\/a>/gi,

  // Missing semantic HTML
  divWithOnClick: /<div[^>]*onClick=/gi,
  spanWithOnClick: /<span[^>]*onClick=/gi,

  // Missing ARIA attributes
  modalWithoutRole: /<div[^>]*className=["'][^"']*modal[^"']*["'](?![^>]*role=)/gi,

  // Color contrast issues (basic check for hardcoded colors)
  lowContrastGray: /color:\s*#[89abcdef]{3,6}/gi,

  // Missing lang attribute
  htmlWithoutLang: /<html(?![^>]*lang=)[^>]*>/gi,

  // Autoplaying media
  autoplayVideo: /<video[^>]*autoplay/gi,

  // Missing skip navigation
  noSkipNav: /^(?!.*skip.*nav).*$/gims,

  // Focus outline removal
  outlineNone: /outline:\s*(none|0)/gi,

  // Small touch targets
  smallButton: /(?:width|height):\s*(?:[0-3]?[0-9]px|[0-2]\.?[0-9]?rem)/gi,
};

// Files to exclude from checks
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/*.min.js',
  '**/*.min.css',
  '**/coverage/**',
  '**/public/sw.js',
  '**/__tests__/**',
  '**/*.test.tsx',
  '**/*.test.ts',
  '**/*.spec.tsx',
  '**/*.spec.ts'
];

class AccessibilityScanner {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.fileCount = 0;
    this.totalIssues = 0;
  }

  scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    const fileIssues = [];

    // Check for images without alt text
    const imgMatches = content.match(ACCESSIBILITY_PATTERNS.imgWithoutAlt);
    if (imgMatches) {
      fileIssues.push({
        type: 'error',
        pattern: 'imgWithoutAlt',
        count: imgMatches.length,
        message: `${imgMatches.length} image(s) missing alt attribute`,
        wcag: '1.1.1 Level A',
        example: imgMatches[0].substring(0, 50) + '...'
      });
    }

    // Check for empty buttons
    const emptyButtonMatches = content.match(ACCESSIBILITY_PATTERNS.emptyButton);
    if (emptyButtonMatches) {
      fileIssues.push({
        type: 'error',
        pattern: 'emptyButton',
        count: emptyButtonMatches.length,
        message: `${emptyButtonMatches.length} empty button(s) without text or aria-label`,
        wcag: '4.1.2 Level A',
        example: emptyButtonMatches[0]
      });
    }

    // Check for inputs without labels
    const inputMatches = content.match(ACCESSIBILITY_PATTERNS.inputWithoutLabel);
    if (inputMatches) {
      fileIssues.push({
        type: 'error',
        pattern: 'inputWithoutLabel',
        count: inputMatches.length,
        message: `${inputMatches.length} form input(s) missing label or aria-label`,
        wcag: '3.3.2 Level A',
        example: inputMatches[0].substring(0, 50) + '...'
      });
    }

    // Check for empty links
    const emptyLinkMatches = content.match(ACCESSIBILITY_PATTERNS.emptyLink);
    if (emptyLinkMatches) {
      fileIssues.push({
        type: 'error',
        pattern: 'emptyLink',
        count: emptyLinkMatches.length,
        message: `${emptyLinkMatches.length} empty link(s) without text`,
        wcag: '2.4.4 Level A',
        example: emptyLinkMatches[0]
      });
    }

    // Check for divs/spans with onClick (should be buttons)
    const divClickMatches = content.match(ACCESSIBILITY_PATTERNS.divWithOnClick);
    const spanClickMatches = content.match(ACCESSIBILITY_PATTERNS.spanWithOnClick);
    if (divClickMatches || spanClickMatches) {
      const totalClicks = (divClickMatches?.length || 0) + (spanClickMatches?.length || 0);
      fileIssues.push({
        type: 'warning',
        pattern: 'nonSemanticClick',
        count: totalClicks,
        message: `${totalClicks} non-semantic element(s) with onClick handlers`,
        wcag: '4.1.2 Level A',
        recommendation: 'Use <button> or add role="button" and keyboard handlers'
      });
    }

    // Check for focus outline removal
    const outlineNoneMatches = content.match(ACCESSIBILITY_PATTERNS.outlineNone);
    if (outlineNoneMatches) {
      fileIssues.push({
        type: 'warning',
        pattern: 'outlineNone',
        count: outlineNoneMatches.length,
        message: `${outlineNoneMatches.length} instance(s) of focus outline removal`,
        wcag: '2.4.7 Level AA',
        recommendation: 'Provide visible focus indicators for keyboard navigation'
      });
    }

    // Check for autoplay video
    const autoplayMatches = content.match(ACCESSIBILITY_PATTERNS.autoplayVideo);
    if (autoplayMatches) {
      fileIssues.push({
        type: 'error',
        pattern: 'autoplayVideo',
        count: autoplayMatches.length,
        message: `${autoplayMatches.length} video(s) with autoplay`,
        wcag: '2.2.2 Level A',
        recommendation: 'Remove autoplay or provide pause controls'
      });
    }

    if (fileIssues.length > 0) {
      this.issues.push({
        file: relativePath,
        issues: fileIssues
      });
      this.totalIssues += fileIssues.length;
    }

    return fileIssues.length;
  }

  scanDirectory(directory, patterns) {
    console.log(`${colors.blue}Scanning ${directory} for accessibility issues...${colors.reset}\n`);

    const files = glob.sync(patterns, {
      cwd: directory,
      ignore: EXCLUDE_PATTERNS,
      absolute: true
    });

    console.log(`Found ${files.length} files to scan\n`);

    files.forEach(file => {
      this.fileCount++;
      const issueCount = this.scanFile(file);

      if (issueCount > 0) {
        console.log(`${colors.red}✗${colors.reset} ${path.relative(process.cwd(), file)} (${issueCount} issue${issueCount !== 1 ? 's' : ''})`);
      }
    });

    return this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bold}${colors.blue}ACCESSIBILITY SCAN RESULTS${colors.reset}`);
    console.log('='.repeat(60) + '\n');

    if (this.issues.length === 0) {
      console.log(`${colors.green}✓ No accessibility issues found!${colors.reset}\n`);
      return { success: true, issueCount: 0 };
    }

    // Group issues by type
    const issuesByType = {};
    this.issues.forEach(fileIssue => {
      fileIssue.issues.forEach(issue => {
        if (!issuesByType[issue.pattern]) {
          issuesByType[issue.pattern] = {
            count: 0,
            files: [],
            wcag: issue.wcag,
            message: issue.message,
            type: issue.type
          };
        }
        issuesByType[issue.pattern].count += issue.count;
        issuesByType[issue.pattern].files.push(fileIssue.file);
      });
    });

    // Display summary by issue type
    console.log(`${colors.bold}Issues by Type:${colors.reset}\n`);
    Object.entries(issuesByType).forEach(([pattern, data]) => {
      const color = data.type === 'error' ? colors.red : colors.yellow;
      const icon = data.type === 'error' ? '✗' : '⚠';

      console.log(`${color}${icon} ${pattern}${colors.reset}`);
      console.log(`  Total: ${data.count} occurrence(s) in ${data.files.length} file(s)`);
      if (data.wcag) {
        console.log(`  WCAG: ${data.wcag}`);
      }
      console.log(`  Files affected:`);
      data.files.slice(0, 3).forEach(file => {
        console.log(`    - ${file}`);
      });
      if (data.files.length > 3) {
        console.log(`    ... and ${data.files.length - 3} more`);
      }
      console.log();
    });

    // Display totals
    console.log('='.repeat(60));
    console.log(`${colors.bold}Summary:${colors.reset}`);
    console.log(`  Files scanned: ${this.fileCount}`);
    console.log(`  Files with issues: ${this.issues.length}`);
    console.log(`  Total issues found: ${this.totalIssues}`);

    const errors = this.issues.reduce((sum, f) =>
      sum + f.issues.filter(i => i.type === 'error').length, 0);
    const warnings = this.issues.reduce((sum, f) =>
      sum + f.issues.filter(i => i.type === 'warning').length, 0);

    console.log(`  ${colors.red}Errors: ${errors}${colors.reset}`);
    console.log(`  ${colors.yellow}Warnings: ${warnings}${colors.reset}`);
    console.log();

    // Save detailed report
    const reportPath = path.join(process.cwd(), 'accessibility-report-static.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        filesScanned: this.fileCount,
        filesWithIssues: this.issues.length,
        totalIssues: this.totalIssues,
        errors,
        warnings
      },
      issuesByType,
      fileIssues: this.issues
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`${colors.gray}Detailed report saved to: ${reportPath}${colors.reset}\n`);

    // Provide recommendations
    console.log(`${colors.bold}${colors.cyan}Recommendations:${colors.reset}`);
    console.log('1. Add alt attributes to all informative images');
    console.log('2. Ensure all form inputs have associated labels');
    console.log('3. Provide text content or aria-labels for buttons and links');
    console.log('4. Use semantic HTML elements (button instead of div with onClick)');
    console.log('5. Maintain visible focus indicators for keyboard navigation');
    console.log('6. Test with screen readers (NVDA, JAWS, VoiceOver)');
    console.log('7. Run automated testing with tools like axe-core or pa11y');
    console.log();

    return {
      success: errors === 0,
      issueCount: this.totalIssues,
      errors,
      warnings
    };
  }
}

// Main execution
function main() {
  const scanner = new AccessibilityScanner();

  // Determine which directories to scan
  const args = process.argv.slice(2);
  let targetDir = process.cwd();
  let patterns = ['**/*.tsx', '**/*.jsx', '**/*.ts', '**/*.js'];

  if (args.includes('--web')) {
    targetDir = path.join(process.cwd(), 'apps', 'web');
    console.log(`${colors.cyan}Scanning web app only...${colors.reset}\n`);
  } else if (args.includes('--mobile')) {
    targetDir = path.join(process.cwd(), 'apps', 'mobile');
    console.log(`${colors.cyan}Scanning mobile app only...${colors.reset}\n`);
  } else {
    console.log(`${colors.cyan}Scanning entire codebase...${colors.reset}\n`);
  }

  if (args.includes('--help')) {
    console.log(`${colors.bold}Mintenance Static Accessibility Scanner${colors.reset}\n`);
    console.log('Usage: node scripts/check-accessibility-static.js [options]\n');
    console.log('Options:');
    console.log('  --web      Scan only the web app');
    console.log('  --mobile   Scan only the mobile app');
    console.log('  --help     Show this help message\n');
    process.exit(0);
  }

  const result = scanner.scanDirectory(targetDir, patterns);

  // Exit with appropriate code
  if (!result.success) {
    console.log(`${colors.red}${colors.bold}✗ Accessibility issues found. Please fix errors before deploying.${colors.reset}\n`);
    process.exit(1);
  } else if (result.warnings > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠ Accessibility warnings found. Consider addressing these issues.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.green}${colors.bold}✓ No accessibility issues found!${colors.reset}\n`);
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { AccessibilityScanner };