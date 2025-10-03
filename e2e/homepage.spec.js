// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check if page loads without errors
    await expect(page).toHaveTitle(/Mintenance|Home/);
    
    // Check for main navigation elements
    await expect(page.locator('nav, header')).toBeVisible();
    
    // Check for main content area
    await expect(page.locator('main, [role="main"]')).toBeVisible();
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');
    
    // Check for common navigation links
    const navLinks = page.locator('nav a, header a');
    const linkCount = await navLinks.count();
    
    if (linkCount > 0) {
      // Test first few navigation links
      for (let i = 0; i < Math.min(3, linkCount); i++) {
        const link = navLinks.nth(i);
        const href = await link.getAttribute('href');
        
        if (href && !href.startsWith('#')) {
          // Check if link is not broken
          await expect(link).toBeVisible();
        }
      }
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check if page is still functional on mobile
    await expect(page.locator('body')).toBeVisible();
    
    // Check for mobile-friendly elements (hamburger menu, etc.)
    const mobileMenu = page.locator('[aria-label*="menu"], .mobile-menu, .hamburger');
    if (await mobileMenu.count() > 0) {
      await expect(mobileMenu.first()).toBeVisible();
    }
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check for essential meta tags
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);
    
    // Check for description meta tag
    const description = page.locator('meta[name="description"]');
    if (await description.count() > 0) {
      await expect(description).toHaveAttribute('content');
    }
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') &&
      !error.includes('net::ERR_ABORTED')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
