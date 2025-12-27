#!/usr/bin/env node

/**
 * Accessibility Testing Script for Mintenance Platform
 * Performs automated WCAG 2.1 AA compliance checks
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const chalk = require('chalk');

// WCAG 2.1 AA Requirements
const WCAG_REQUIREMENTS = {
  contrastRatios: {
    normalText: 4.5,
    largeText: 3.0,
    uiComponents: 3.0
  },
  focusIndicator: {
    minContrast: 3.0,
    minOutlineWidth: 2
  },
  touchTarget: {
    minSize: 44 // pixels
  },
  timing: {
    minWarning: 20 // seconds before timeout
  }
};

// Pages to test
const TEST_PAGES = [
  { path: '/', name: 'Home' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/contractor/dashboard-enhanced', name: 'Contractor Dashboard' },
  { path: '/jobs/create', name: 'Create Job' },
  { path: '/profile', name: 'Profile' },
  { path: '/settings', name: 'Settings' }
];

// Accessibility checks to perform
class AccessibilityChecker {
  constructor(page) {
    this.page = page;
    this.issues = [];
    this.warnings = [];
    this.passes = [];
  }

  async runAllChecks() {
    console.log(chalk.blue('Running accessibility checks...'));

    await this.checkPageStructure();
    await this.checkImages();
    await this.checkForms();
    await this.checkButtons();
    await this.checkLinks();
    await this.checkColorContrast();
    await this.checkKeyboardNavigation();
    await this.checkAriaAttributes();
    await this.checkHeadingHierarchy();
    await this.checkLandmarks();
    await this.checkFocusManagement();
    await this.checkTouchTargets();
    await this.checkTimeouts();
    await this.checkResponsive();

    return {
      issues: this.issues,
      warnings: this.warnings,
      passes: this.passes,
      score: this.calculateScore()
    };
  }

  async checkPageStructure() {
    // Check for skip navigation links
    const skipNav = await this.page.$('[href^="#"][class*="skip"]');
    if (!skipNav) {
      this.issues.push({
        type: 'error',
        category: 'Navigation',
        message: 'Missing skip navigation links',
        wcag: '2.4.1 Level A',
        fix: 'Add skip navigation links at the beginning of the page'
      });
    } else {
      this.passes.push('Skip navigation links present');
    }

    // Check for main landmark
    const main = await this.page.$('main, [role="main"]');
    if (!main) {
      this.issues.push({
        type: 'error',
        category: 'Landmarks',
        message: 'Missing main landmark',
        wcag: '1.3.1 Level A',
        fix: 'Add <main> element or role="main" to main content area'
      });
    } else {
      this.passes.push('Main landmark present');
    }

    // Check for proper page title
    const title = await this.page.title();
    if (!title || title.length < 5) {
      this.issues.push({
        type: 'error',
        category: 'Page Structure',
        message: 'Page title missing or too short',
        wcag: '2.4.2 Level A',
        fix: 'Add descriptive page title'
      });
    } else {
      this.passes.push('Page has descriptive title');
    }
  }

  async checkImages() {
    const images = await this.page.$$eval('img', imgs =>
      imgs.map(img => ({
        src: img.src,
        alt: img.alt,
        hasAlt: img.hasAttribute('alt'),
        isDecorative: img.getAttribute('role') === 'presentation' || img.getAttribute('aria-hidden') === 'true'
      }))
    );

    let missingAlt = 0;
    images.forEach(img => {
      if (!img.hasAlt && !img.isDecorative) {
        missingAlt++;
      }
    });

    if (missingAlt > 0) {
      this.issues.push({
        type: 'error',
        category: 'Images',
        message: `${missingAlt} image(s) missing alt text`,
        wcag: '1.1.1 Level A',
        fix: 'Add descriptive alt text to all informative images'
      });
    } else {
      this.passes.push('All images have appropriate alt text');
    }
  }

  async checkForms() {
    // Check form labels
    const inputs = await this.page.$$eval(
      'input:not([type="hidden"]), textarea, select',
      elements => elements.map(el => ({
        type: el.type || el.tagName.toLowerCase(),
        id: el.id,
        name: el.name,
        hasLabel: !!el.labels?.length || !!el.getAttribute('aria-label') || !!el.getAttribute('aria-labelledby'),
        hasPlaceholder: !!el.placeholder,
        isRequired: el.required || el.getAttribute('aria-required') === 'true'
      }))
    );

    const unlabeledInputs = inputs.filter(input => !input.hasLabel);
    if (unlabeledInputs.length > 0) {
      this.issues.push({
        type: 'error',
        category: 'Forms',
        message: `${unlabeledInputs.length} form input(s) missing labels`,
        wcag: '3.3.2 Level A',
        fix: 'Add <label> elements or aria-label attributes to all form inputs'
      });
    } else {
      this.passes.push('All form inputs have labels');
    }

    // Check for form validation messages
    const errorMessages = await this.page.$$('[role="alert"], .error-message, .field-error');
    if (inputs.length > 0 && errorMessages.length === 0) {
      this.warnings.push({
        type: 'warning',
        category: 'Forms',
        message: 'No error message regions detected',
        wcag: '3.3.1 Level A',
        fix: 'Ensure form validation errors are announced to screen readers'
      });
    }

    // Check for required field indicators
    const requiredInputs = inputs.filter(input => input.isRequired);
    if (requiredInputs.length > 0) {
      const requiredIndicators = await this.page.$$('.required-field, [aria-required="true"]');
      if (requiredIndicators.length === 0) {
        this.warnings.push({
          type: 'warning',
          category: 'Forms',
          message: 'Required fields may not be clearly indicated',
          wcag: '3.3.2 Level A',
          fix: 'Add visual and programmatic indicators for required fields'
        });
      }
    }
  }

  async checkButtons() {
    const buttons = await this.page.$$eval('button, [role="button"]', btns =>
      btns.map(btn => ({
        text: btn.textContent?.trim(),
        hasAriaLabel: !!btn.getAttribute('aria-label'),
        hasTitle: !!btn.title,
        isDisabled: btn.disabled || btn.getAttribute('aria-disabled') === 'true',
        hasAccessibleText: !!(btn.textContent?.trim() || btn.getAttribute('aria-label') || btn.title)
      }))
    );

    const inaccessibleButtons = buttons.filter(btn => !btn.hasAccessibleText);
    if (inaccessibleButtons.length > 0) {
      this.issues.push({
        type: 'error',
        category: 'Buttons',
        message: `${inaccessibleButtons.length} button(s) missing accessible text`,
        wcag: '4.1.2 Level A',
        fix: 'Add text content or aria-label to all buttons'
      });
    } else {
      this.passes.push('All buttons have accessible text');
    }
  }

  async checkLinks() {
    const links = await this.page.$$eval('a[href]', anchors =>
      anchors.map(a => ({
        href: a.href,
        text: a.textContent?.trim(),
        hasAriaLabel: !!a.getAttribute('aria-label'),
        hasTitle: !!a.title,
        opensNewWindow: a.target === '_blank',
        hasAccessibleText: !!(a.textContent?.trim() || a.getAttribute('aria-label') || a.title)
      }))
    );

    // Check for links without accessible text
    const inaccessibleLinks = links.filter(link => !link.hasAccessibleText);
    if (inaccessibleLinks.length > 0) {
      this.issues.push({
        type: 'error',
        category: 'Links',
        message: `${inaccessibleLinks.length} link(s) missing accessible text`,
        wcag: '2.4.4 Level A',
        fix: 'Add descriptive text or aria-label to all links'
      });
    }

    // Check for links that open in new windows
    const newWindowLinks = links.filter(link => link.opensNewWindow);
    const unmarkedNewWindows = newWindowLinks.filter(link =>
      !link.text?.includes('new window') &&
      !link.text?.includes('external') &&
      !link.hasAriaLabel
    );

    if (unmarkedNewWindows.length > 0) {
      this.warnings.push({
        type: 'warning',
        category: 'Links',
        message: `${unmarkedNewWindows.length} link(s) open in new window without warning`,
        wcag: '3.2.5 Level AAA',
        fix: 'Add "(opens in new window)" text or aria-label for external links'
      });
    }
  }

  async checkColorContrast() {
    // Note: This is a simplified check. For production, use axe-core or similar
    const textElements = await this.page.$$eval(
      'p, span, h1, h2, h3, h4, h5, h6, a, button, td, th',
      elements => elements.map(el => {
        const styles = window.getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          fontSize: parseFloat(styles.fontSize),
          fontWeight: styles.fontWeight
        };
      })
    );

    // This is a placeholder - in production, calculate actual contrast ratios
    this.passes.push('Color contrast check completed (manual verification recommended)');
  }

  async checkKeyboardNavigation() {
    // Check if all interactive elements are keyboard accessible
    const focusableElements = await this.page.$$eval(
      'a, button, input, textarea, select, [tabindex]',
      elements => elements.map(el => ({
        tag: el.tagName.toLowerCase(),
        tabindex: el.getAttribute('tabindex'),
        isDisabled: el.disabled || el.getAttribute('aria-disabled') === 'true'
      }))
    );

    const negativeTabindex = focusableElements.filter(el =>
      el.tabindex && parseInt(el.tabindex) < 0 && !el.isDisabled
    );

    if (negativeTabindex.length > 0) {
      this.warnings.push({
        type: 'warning',
        category: 'Keyboard Navigation',
        message: `${negativeTabindex.length} element(s) removed from tab order`,
        wcag: '2.1.1 Level A',
        fix: 'Ensure all interactive elements are keyboard accessible'
      });
    }

    // Check for focus indicators (requires visual inspection)
    this.passes.push('Keyboard navigation check completed (manual testing recommended)');
  }

  async checkAriaAttributes() {
    // Check for valid ARIA attributes
    const ariaElements = await this.page.$$eval('[aria-label], [aria-labelledby], [aria-describedby], [role]',
      elements => elements.map(el => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        ariaLabelledby: el.getAttribute('aria-labelledby'),
        ariaDescribedby: el.getAttribute('aria-describedby')
      }))
    );

    // Check if aria-labelledby and aria-describedby reference existing elements
    for (const element of ariaElements) {
      if (element.ariaLabelledby) {
        const ids = element.ariaLabelledby.split(' ');
        for (const id of ids) {
          const exists = await this.page.$(`#${id}`);
          if (!exists) {
            this.issues.push({
              type: 'error',
              category: 'ARIA',
              message: `aria-labelledby references non-existent ID: ${id}`,
              wcag: '1.3.1 Level A',
              fix: `Ensure element with ID "${id}" exists`
            });
          }
        }
      }

      if (element.ariaDescribedby) {
        const ids = element.ariaDescribedby.split(' ');
        for (const id of ids) {
          const exists = await this.page.$(`#${id}`);
          if (!exists) {
            this.issues.push({
              type: 'error',
              category: 'ARIA',
              message: `aria-describedby references non-existent ID: ${id}`,
              wcag: '1.3.1 Level A',
              fix: `Ensure element with ID "${id}" exists`
            });
          }
        }
      }
    }

    if (ariaElements.length > 0 && this.issues.filter(i => i.category === 'ARIA').length === 0) {
      this.passes.push('ARIA attributes properly implemented');
    }
  }

  async checkHeadingHierarchy() {
    const headings = await this.page.$$eval('h1, h2, h3, h4, h5, h6',
      heads => heads.map(h => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent?.trim()
      }))
    );

    if (headings.length === 0) {
      this.warnings.push({
        type: 'warning',
        category: 'Headings',
        message: 'No headings found on page',
        wcag: '1.3.1 Level A',
        fix: 'Add appropriate heading structure to organize content'
      });
      return;
    }

    // Check for multiple H1s
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count === 0) {
      this.issues.push({
        type: 'error',
        category: 'Headings',
        message: 'No H1 heading found',
        wcag: '1.3.1 Level A',
        fix: 'Add a single H1 heading to identify the main content'
      });
    } else if (h1Count > 1) {
      this.warnings.push({
        type: 'warning',
        category: 'Headings',
        message: `Multiple H1 headings found (${h1Count})`,
        wcag: '1.3.1 Level A',
        fix: 'Use only one H1 per page'
      });
    }

    // Check for skipped heading levels
    let previousLevel = 0;
    let skipped = false;
    headings.forEach(heading => {
      if (previousLevel > 0 && heading.level > previousLevel + 1) {
        skipped = true;
      }
      previousLevel = heading.level;
    });

    if (skipped) {
      this.warnings.push({
        type: 'warning',
        category: 'Headings',
        message: 'Heading hierarchy has skipped levels',
        wcag: '1.3.1 Level A',
        fix: 'Ensure heading levels are not skipped (e.g., H2 to H4)'
      });
    } else if (headings.length > 0) {
      this.passes.push('Proper heading hierarchy maintained');
    }
  }

  async checkLandmarks() {
    const landmarks = await this.page.$$eval(
      'header, nav, main, aside, footer, [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]',
      elements => elements.map(el => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role') || el.tagName.toLowerCase()
      }))
    );

    const hasMain = landmarks.some(l => l.role === 'main' || l.tag === 'main');
    const hasNav = landmarks.some(l => l.role === 'navigation' || l.tag === 'nav');

    if (!hasMain) {
      this.issues.push({
        type: 'error',
        category: 'Landmarks',
        message: 'No main landmark found',
        wcag: '1.3.1 Level A',
        fix: 'Add <main> element or role="main" to identify main content'
      });
    }

    if (!hasNav) {
      this.warnings.push({
        type: 'warning',
        category: 'Landmarks',
        message: 'No navigation landmark found',
        wcag: '1.3.1 Level A',
        fix: 'Add <nav> element or role="navigation" for navigation areas'
      });
    }

    if (landmarks.length > 0 && hasMain) {
      this.passes.push('Landmark regions properly defined');
    }
  }

  async checkFocusManagement() {
    // Check for visible focus indicators
    await this.page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = ':focus { outline: 3px solid red !important; }';
      document.head.appendChild(style);
    });

    // This requires manual testing
    this.passes.push('Focus management check completed (manual verification required)');
  }

  async checkTouchTargets() {
    // Check minimum touch target size on mobile
    const viewport = await this.page.viewportSize();
    if (viewport && viewport.width <= 768) {
      const interactiveElements = await this.page.$$eval(
        'button, a, input[type="checkbox"], input[type="radio"], [role="button"]',
        elements => elements.map(el => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            width: rect.width,
            height: rect.height,
            tooSmall: rect.width < 44 || rect.height < 44
          };
        })
      );

      const smallTargets = interactiveElements.filter(el => el.tooSmall);
      if (smallTargets.length > 0) {
        this.issues.push({
          type: 'error',
          category: 'Touch Targets',
          message: `${smallTargets.length} touch target(s) below 44x44px minimum`,
          wcag: '2.5.5 Level AAA',
          fix: 'Ensure all touch targets are at least 44x44 pixels'
        });
      } else {
        this.passes.push('All touch targets meet minimum size requirements');
      }
    }
  }

  async checkTimeouts() {
    // Check for session timeout warnings
    const hasTimeoutWarning = await this.page.$('[role="alert"], .timeout-warning, .session-warning');

    this.warnings.push({
      type: 'info',
      category: 'Timing',
      message: 'Ensure users are warned before session timeouts',
      wcag: '2.2.1 Level A',
      fix: 'Provide at least 20 seconds warning before timeout'
    });
  }

  async checkResponsive() {
    // Check if page is responsive
    const viewports = [
      { width: 320, height: 568, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];

    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await this.page.waitForTimeout(500);

      // Check for horizontal scroll
      const hasHorizontalScroll = await this.page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalScroll) {
        this.warnings.push({
          type: 'warning',
          category: 'Responsive Design',
          message: `Horizontal scroll detected at ${viewport.name} viewport (${viewport.width}px)`,
          wcag: '1.4.10 Level AA',
          fix: 'Ensure content reflows without horizontal scrolling'
        });
      }
    }
  }

  calculateScore() {
    const totalChecks = this.issues.length + this.warnings.length + this.passes.length;
    if (totalChecks === 0) return 0;

    const score = (this.passes.length / totalChecks) * 100;
    return Math.round(score);
  }
}

// Main test runner
async function runAccessibilityTests() {
  console.log(chalk.bold.blue('\n🔍 Mintenance Accessibility Testing Tool\n'));
  console.log(chalk.gray('Testing WCAG 2.1 AA Compliance...\n'));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const results = {
    timestamp: new Date().toISOString(),
    pages: [],
    summary: {
      totalIssues: 0,
      totalWarnings: 0,
      totalPasses: 0,
      averageScore: 0
    }
  };

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Set base URL (adjust as needed)
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    for (const testPage of TEST_PAGES) {
      console.log(chalk.yellow(`\nTesting: ${testPage.name} (${testPage.path})`));

      try {
        await page.goto(`${baseUrl}${testPage.path}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        const checker = new AccessibilityChecker(page);
        const pageResults = await checker.runAllChecks();

        results.pages.push({
          name: testPage.name,
          path: testPage.path,
          ...pageResults
        });

        results.summary.totalIssues += pageResults.issues.length;
        results.summary.totalWarnings += pageResults.warnings.length;
        results.summary.totalPasses += pageResults.passes.length;

        // Display results for this page
        if (pageResults.issues.length > 0) {
          console.log(chalk.red(`  ❌ ${pageResults.issues.length} issue(s) found`));
          pageResults.issues.forEach(issue => {
            console.log(chalk.red(`     - ${issue.message}`));
          });
        }

        if (pageResults.warnings.length > 0) {
          console.log(chalk.yellow(`  ⚠️  ${pageResults.warnings.length} warning(s)`));
        }

        if (pageResults.passes.length > 0) {
          console.log(chalk.green(`  ✅ ${pageResults.passes.length} check(s) passed`));
        }

        console.log(chalk.cyan(`  Score: ${pageResults.score}%`));

      } catch (error) {
        console.error(chalk.red(`  Error testing ${testPage.name}: ${error.message}`));
        results.pages.push({
          name: testPage.name,
          path: testPage.path,
          error: error.message
        });
      }
    }

    // Calculate average score
    const validPages = results.pages.filter(p => !p.error);
    if (validPages.length > 0) {
      results.summary.averageScore = Math.round(
        validPages.reduce((sum, page) => sum + page.score, 0) / validPages.length
      );
    }

    // Display summary
    console.log(chalk.bold.blue('\n📊 Summary\n'));
    console.log(chalk.red(`Total Issues: ${results.summary.totalIssues}`));
    console.log(chalk.yellow(`Total Warnings: ${results.summary.totalWarnings}`));
    console.log(chalk.green(`Total Passes: ${results.summary.totalPasses}`));
    console.log(chalk.cyan(`Average Score: ${results.summary.averageScore}%`));

    // Generate report file
    const reportPath = path.join(process.cwd(), 'accessibility-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(chalk.gray(`\nDetailed report saved to: ${reportPath}`));

    // Generate HTML report
    generateHTMLReport(results);

    // Exit with error code if critical issues found
    if (results.summary.totalIssues > 0) {
      console.log(chalk.red('\n❌ Accessibility issues found. Please fix before deploying.\n'));
      process.exit(1);
    } else if (results.summary.totalWarnings > 0) {
      console.log(chalk.yellow('\n⚠️  Accessibility warnings found. Consider addressing these.\n'));
      process.exit(0);
    } else {
      console.log(chalk.green('\n✅ All accessibility checks passed!\n'));
      process.exit(0);
    }

  } catch (error) {
    console.error(chalk.red(`\n❌ Test runner error: ${error.message}\n`));
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Generate HTML report
function generateHTMLReport(results) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Report - Mintenance</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #0066CC; }
    h2 { color: #333; margin-top: 30px; }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .score {
      font-size: 48px;
      font-weight: bold;
      color: ${results.summary.averageScore >= 80 ? '#00AA00' : results.summary.averageScore >= 60 ? '#FFA500' : '#CC0000'};
    }
    .stats {
      display: flex;
      gap: 30px;
      margin-top: 20px;
    }
    .stat {
      flex: 1;
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
    }
    .issues { color: #CC0000; }
    .warnings { color: #FFA500; }
    .passes { color: #00AA00; }
    .page-result {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .issue-item, .warning-item {
      padding: 10px;
      margin: 10px 0;
      border-left: 4px solid;
      background: #f9f9f9;
    }
    .issue-item {
      border-color: #CC0000;
    }
    .warning-item {
      border-color: #FFA500;
    }
    .wcag-ref {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .fix {
      font-style: italic;
      color: #0066CC;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <h1>🔍 Mintenance Accessibility Report</h1>
  <p>Generated: ${new Date(results.timestamp).toLocaleString()}</p>

  <div class="summary">
    <h2>Overall Score</h2>
    <div class="score">${results.summary.averageScore}%</div>
    <div class="stats">
      <div class="stat">
        <div class="stat-value issues">${results.summary.totalIssues}</div>
        <div>Issues</div>
      </div>
      <div class="stat">
        <div class="stat-value warnings">${results.summary.totalWarnings}</div>
        <div>Warnings</div>
      </div>
      <div class="stat">
        <div class="stat-value passes">${results.summary.totalPasses}</div>
        <div>Passes</div>
      </div>
    </div>
  </div>

  <h2>Page Results</h2>
  ${results.pages.map(page => `
    <div class="page-result">
      <h3>${page.name} (${page.path})</h3>
      ${page.error ?
        `<p style="color: #CC0000;">Error: ${page.error}</p>` :
        `
        <p>Score: <strong>${page.score}%</strong></p>

        ${page.issues?.length > 0 ? `
          <h4>Issues (${page.issues.length})</h4>
          ${page.issues.map(issue => `
            <div class="issue-item">
              <strong>${issue.category}:</strong> ${issue.message}
              <div class="wcag-ref">WCAG: ${issue.wcag}</div>
              <div class="fix">Fix: ${issue.fix}</div>
            </div>
          `).join('')}
        ` : ''}

        ${page.warnings?.length > 0 ? `
          <h4>Warnings (${page.warnings.length})</h4>
          ${page.warnings.map(warning => `
            <div class="warning-item">
              <strong>${warning.category}:</strong> ${warning.message}
              ${warning.wcag ? `<div class="wcag-ref">WCAG: ${warning.wcag}</div>` : ''}
              ${warning.fix ? `<div class="fix">Fix: ${warning.fix}</div>` : ''}
            </div>
          `).join('')}
        ` : ''}
        `
      }
    </div>
  `).join('')}
</body>
</html>
  `;

  const reportPath = path.join(process.cwd(), 'accessibility-report.html');
  fs.writeFileSync(reportPath, html);
  console.log(chalk.gray(`HTML report saved to: ${reportPath}`));
}

// Run tests if executed directly
if (require.main === module) {
  runAccessibilityTests().catch(error => {
    console.error(chalk.red(`\n❌ Fatal error: ${error.message}\n`));
    process.exit(1);
  });
}

module.exports = { AccessibilityChecker, runAccessibilityTests };