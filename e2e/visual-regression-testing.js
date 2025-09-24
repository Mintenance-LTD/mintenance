/**
 * VISUAL REGRESSION TESTING SYSTEM
 * Automated screenshot comparison and visual validation framework
 *
 * This system captures, compares, and validates UI consistency across:
 * - Different platforms (iOS, Android, Web)
 * - Different screen sizes and orientations
 * - Theme variations (light/dark mode)
 * - Component states and interactions
 */

const fs = require('fs').promises;
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const { createHash } = require('crypto');

class VisualRegressionTester {
  constructor(options = {}) {
    this.baselineDir = options.baselineDir || path.join(__dirname, '../test-results/visual-baselines');
    this.currentDir = options.currentDir || path.join(__dirname, '../test-results/visual-current');
    this.diffDir = options.diffDir || path.join(__dirname, '../test-results/visual-diffs');
    this.threshold = options.threshold || 0.1; // 0.1% difference threshold
    this.includeAA = options.includeAA !== false; // Include anti-aliasing by default
    this.diffColor = options.diffColor || [255, 0, 255]; // Magenta for differences

    this.testResults = new Map();
    this.reportData = {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      newBaselines: 0,
      results: [],
    };
  }

  // ============================================================================
  // INITIALIZATION & SETUP
  // ============================================================================

  async initialize() {
    await this.ensureDirectories();
    console.log('📸 Visual Regression Testing initialized');
  }

  async ensureDirectories() {
    const dirs = [this.baselineDir, this.currentDir, this.diffDir];
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  // ============================================================================
  // SCREENSHOT CAPTURE & MANAGEMENT
  // ============================================================================

  async captureComponentScreenshot(page, selector, testName, options = {}) {
    const element = await page.locator(selector);
    if (!(await element.isVisible())) {
      throw new Error(`Element ${selector} is not visible for screenshot`);
    }

    const screenshotOptions = {
      path: path.join(this.currentDir, `${testName}.png`),
      type: 'png',
      ...options,
    };

    // Wait for element to be stable
    await element.waitFor({ state: 'visible' });
    await page.waitForTimeout(500); // Allow animations to complete

    const screenshot = await element.screenshot(screenshotOptions);

    return {
      path: screenshotOptions.path,
      buffer: screenshot,
      metadata: {
        testName,
        selector,
        timestamp: Date.now(),
        viewport: await page.viewportSize(),
        url: page.url(),
      },
    };
  }

  async captureFullPageScreenshot(page, testName, options = {}) {
    const screenshotPath = path.join(this.currentDir, `${testName}.png`);

    // Scroll to top to ensure consistent starting point
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const screenshot = await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png',
      ...options,
    });

