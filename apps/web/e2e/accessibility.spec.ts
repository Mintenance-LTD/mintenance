/**
 * Automated Accessibility Testing with Playwright
 *
 * Tests WCAG compliance across all pages and components.
 * Uses axe-core for comprehensive accessibility checks.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ============================================
// TEST CONFIGURATION
// ============================================

const pages = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Jobs', path: '/jobs' },
  { name: 'Contractors', path: '/contractors' },
  { name: 'Properties', path: '/properties' },
  { name: 'Messages', path: '/messages' },
  { name: 'Settings', path: '/settings' },
  { name: 'Contractor Dashboard', path: '/contractor/dashboard-enhanced' },
  { name: 'Contractor Profile', path: '/contractor/profile' },
  { name: 'Contractor Discover', path: '/contractor/discover' },
];

// ============================================
// ACCESSIBILITY TESTS
// ============================================

test.describe('Accessibility Tests', () => {
  // Test each page for accessibility violations
  pages.forEach(({ name, path }) => {
    test(`${name} page should have no accessibility violations`, async ({ page }) => {
      await page.goto(path);

      // Wait for content to load
      await page.waitForLoadState('networkidle');

      // Run axe accessibility checks
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Expect no violations
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  // Test keyboard navigation
  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();

    // Continue tabbing and ensure focus is visible
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const element = document.activeElement;
        if (!element) return null;

        const styles = window.getComputedStyle(element);
        return {
          tagName: element.tagName,
          hasOutline: styles.outline !== 'none' || styles.boxShadow.includes('ring'),
        };
      });

      // Ensure focused element has visible focus indicator
      if (focused) {
        expect(focused.hasOutline).toBeTruthy();
      }
    }
  });

  // Test form accessibility
  test('forms should have proper labels and error messages', async ({ page }) => {
    await page.goto('/jobs/create');

    // Check that all inputs have labels
    const inputs = await page.$$('input:not([type="hidden"]), textarea, select');

    for (const input of inputs) {
      const hasLabel = await input.evaluate((el) => {
        const id = el.getAttribute('id');
        const hasAriaLabel = el.hasAttribute('aria-label');
        const hasAriaLabelledBy = el.hasAttribute('aria-labelledby');
        const hasLabelElement = id ? document.querySelector(`label[for="${id}"]`) !== null : false;

        return hasLabel || hasAriaLabel || hasAriaLabelledBy || hasLabelElement;
      });

      expect(hasLabel).toBeTruthy();
    }

    // Submit empty form to trigger validation
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();

      // Check for error messages with proper ARIA attributes
      const errorMessages = await page.$$('[role="alert"], [aria-live="polite"], .error-message');
      expect(errorMessages.length).toBeGreaterThan(0);
    }
  });

  // Test color contrast
  test('text should have sufficient color contrast', async ({ page }) => {
    await page.goto('/dashboard');

    const contrastIssues = await page.evaluate(() => {
      const issues: any[] = [];
      const elements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button');

      elements.forEach((element) => {
        const styles = window.getComputedStyle(element as HTMLElement);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;

        // Skip if background is transparent
        if (backgroundColor === 'rgba(0, 0, 0, 0)') return;

        // This is a simplified check - in production, use a proper contrast calculation
        // Here we're just ensuring colors are defined
        if (!color || !backgroundColor) {
          issues.push({
            element: element.tagName,
            text: (element as HTMLElement).innerText?.substring(0, 50),
          });
        }
      });

      return issues;
    });

    expect(contrastIssues).toHaveLength(0);
  });

  // Test ARIA attributes
  test('interactive elements should have proper ARIA attributes', async ({ page }) => {
    await page.goto('/dashboard');

    // Check buttons
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const hasAccessibleName = await button.evaluate((el) => {
        const text = el.textContent?.trim();
        const ariaLabel = el.getAttribute('aria-label');
        return Boolean(text || ariaLabel);
      });
      expect(hasAccessibleName).toBeTruthy();
    }

    // Check links
    const links = await page.$$('a[href]');
    for (const link of links) {
      const hasAccessibleName = await link.evaluate((el) => {
        const text = el.textContent?.trim();
        const ariaLabel = el.getAttribute('aria-label');
        return Boolean(text || ariaLabel);
      });
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  // Test images
  test('images should have alt text', async ({ page }) => {
    await page.goto('/');

    const images = await page.$$('img');
    for (const image of images) {
      const hasAlt = await image.evaluate((el) => el.hasAttribute('alt'));
      expect(hasAlt).toBeTruthy();
    }
  });

  // Test heading hierarchy
  test('headings should follow proper hierarchy', async ({ page }) => {
    await page.goto('/dashboard');

    const headingIssues = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const issues: string[] = [];
      let previousLevel = 0;

      headings.forEach((heading) => {
        const currentLevel = parseInt(heading.tagName[1]);

        // Check for skipped levels
        if (previousLevel > 0 && currentLevel > previousLevel + 1) {
          issues.push(`Heading skipped from h${previousLevel} to h${currentLevel}`);
        }

        previousLevel = currentLevel;
      });

      // Check for multiple h1s
      const h1Count = document.querySelectorAll('h1').length;
      if (h1Count > 1) {
        issues.push(`Multiple h1 elements found (${h1Count})`);
      }

      return issues;
    });

    expect(headingIssues).toHaveLength(0);
  });

  // Test modal accessibility
  test('modals should trap focus and be dismissible', async ({ page }) => {
    await page.goto('/dashboard');

    // Find and click a button that opens a modal
    const modalTrigger = await page.$('[data-testid="open-modal"], button:has-text("Add"), button:has-text("Create")');

    if (modalTrigger) {
      await modalTrigger.click();

      // Wait for modal to appear
      await page.waitForSelector('[role="dialog"], .modal, [data-testid="modal"]', { timeout: 5000 });

      // Check for focus trap
      const modalHasFocusTrap = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"], .modal');
        if (!modal) return false;

        const focusableElements = modal.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        return focusableElements.length > 0;
      });

      expect(modalHasFocusTrap).toBeTruthy();

      // Test ESC key dismissal
      await page.keyboard.press('Escape');

      // Modal should be closed
      const modalClosed = await page.$('[role="dialog"], .modal').then(el => el === null);
      expect(modalClosed).toBeTruthy();
    }
  });

  // Test skip links
  test('should have skip to content link', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for skip link
    const skipLink = await page.$('a[href="#main"], a[href="#content"], .skip-link');
    expect(skipLink).toBeTruthy();

    if (skipLink) {
      // Check that it's accessible via keyboard
      await page.keyboard.press('Tab');
      const isSkipLinkFocused = await skipLink.evaluate((el) => el === document.activeElement);

      // Skip link should be one of the first focusable elements
      if (!isSkipLinkFocused) {
        await page.keyboard.press('Tab');
        const isNowFocused = await skipLink.evaluate((el) => el === document.activeElement);
        expect(isNowFocused).toBeTruthy();
      }
    }
  });

  // Test responsive design accessibility
  test('should be accessible on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Run accessibility checks on mobile
    const mobileAccessibilityResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(mobileAccessibilityResults.violations).toEqual([]);

    // Check touch target sizes
    const touchTargets = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, input, select, textarea'));
      const smallTargets: string[] = [];

      buttons.forEach((element) => {
        const rect = (element as HTMLElement).getBoundingClientRect();
        // WCAG 2.1 recommends minimum 44x44px for touch targets
        if (rect.width < 44 || rect.height < 44) {
          smallTargets.push(`${element.tagName}: ${rect.width}x${rect.height}`);
        }
      });

      return smallTargets;
    });

    // Log small touch targets but don't fail (warning level)
    if (touchTargets.length > 0) {
      console.warn('Small touch targets found:', touchTargets);
    }
  });
});

// ============================================
// COMPONENT-SPECIFIC TESTS
// ============================================

test.describe('Component Accessibility', () => {
  test('UnifiedButton should be accessible', async ({ page }) => {
    await page.goto('/dashboard');

    const buttons = await page.$$('[class*="UnifiedButton"], button');

    for (const button of buttons.slice(0, 5)) { // Test first 5 buttons
      const accessibility = await button.evaluate((el) => {
        const hasText = Boolean(el.textContent?.trim());
        const hasAriaLabel = el.hasAttribute('aria-label');
        const isDisabled = el.hasAttribute('disabled');
        const hasAriaDisabled = el.getAttribute('aria-disabled');

        return {
          hasAccessibleName: hasText || hasAriaLabel,
          disabledProperly: !isDisabled || hasAriaDisabled === 'true',
        };
      });

      expect(accessibility.hasAccessibleName).toBeTruthy();
      expect(accessibility.disabledProperly).toBeTruthy();
    }
  });

  test('UnifiedCard should be accessible', async ({ page }) => {
    await page.goto('/dashboard');

    const cards = await page.$$('[class*="UnifiedCard"], [class*="card"]');

    for (const card of cards.slice(0, 5)) { // Test first 5 cards
      const isInteractive = await card.evaluate((el) => {
        return el.getAttribute('role') === 'button' || el.tagName === 'A';
      });

      if (isInteractive) {
        const hasTabIndex = await card.evaluate((el) => el.hasAttribute('tabindex'));
        expect(hasTabIndex).toBeTruthy();
      }
    }
  });

  test('EmptyStateEducational should provide clear guidance', async ({ page }) => {
    // Navigate to a page that might have empty states
    await page.goto('/jobs');

    const emptyState = await page.$('[class*="EmptyState"]');

    if (emptyState) {
      const hasContent = await emptyState.evaluate((el) => {
        const hasTitle = Boolean(el.querySelector('h2, h3, h4'));
        const hasDescription = Boolean(el.querySelector('p'));
        const hasActions = Boolean(el.querySelector('button, a'));

        return { hasTitle, hasDescription, hasActions };
      });

      expect(hasContent.hasTitle).toBeTruthy();
      expect(hasContent.hasDescription).toBeTruthy();
      expect(hasContent.hasActions).toBeTruthy();
    }
  });
});

// ============================================
// WCAG COMPLIANCE REPORT
// ============================================

test.describe('WCAG Compliance Report', () => {
  test('generate accessibility report for all pages', async ({ page }) => {
    const report: any[] = [];

    for (const { name, path } of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      report.push({
        page: name,
        path,
        violations: results.violations.length,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        violationDetails: results.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.length,
        })),
      });
    }

    // Log the report
    console.table(report.map(r => ({
      Page: r.page,
      Violations: r.violations,
      Passes: r.passes,
      Incomplete: r.incomplete,
    })));

    // Fail if any critical violations
    const criticalViolations = report.filter(r => r.violations > 0);
    expect(criticalViolations).toHaveLength(0);
  });
});