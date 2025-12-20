/**
 * BROWSER TESTING FRAMEWORK SETUP
 * Cross-platform validation using Playwright for web version testing
 *
 * This setup enables testing the Expo web build across multiple browsers
 * and devices to ensure consistent functionality across platforms.
 */

const { chromium, firefox, webkit, devices } = require('@playwright/test');
const path = require('path');

class BrowserTestingFramework {
  constructor() {
    this.browsers = new Map();
    this.contexts = new Map();
    this.pages = new Map();
    this.baseUrl = process.env.WEB_TEST_URL || 'http://localhost:19006';
    this.screenshotDir = path.join(__dirname, '../test-results/screenshots');
    this.videoDir = path.join(__dirname, '../test-results/videos');
  }

  // ============================================================================
  // BROWSER MANAGEMENT
  // ============================================================================

  async setupBrowsers() {
    console.log('🌐 Setting up cross-platform browser testing...');

    // Setup Chrome/Chromium
    this.browsers.set('chromium', await chromium.launch({
      headless: process.env.CI === 'true',
      devtools: process.env.NODE_ENV === 'development',
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    }));

    // Setup Firefox
    this.browsers.set('firefox', await firefox.launch({
      headless: process.env.CI === 'true',
      firefoxUserPrefs: {
        'media.navigator.streams.fake': true, // For camera/mic testing
        'media.navigator.permission.disabled': true,
      },
    }));

    // Setup Safari (WebKit)
    this.browsers.set('webkit', await webkit.launch({
      headless: process.env.CI === 'true',
    }));

    console.log('✅ All browsers launched successfully');
  }

  async createBrowserContext(browserName, options = {}) {
    const browser = this.browsers.get(browserName);
    if (!browser) {
      throw new Error(`Browser ${browserName} not found`);
    }

    const contextOptions = {
      recordVideo: {
        dir: this.videoDir,
        size: { width: 1280, height: 720 },
      },
      ...options,
    };

    const context = await browser.newContext(contextOptions);

    // Enable request/response logging
    context.on('request', request => {
      console.log(`📤 ${request.method()} ${request.url()}`);
    });

    context.on('response', response => {
      if (response.status() >= 400) {
        console.error(`❌ ${response.status()} ${response.url()}`);
      }
    });

    this.contexts.set(`${browserName}-${Date.now()}`, context);
    return context;
  }

  // ============================================================================
  // DEVICE SIMULATION
  // ============================================================================

  async setupMobileDevices() {
    const mobileDevices = [
      'iPhone 13 Pro',
      'iPhone SE',
      'Pixel 7',
      'Galaxy S23',
      'iPad Pro',
      'Galaxy Tab S8',
    ];

    const deviceContexts = new Map();

    for (const deviceName of mobileDevices) {
      const device = devices[deviceName];
      if (device) {
        const context = await this.createBrowserContext('chromium', {
          ...device,
          locale: 'en-US',
          geolocation: { latitude: 37.7749, longitude: -122.4194 }, // San Francisco
          permissions: ['geolocation', 'camera', 'microphone', 'notifications'],
        });

        deviceContexts.set(deviceName, context);
        console.log(`📱 Setup device simulation: ${deviceName}`);
      }
    }

    return deviceContexts;
  }

  // ============================================================================
  // CROSS-BROWSER TEST RUNNER
  // ============================================================================

  async runCrossBrowserTest(testFunction, testName) {
    const results = new Map();
    const browsers = ['chromium', 'firefox', 'webkit'];

    for (const browserName of browsers) {
      try {
        console.log(`🧪 Running ${testName} on ${browserName}...`);

        const context = await this.createBrowserContext(browserName);
        const page = await context.newPage();

        // Setup page monitoring
        await this.setupPageMonitoring(page, `${testName}-${browserName}`);

        // Run the test
        const startTime = Date.now();
        await testFunction(page, browserName);
        const duration = Date.now() - startTime;

        results.set(browserName, {
          status: 'passed',
          duration,
          screenshots: await this.captureTestScreenshots(page, `${testName}-${browserName}`),
        });

        await context.close();
        console.log(`✅ ${testName} passed on ${browserName} (${duration}ms)`);

      } catch (error) {
        console.error(`❌ ${testName} failed on ${browserName}:`, error.message);
        results.set(browserName, {
          status: 'failed',
          error: error.message,
          screenshot: await this.captureFailureScreenshot(page, `${testName}-${browserName}-failure`),
        });
      }
    }

    return results;
  }