    return {
      path: screenshotPath,
      buffer: screenshot,
      metadata: {
        testName,
        type: 'fullPage',
        timestamp: Date.now(),
        viewport: await page.viewportSize(),
        url: page.url(),
      },
    };
  }

  async captureInteractionStates(page, selector, testName, interactions) {
    const states = [];

    for (const interaction of interactions) {
      const stateName = `${testName}-${interaction.state}`;

      // Apply interaction
      await this.applyInteraction(page, selector, interaction);

      // Capture screenshot
      const screenshot = await this.captureComponentScreenshot(page, selector, stateName);
      states.push({
        state: interaction.state,
        screenshot,
      });
    }

    return states;
  }

  async applyInteraction(page, selector, interaction) {
    const element = page.locator(selector);

    switch (interaction.type) {
      case 'hover':
        await element.hover();
        break;
      case 'focus':
        await element.focus();
        break;
      case 'click':
        await element.click();
        break;
      case 'press':
        await page.keyboard.press(interaction.key);
        break;
      case 'fill':
        await element.fill(interaction.value);
        break;
      case 'scroll':
        await page.evaluate((sel, options) => {
          const el = document.querySelector(sel);
          if (el) el.scrollTop = options.top || 0;
        }, selector, interaction);
        break;
      case 'css':
        await page.addStyleTag({ content: interaction.css });
        break;
      default:
        console.warn(`Unknown interaction type: ${interaction.type}`);
    }

    // Wait for visual changes to settle
    await page.waitForTimeout(interaction.delay || 300);
  }

  // ============================================================================
  // VISUAL COMPARISON
  // ============================================================================

  async compareScreenshots(testName, options = {}) {
    const currentPath = path.join(this.currentDir, `${testName}.png`);
    const baselinePath = path.join(this.baselineDir, `${testName}.png`);
    const diffPath = path.join(this.diffDir, `${testName}.png`);

    // Check if current screenshot exists
    try {
      await fs.access(currentPath);
    } catch {
      throw new Error(`Current screenshot not found: ${currentPath}`);
    }

    // Check if baseline exists
    let hasBaseline = true;
    try {
      await fs.access(baselinePath);
    } catch {
      hasBaseline = false;
    }

    if (!hasBaseline) {
      // Create new baseline
      await fs.copyFile(currentPath, baselinePath);
      this.reportData.newBaselines++;
      return {
        result: 'new-baseline',
        testName,
        message: 'New baseline created',
        diffPercentage: 0,
      };
    }

    // Load images for comparison
    const [currentImg, baselineImg] = await Promise.all([
      this.loadImage(currentPath),
      this.loadImage(baselinePath),
    ]);

    // Validate image dimensions
    if (currentImg.width !== baselineImg.width || currentImg.height !== baselineImg.height) {
      return {
        result: 'size-mismatch',
        testName,
        message: `Image size mismatch: ${currentImg.width}x${currentImg.height} vs ${baselineImg.width}x${baselineImg.height}`,
        diffPercentage: 100,
      };
    }

    // Perform pixel comparison
    const diffImg = new PNG({ width: currentImg.width, height: currentImg.height });
    const diffPixels = pixelmatch(
      currentImg.data,
      baselineImg.data,
      diffImg.data,
      currentImg.width,
      currentImg.height,
      {
        threshold: this.threshold,
        includeAA: this.includeAA,
        diffColor: this.diffColor,
      }
    );

    const totalPixels = currentImg.width * currentImg.height;
    const diffPercentage = (diffPixels / totalPixels) * 100;

    // Save diff image if there are differences
    if (diffPixels > 0) {
      await this.saveImage(diffImg, diffPath);
    }

    const passed = diffPercentage <= (options.threshold || this.threshold);

    return {
      result: passed ? 'passed' : 'failed',
      testName,
      diffPixels,
      totalPixels,
      diffPercentage: parseFloat(diffPercentage.toFixed(4)),
      threshold: options.threshold || this.threshold,
      diffImagePath: diffPixels > 0 ? diffPath : null,
    };
  }

  async loadImage(imagePath) {
    const buffer = await fs.readFile(imagePath);
    return PNG.sync.read(buffer);
  }

  async saveImage(pngData, outputPath) {
    const buffer = PNG.sync.write(pngData);
    await fs.writeFile(outputPath, buffer);
  }

  // ============================================================================
  // THEME & RESPONSIVE TESTING
  // ============================================================================

  async testThemeVariations(page, testName, themes = ['light', 'dark']) {
    const themeResults = [];

    for (const theme of themes) {
      console.log(`🎨 Testing ${theme} theme for ${testName}`);

      // Apply theme
      await this.applyTheme(page, theme);

      // Capture screenshots for different screen sizes
      const responsiveResults = await this.testResponsiveVariations(page, `${testName}-${theme}`);

      themeResults.push({
        theme,
        responsive: responsiveResults,
      });
    }

    return themeResults;
  }

  async applyTheme(page, theme) {
    await page.evaluate((themeName) => {
      // Add theme class to body
      document.body.className = document.body.className.replace(/theme-\w+/g, '');
      document.body.classList.add(`theme-${themeName}`);

      // Trigger theme change event
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: themeName } }));
    }, theme);

    // Wait for theme transition
    await page.waitForTimeout(1000);
  }

  async testResponsiveVariations(page, testName, viewports = null) {
    const defaultViewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 },
    ];

    const testViewports = viewports || defaultViewports;
    const responsiveResults = [];

    for (const viewport of testViewports) {
      console.log(`📱 Testing ${viewport.name} viewport for ${testName}`);

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500); // Allow layout to settle

      const screenshotName = `${testName}-${viewport.name}`;
      const screenshot = await this.captureFullPageScreenshot(page, screenshotName);
      const comparison = await this.compareScreenshots(screenshotName);

      responsiveResults.push({
        viewport: viewport.name,
        dimensions: `${viewport.width}x${viewport.height}`,
        screenshot,
        comparison,
      });
    }

    return responsiveResults;
  }

  // ============================================================================
  // COMPONENT-SPECIFIC TESTING
  // ============================================================================

  async testJobCard(page) {
    console.log('🃏 Testing JobCard component variations...');

    const jobCardStates = [
      { state: 'default', selector: '[data-testid="job-card"]:first-child' },
      { state: 'urgent', selector: '[data-testid="job-card-urgent"]' },
      { state: 'assigned', selector: '[data-testid="job-card-assigned"]' },
      { state: 'completed', selector: '[data-testid="job-card-completed"]' },
    ];

    const interactions = [
      { state: 'default', type: 'none' },
      { state: 'hover', type: 'hover' },
      { state: 'focused', type: 'focus' },
    ];

    const results = [];

    for (const cardState of jobCardStates) {
      try {
        const stateResults = await this.captureInteractionStates(
          page,
          cardState.selector,
          `job-card-${cardState.state}`,
          interactions
        );

        for (const stateResult of stateResults) {
          const comparison = await this.compareScreenshots(stateResult.screenshot.metadata.testName);
          results.push({
            component: 'JobCard',
            state: cardState.state,
            interaction: stateResult.state,
            comparison,
          });
        }
      } catch (error) {
        console.warn(`Failed to test JobCard state ${cardState.state}:`, error.message);
      }
    }

    return results;
  }

  async testContractorCard(page) {
    console.log('👷 Testing ContractorCard component variations...');

    const contractorStates = [
      { state: 'available', selector: '[data-testid="contractor-card-available"]' },
      { state: 'busy', selector: '[data-testid="contractor-card-busy"]' },
      { state: 'verified', selector: '[data-testid="contractor-card-verified"]' },
      { state: 'featured', selector: '[data-testid="contractor-card-featured"]' },
    ];

    const results = [];

    for (const contractorState of contractorStates) {
      try {
        const screenshot = await this.captureComponentScreenshot(
          page,
          contractorState.selector,
          `contractor-card-${contractorState.state}`
        );

        const comparison = await this.compareScreenshots(`contractor-card-${contractorState.state}`);

        results.push({
          component: 'ContractorCard',
          state: contractorState.state,
          comparison,
        });
      } catch (error) {
        console.warn(`Failed to test ContractorCard state ${contractorState.state}:`, error.message);
      }
    }

    return results;
  }

  async testFormComponents(page) {
    console.log('📝 Testing form component variations...');

    const formStates = [
      {
        name: 'job-form-empty',
        setup: async () => {
          await page.click('[data-testid="post-job-button"]');
          await page.waitForSelector('[data-testid="job-form"]');
        },
        selector: '[data-testid="job-form"]',
      },
      {
        name: 'job-form-filled',
        setup: async () => {
          await page.fill('[data-testid="job-title-input"]', 'Kitchen Faucet Repair');
          await page.fill('[data-testid="job-description-input"]', 'Leaking faucet needs immediate attention');
          await page.fill('[data-testid="job-budget-input"]', '150');
        },
        selector: '[data-testid="job-form"]',
      },
      {
        name: 'job-form-validation-errors',
        setup: async () => {
          await page.click('[data-testid="post-job-submit"]');
          await page.waitForSelector('[data-testid="validation-errors"]');
        },
        selector: '[data-testid="job-form"]',
      },
    ];

    const results = [];

    for (const formState of formStates) {
      try {
        await formState.setup();

        const screenshot = await this.captureComponentScreenshot(
          page,
          formState.selector,
          formState.name
        );

        const comparison = await this.compareScreenshots(formState.name);

        results.push({
          component: 'JobForm',
          state: formState.name,
          comparison,
        });
      } catch (error) {
        console.warn(`Failed to test form state ${formState.name}:`, error.message);
      }
    }

    return results;
  }

  // ============================================================================
  // ANIMATION & TRANSITION TESTING
  // ============================================================================

  async testAnimations(page, testName, animationSteps) {
    console.log(`🎬 Testing animations for ${testName}...`);

    const animationResults = [];

    for (let i = 0; i < animationSteps.length; i++) {
      const step = animationSteps[i];

      // Execute animation step
      await step.action(page);

      // Wait for animation to complete
      await page.waitForTimeout(step.duration || 1000);

      // Capture frame
      const frameName = `${testName}-frame-${i + 1}-${step.name}`;
      const screenshot = await this.captureFullPageScreenshot(page, frameName);

      // Compare if baseline exists
      const comparison = await this.compareScreenshots(frameName, { threshold: 0.5 }); // Higher threshold for animations

      animationResults.push({
        frame: i + 1,
        step: step.name,
        screenshot,
        comparison,
      });
    }

    return animationResults;
  }

  // ============================================================================
  // CROSS-PLATFORM TESTING
  // ============================================================================

  async testCrossPlatform(pages, testName) {
    console.log(`🌍 Testing cross-platform consistency for ${testName}...`);

    const platformResults = {};

    for (const [platform, page] of Object.entries(pages)) {
      try {
        const screenshot = await this.captureFullPageScreenshot(page, `${testName}-${platform}`);
        const comparison = await this.compareScreenshots(`${testName}-${platform}`);

        platformResults[platform] = {
          screenshot,
          comparison,
          platform,
        };
      } catch (error) {
        console.error(`Failed to test platform ${platform}:`, error.message);
        platformResults[platform] = {
          error: error.message,
          platform,
        };
      }
    }

    // Compare platforms against each other
    const platformComparisons = await this.comparePlatforms(platformResults, testName);

    return {
      individual: platformResults,
      crossPlatform: platformComparisons,
    };
  }

  async comparePlatforms(platformResults, testName) {
    const platforms = Object.keys(platformResults).filter(p => !platformResults[p].error);
    const comparisons = [];

    for (let i = 0; i < platforms.length; i++) {
      for (let j = i + 1; j < platforms.length; j++) {
        const platform1 = platforms[i];
        const platform2 = platforms[j];

        try {
          const comparisonName = `${testName}-${platform1}-vs-${platform2}`;

          // Copy images for comparison
          const platform1Path = platformResults[platform1].screenshot.path;
          const platform2Path = platformResults[platform2].screenshot.path;
          const tempComparePath = path.join(this.currentDir, `${comparisonName}.png`);

          await fs.copyFile(platform2Path, tempComparePath);
          await fs.copyFile(platform1Path, path.join(this.baselineDir, `${comparisonName}.png`));

          const comparison = await this.compareScreenshots(comparisonName, { threshold: 1.0 }); // More lenient for cross-platform

          comparisons.push({
            platforms: [platform1, platform2],
            comparison,
          });
        } catch (error) {
          console.error(`Failed to compare ${platform1} vs ${platform2}:`, error.message);
        }
      }
    }

    return comparisons;
  }

  // ============================================================================
  // REPORTING & ANALYSIS
  // ============================================================================

  async generateReport() {
    const reportPath = path.join(this.diffDir, 'visual-regression-report.html');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Regression Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 20px; }
        .header { background: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .stat-card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; }
        .passed { border-left: 4px solid #28a745; }
        .failed { border-left: 4px solid #dc3545; }
        .new { border-left: 4px solid #17a2b8; }
        .test-result { border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px; padding: 15px; }
        .test-images { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin-top: 15px; }
        .image-container { text-align: center; }
        .image-container img { max-width: 100%; height: auto; border: 1px solid #ccc; }
        .diff-highlight { background: #ffe6e6; }
        .filter-buttons { margin-bottom: 20px; }
        .filter-btn { padding: 8px 16px; margin-right: 10px; border: 1px solid #ddd; background: white; cursor: pointer; }
        .filter-btn.active { background: #007bff; color: white; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📸 Visual Regression Test Report</h1>
        <p>Generated: ${this.reportData.timestamp}</p>
    </div>

    <div class="summary">
        <div class="stat-card">
            <h3>Total Tests</h3>
            <div style="font-size: 2em; color: #333;">${this.reportData.totalTests}</div>
        </div>
        <div class="stat-card passed">
            <h3>Passed</h3>
            <div style="font-size: 2em; color: #28a745;">${this.reportData.passed}</div>
        </div>
        <div class="stat-card failed">
            <h3>Failed</h3>
            <div style="font-size: 2em; color: #dc3545;">${this.reportData.failed}</div>
        </div>
        <div class="stat-card new">
            <h3>New Baselines</h3>
            <div style="font-size: 2em; color: #17a2b8;">${this.reportData.newBaselines}</div>
        </div>
    </div>

    <div class="filter-buttons">
        <button class="filter-btn active" onclick="filterResults('all')">All</button>
        <button class="filter-btn" onclick="filterResults('failed')">Failed Only</button>
        <button class="filter-btn" onclick="filterResults('passed')">Passed Only</button>
        <button class="filter-btn" onclick="filterResults('new')">New Baselines</button>
    </div>

    <div id="test-results">
        ${this.reportData.results.map(result => this.generateTestResultHTML(result)).join('')}
    </div>

    <script>
        function filterResults(type) {
            const results = document.querySelectorAll('.test-result');
            const buttons = document.querySelectorAll('.filter-btn');

            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            results.forEach(result => {
                const shouldShow = type === 'all' || result.dataset.status === type;
                result.style.display = shouldShow ? 'block' : 'none';
            });
        }
    </script>
</body>
</html>`;

    await fs.writeFile(reportPath, html);
    console.log(`📊 Visual regression report generated: ${reportPath}`);

    return reportPath;
  }

  generateTestResultHTML(result) {
    const statusClass = result.comparison.result === 'passed' ? 'passed' :
                       result.comparison.result === 'new-baseline' ? 'new' : 'failed';

    return `
<div class="test-result" data-status="${result.comparison.result}">
    <h3>${result.testName}</h3>
    <div class="${statusClass}">
        Status: ${result.comparison.result.toUpperCase()}
        ${result.comparison.diffPercentage !== undefined ?
          `| Difference: ${result.comparison.diffPercentage}%` : ''}
    </div>

    <div class="test-images">
        <div class="image-container">
            <h4>Current</h4>
            <img src="${path.relative(this.diffDir, result.currentPath)}" alt="Current screenshot">
        </div>

        ${result.baselinePath ? `
        <div class="image-container">
            <h4>Baseline</h4>
            <img src="${path.relative(this.diffDir, result.baselinePath)}" alt="Baseline screenshot">
        </div>
        ` : ''}

        ${result.comparison.diffImagePath ? `
        <div class="image-container diff-highlight">
            <h4>Differences</h4>
            <img src="${path.relative(this.diffDir, result.comparison.diffImagePath)}" alt="Diff visualization">
        </div>
        ` : ''}
    </div>
</div>`;
  }

  addTestResult(testName, comparison, paths = {}) {
    this.reportData.totalTests++;

    switch (comparison.result) {
      case 'passed':
        this.reportData.passed++;
        break;
      case 'failed':
        this.reportData.failed++;
        break;
      case 'new-baseline':
        this.reportData.newBaselines++;
        break;
    }

    this.reportData.results.push({
      testName,
      comparison,
      ...paths,
    });
  }

  // ============================================================================
  // CLEANUP & UTILITIES
  // ============================================================================

  async cleanup() {
    // Archive old results
    const archiveDir = path.join(this.diffDir, '../archive', new Date().toISOString().split('T')[0]);
    await fs.mkdir(archiveDir, { recursive: true });

    try {
      const files = await fs.readdir(this.currentDir);
      for (const file of files) {
        if (file.endsWith('.png')) {
          await fs.rename(
            path.join(this.currentDir, file),
            path.join(archiveDir, file)
          );
        }
      }
    } catch (error) {
      console.warn('Failed to archive old results:', error.message);
    }

    console.log('🧹 Visual regression testing cleanup complete');
  }

  generateTestHash(testName, metadata) {
    const content = JSON.stringify({ testName, ...metadata });
    return createHash('md5').update(content).digest('hex').substring(0, 8);
  }
}

module.exports = { VisualRegressionTester };