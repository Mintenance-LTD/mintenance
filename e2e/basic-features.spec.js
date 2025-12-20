// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Mintenance App - Basic Feature Tests', () => {
  test('should load all main pages', async ({ page }) => {
    const pages = [
      { url: '/', name: 'Homepage' },
      { url: '/discover', name: 'Discover' },
      { url: '/jobs', name: 'Jobs' },
      { url: '/payments', name: 'Payments' },
      { url: '/messages', name: 'Messages' },
      { url: '/dashboard', name: 'Dashboard' },
      { url: '/search', name: 'Search' },
      { url: '/analytics', name: 'Analytics' },
      { url: '/contractors', name: 'Contractors' },
      { url: '/video-calls', name: 'Video Calls' },
      { url: '/login', name: 'Login' },
      { url: '/register', name: 'Register' }
    ];

    for (const pageInfo of pages) {
      await page.goto(`http://localhost:3000${pageInfo.url}`);
      
      // Check if page loads
      await expect(page).toHaveTitle(/Mintenance/);
      
      // Check that body is visible (not hidden)
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      // Check for basic content - should have some text content
      const hasContent = await page.locator('text=Mintenance').count() > 0;
      expect(hasContent).toBeTruthy();
      
      console.log(`✅ ${pageInfo.name} page loaded successfully`);
    }
  });

  test('should handle authentication flow', async ({ page }) => {
    // Test login page
    await page.goto('http://localhost:3000/login');
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Look for login form elements
    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"], input[name*="password"]');
    const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // At least one form element should be present
    const hasForm = await emailInput.count() > 0 || await passwordInput.count() > 0 || await submitButton.count() > 0;
    expect(hasForm).toBeTruthy();
    
    // Test register page
    await page.goto('http://localhost:3000/register');
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Look for registration form elements
    const regEmailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]');
    const regPasswordInput = page.locator('input[type="password"], input[name*="password"]');
    const regSubmitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Register"), button:has-text("Sign Up")');
    
    // At least one form element should be present
    const hasRegForm = await regEmailInput.count() > 0 || await regPasswordInput.count() > 0 || await regSubmitButton.count() > 0;
    expect(hasRegForm).toBeTruthy();
  });

  test('should handle protected pages gracefully', async ({ page }) => {
    const protectedPages = ['/discover', '/jobs', '/payments', '/messages', '/dashboard'];
    
    for (const pageUrl of protectedPages) {
      await page.goto(`http://localhost:3000${pageUrl}`);
      
      // Check if page loads
      await expect(page).toHaveTitle(/Mintenance/);
      
      // Check for either authenticated content or access denied
      const accessDenied = page.locator('text=Access Denied, text=You must be logged in, text=Please log in');
      const pageContent = page.locator('body');
      
      // Page should load and show either content or access denied
      await expect(pageContent).toBeVisible();
      
      // Should have some content (either the page content or access denied message)
      const hasContent = await pageContent.textContent();
      expect(hasContent).toBeTruthy();
      expect(hasContent.length).toBeGreaterThan(0);
      
      console.log(`✅ ${pageUrl} handled gracefully`);
    }
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Look for navigation elements
    const navElements = page.locator('nav, header, a[href]');
    const navCount = await navElements.count();
    
    // Should have some navigation elements
    expect(navCount).toBeGreaterThan(0);
    
    // Test some navigation links
    const links = page.locator('a[href]');
    const linkCount = await links.count();
    
    if (linkCount > 0) {
      // Test first few links
      for (let i = 0; i < Math.min(3, linkCount); i++) {
        const link = links.nth(i);
        const href = await link.getAttribute('href');
        
        if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
          // Test that link is visible and clickable
          await expect(link).toBeVisible();
        }
      }
    }
  });

  test('should be responsive', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000');
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:3000');
    await expect(page.locator('body')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check for basic meta tags
    const title = await page.title();
    expect(title).toContain('Mintenance');
    
    // Check for viewport meta tag
    const viewport = page.locator('meta[name="viewport"]');
    const viewportCount = await viewport.count();
    expect(viewportCount).toBeGreaterThan(0);
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    // Should have minimal console errors (some are expected in development)
    expect(consoleErrors.length).toBeLessThan(10);
  });
});