  // ============================================================================
  // RESPONSIVE DESIGN TESTING
  // ============================================================================

  async testResponsiveDesign(page) {
    const viewports = [
      { width: 320, height: 568, name: 'mobile-portrait' },
      { width: 568, height: 320, name: 'mobile-landscape' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 2560, height: 1440, name: 'desktop-large' },
    ];

    const responsiveResults = [];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000); // Allow layout to settle

      // Test critical elements visibility
      const elements = await this.checkCriticalElements(page);

      // Capture screenshot
      const screenshot = await page.screenshot({
        path: `${this.screenshotDir}/responsive-${viewport.name}.png`,
        fullPage: true,
      });

      responsiveResults.push({
        viewport: viewport.name,
        dimensions: `${viewport.width}x${viewport.height}`,
        elementsVisible: elements.allVisible,
        issues: elements.issues,
        screenshot: screenshot,
      });

      console.log(`📐 Tested ${viewport.name}: ${elements.allVisible ? '✅' : '❌'}`);
    }

    return responsiveResults;
  }

  async checkCriticalElements(page) {
    const criticalSelectors = [
      '[data-testid="header"]',
      '[data-testid="navigation"]',
      '[data-testid="main-content"]',
      '[data-testid="footer"]',
      '.job-card',
      '.contractor-card',
      '.message-input',
      '.search-bar',
    ];

    const issues = [];
    let visibleCount = 0;

    for (const selector of criticalSelectors) {
      try {
        const element = await page.locator(selector).first();
        const isVisible = await element.isVisible();

        if (isVisible) {
          visibleCount++;

          // Check if element is properly sized
          const boundingBox = await element.boundingBox();
          if (boundingBox && (boundingBox.width < 10 || boundingBox.height < 10)) {
            issues.push(`${selector} is too small: ${boundingBox.width}x${boundingBox.height}`);
          }
        } else {
          issues.push(`${selector} is not visible`);
        }
      } catch (error) {
        issues.push(`${selector} not found: ${error.message}`);
      }
    }

    return {
      allVisible: visibleCount === criticalSelectors.length,
      visibleCount,
      totalCount: criticalSelectors.length,
      issues,
    };
  }

  // ============================================================================
  // PERFORMANCE TESTING
  // ============================================================================

  async measureWebPerformance(page) {
    // Navigate to app
    await page.goto(this.baseUrl);

    // Measure Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const metrics = {};

          for (const entry of entries) {
            switch (entry.entryType) {
              case 'largest-contentful-paint':
                metrics.LCP = entry.startTime;
                break;
              case 'first-input':
                metrics.FID = entry.processingStart - entry.startTime;
                break;
              case 'layout-shift':
                if (!metrics.CLS) metrics.CLS = 0;
                metrics.CLS += entry.value;
                break;
            }
          }

          // Add navigation timing
          const navigation = performance.getEntriesByType('navigation')[0];
          metrics.loadTime = navigation.loadEventEnd - navigation.navigationStart;
          metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart;

          resolve(metrics);
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

        // Fallback timeout
        setTimeout(() => resolve({}), 10000);
      });
    });

    // Bundle size analysis
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(entry => ({
        name: entry.name,
        size: entry.transferSize,
        type: entry.initiatorType,
        duration: entry.duration,
      }));
    });

    const bundleSize = resources
      .filter(r => r.name.includes('.js') || r.name.includes('.css'))
      .reduce((total, r) => total + (r.size || 0), 0);

    return {
      coreWebVitals: metrics,
      bundleSize,
      resourceCount: resources.length,
      recommendations: this.generatePerformanceRecommendations(metrics, bundleSize),
    };
  }

  generatePerformanceRecommendations(metrics, bundleSize) {
    const recommendations = [];

    if (metrics.LCP > 2500) {
      recommendations.push('Largest Contentful Paint is slow - optimize images and critical resources');
    }

    if (metrics.FID > 100) {
      recommendations.push('First Input Delay is high - reduce JavaScript execution time');
    }

    if (metrics.CLS > 0.1) {
      recommendations.push('Cumulative Layout Shift detected - ensure proper image dimensions');
    }

    if (bundleSize > 1024 * 1024) { // 1MB
      recommendations.push('Bundle size is large - implement code splitting');
    }

    if (metrics.loadTime > 3000) {
      recommendations.push('Page load time is slow - optimize critical resources');
    }

    return recommendations;
  }

  // ============================================================================
  // ACCESSIBILITY TESTING
  // ============================================================================

  async testAccessibility(page) {
    // Inject axe-core for accessibility testing
    await page.addScriptTag({
      url: 'https://cdn.jsdelivr.net/npm/axe-core@latest/axe.min.js',
    });

    // Run accessibility scan
    const accessibilityResults = await page.evaluate(() => {
      return new Promise((resolve) => {
        axe.run((err, results) => {
          if (err) throw err;
          resolve(results);
        });
      });
    });

    // Test keyboard navigation
    const keyboardResults = await this.testKeyboardNavigation(page);

    // Test screen reader compatibility
    const screenReaderResults = await this.testScreenReaderCompatibility(page);

    return {
      axeResults: accessibilityResults,
      keyboardNavigation: keyboardResults,
      screenReader: screenReaderResults,
      summary: {
        violations: accessibilityResults.violations.length,
        passes: accessibilityResults.passes.length,
        incomplete: accessibilityResults.incomplete.length,
      },
    };
  }

  async testKeyboardNavigation(page) {
    const focusableElements = await page.locator('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])').all();

    let focusableCount = 0;
    const issues = [];

    for (const element of focusableElements) {
      try {
        await element.focus();
        const isFocused = await element.evaluate(el => document.activeElement === el);

        if (isFocused) {
          focusableCount++;
        } else {
          issues.push('Element not focusable with keyboard');
        }
      } catch (error) {
        issues.push(`Keyboard navigation error: ${error.message}`);
      }
    }

    return {
      totalElements: focusableElements.length,
      focusableElements: focusableCount,
      issues,
    };
  }

  async testScreenReaderCompatibility(page) {
    const ariaResults = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const issues = [];
      let properlyLabeled = 0;

      for (const element of elements) {
        if (['button', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase())) {
          const hasLabel = element.getAttribute('aria-label') ||
                          element.getAttribute('aria-labelledby') ||
                          element.querySelector('label') ||
                          element.getAttribute('title');

          if (hasLabel) {
            properlyLabeled++;
          } else {
            issues.push(`Interactive element missing label: ${element.tagName}`);
          }
        }
      }

      return { properlyLabeled, issues };
    });

    return ariaResults;
  }

  // ============================================================================
  // PAGE MONITORING & SCREENSHOTS
  // ============================================================================

  async setupPageMonitoring(page, testName) {
    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`🔴 Console Error in ${testName}:`, msg.text());
      }
    });

    // Monitor page errors
    page.on('pageerror', error => {
      console.error(`🔴 Page Error in ${testName}:`, error.message);
    });

    // Monitor network failures
    page.on('requestfailed', request => {
      console.error(`🔴 Network Error in ${testName}:`, request.failure().errorText);
    });
  }

  async captureTestScreenshots(page, testName) {
    const screenshots = [];

    // Capture desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    screenshots.push(await page.screenshot({
      path: `${this.screenshotDir}/${testName}-desktop.png`,
      fullPage: true,
    }));

    // Capture mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    screenshots.push(await page.screenshot({
      path: `${this.screenshotDir}/${testName}-mobile.png`,
      fullPage: true,
    }));

    return screenshots;
  }

  async captureFailureScreenshot(page, testName) {
    try {
      return await page.screenshot({
        path: `${this.screenshotDir}/${testName}.png`,
        fullPage: true,
      });
    } catch (error) {
      console.error('Failed to capture failure screenshot:', error);
      return null;
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async cleanup() {
    console.log('🧹 Cleaning up browser testing framework...');

    // Close all contexts
    for (const [name, context] of this.contexts) {
      try {
        await context.close();
      } catch (error) {
        console.warn(`Failed to close context ${name}:`, error);
      }
    }

    // Close all browsers
    for (const [name, browser] of this.browsers) {
      try {
        await browser.close();
      } catch (error) {
        console.warn(`Failed to close browser ${name}:`, error);
      }
    }

    this.browsers.clear();
    this.contexts.clear();
    this.pages.clear();

    console.log('✅ Browser testing framework cleanup complete');
  }
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

class BrowserTestScenarios {
  constructor(framework) {
    this.framework = framework;
  }

  async runAllScenarios() {
    console.log('🚀 Running all browser test scenarios...');

    const results = {};

    // 1. Cross-browser compatibility
    results.crossBrowser = await this.testCrossBrowserCompatibility();

    // 2. Responsive design
    results.responsive = await this.testResponsiveDesign();

    // 3. Performance validation
    results.performance = await this.testPerformanceAcrossBrowsers();

    // 4. Accessibility compliance
    results.accessibility = await this.testAccessibilityCompliance();

    // 5. Mobile device simulation
    results.mobileDevices = await this.testMobileDeviceCompatibility();

    return results;
  }

  async testCrossBrowserCompatibility() {
    return await this.framework.runCrossBrowserTest(async (page, browserName) => {
      // Navigate to app
      await page.goto(this.framework.baseUrl);

      // Test core functionality
      await page.waitForSelector('[data-testid="app-ready"]', { timeout: 10000 });

      // Test job posting flow
      await page.click('[data-testid="post-job-button"]');
      await page.waitForSelector('[data-testid="job-form"]');
      await page.fill('[data-testid="job-title-input"]', 'Test Job');
      await page.fill('[data-testid="job-description-input"]', 'Test description');

      // Test messaging
      await page.click('[data-testid="messages-tab"]');
      await page.waitForSelector('[data-testid="conversations-list"]');

      // Test search functionality
      await page.click('[data-testid="jobs-tab"]');
      await page.fill('[data-testid="search-input"]', 'plumbing');
      await page.press('[data-testid="search-input"]', 'Enter');

    }, 'Cross-Browser Compatibility');
  }

  async testResponsiveDesign() {
    const context = await this.framework.createBrowserContext('chromium');
    const page = await context.newPage();

    const results = await this.framework.testResponsiveDesign(page);

    await context.close();
    return results;
  }

  async testPerformanceAcrossBrowsers() {
    const performanceResults = {};

    for (const browserName of ['chromium', 'firefox', 'webkit']) {
      const context = await this.framework.createBrowserContext(browserName);
      const page = await context.newPage();

      performanceResults[browserName] = await this.framework.measureWebPerformance(page);

      await context.close();
    }

    return performanceResults;
  }

  async testAccessibilityCompliance() {
    const context = await this.framework.createBrowserContext('chromium');
    const page = await context.newPage();

    await page.goto(this.framework.baseUrl);
    const results = await this.framework.testAccessibility(page);

    await context.close();
    return results;
  }

  async testMobileDeviceCompatibility() {
    const deviceContexts = await this.framework.setupMobileDevices();
    const results = {};

    for (const [deviceName, context] of deviceContexts) {
      try {
        const page = await context.newPage();
        await page.goto(this.framework.baseUrl);

        // Test touch interactions
        await page.tap('[data-testid="post-job-button"]');
        await page.waitForSelector('[data-testid="job-form"]');

        // Test swipe gestures (for contractor discovery)
        await page.click('[data-testid="discovery-tab"]');
        await page.waitForSelector('[data-testid="contractor-card"]');

        results[deviceName] = {
          status: 'passed',
          screenshot: await page.screenshot(),
        };

        await context.close();
      } catch (error) {
        results[deviceName] = {
          status: 'failed',
          error: error.message,
        };
      }
    }

    return results;
  }
}

module.exports = {
  BrowserTestingFramework,
  BrowserTestScenarios,
};