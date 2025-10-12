import { test, expect } from '@playwright/test';

test.describe('Navigation Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate from landing page to login', async ({ page }) => {
    // Test desktop navigation
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Click login link
    await page.click('text=Log In');
    await expect(page).toHaveURL('/login');
    
    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Log In');
  });

  test('should navigate from landing page to register', async ({ page }) => {
    // Test desktop navigation
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Click get started button
    await page.click('text=Get Started');
    await expect(page).toHaveURL('/register');
    
    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Register');
  });

  test('should navigate using mobile navigation menu', async ({ page }) => {
    // Test mobile navigation
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Open mobile menu
    await page.click('[aria-label="Toggle navigation menu"]');
    
    // Wait for menu to open
    await expect(page.locator('.mobile-navigation')).toBeVisible();
    
    // Click on a menu item
    await page.click('text=How It Works');
    
    // Verify smooth scroll to section
    await expect(page.locator('#how-it-works')).toBeInViewport();
  });

  test('should navigate to dashboard after login', async ({ page }) => {
    // Mock successful login
    await page.route('/api/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { id: '1', email: 'test@example.com' },
          token: 'mock-token'
        })
      });
    });

    // Navigate to login page
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Verify dashboard loaded
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should navigate between dashboard sections', async ({ page }) => {
    // Mock authenticated user
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-token');
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Test navigation to jobs
    await page.click('text=Jobs');
    await expect(page).toHaveURL('/jobs');
    
    // Test navigation to contractors
    await page.click('text=Contractors');
    await expect(page).toHaveURL('/contractors');
    
    // Test navigation to messages
    await page.click('text=Messages');
    await expect(page).toHaveURL('/messages');
    
    // Test navigation to payments
    await page.click('text=Payments');
    await expect(page).toHaveURL('/payments');
    
    // Test navigation to analytics
    await page.click('text=Analytics');
    await expect(page).toHaveURL('/analytics');
  });

  test('should handle breadcrumb navigation', async ({ page }) => {
    // Mock authenticated user
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-token');
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Verify breadcrumbs are present
    await expect(page.locator('[aria-label="Breadcrumb"]')).toBeVisible();
    
    // Click home breadcrumb
    await page.click('text=Home');
    await expect(page).toHaveURL('/');
  });

  test('should handle back button navigation', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Navigate to register page
    await page.goto('/register');
    
    // Use browser back button
    await page.goBack();
    await expect(page).toHaveURL('/login');
    
    // Use browser forward button
    await page.goForward();
    await expect(page).toHaveURL('/register');
  });

  test('should handle deep linking', async ({ page }) => {
    // Test direct navigation to dashboard
    await page.goto('/dashboard');
    
    // Should redirect to login if not authenticated
    await expect(page).toHaveURL('/login');
    
    // Test direct navigation to jobs
    await page.goto('/jobs');
    await expect(page).toHaveURL('/login');
  });

  test('should handle 404 navigation', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto('/non-existent-page');
    
    // Should show 404 page
    await expect(page.locator('h1')).toContainText('404');
    await expect(page.locator('text=Page Not Found')).toBeVisible();
  });

  test('should handle navigation with query parameters', async ({ page }) => {
    // Navigate with query parameters
    await page.goto('/login?redirect=/dashboard');
    
    // Verify page loaded with parameters
    await expect(page).toHaveURL('/login?redirect=/dashboard');
    
    // Verify redirect parameter is preserved
    const redirectInput = page.locator('input[name="redirect"]');
    await expect(redirectInput).toHaveValue('/dashboard');
  });

  test('should handle navigation with hash fragments', async ({ page }) => {
    // Navigate with hash fragment
    await page.goto('/#how-it-works');
    
    // Verify page loaded
    await expect(page).toHaveURL('/#how-it-works');
    
    // Verify section is in viewport
    await expect(page.locator('#how-it-works')).toBeInViewport();
  });

  test('should handle navigation state persistence', async ({ page }) => {
    // Mock authenticated user
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-token');
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Navigate to jobs
    await page.click('text=Jobs');
    await expect(page).toHaveURL('/jobs');
    
    // Refresh page
    await page.reload();
    
    // Should stay on jobs page
    await expect(page).toHaveURL('/jobs');
  });

  test('should handle navigation with loading states', async ({ page }) => {
    // Mock slow API response
    await page.route('/api/dashboard', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: 'mock-data' })
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Should show loading state
    await expect(page.locator('.skeleton-loader')).toBeVisible();
    
    // Wait for content to load
    await expect(page.locator('.skeleton-loader')).not.toBeVisible();
  });

  test('should handle navigation errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/dashboard', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Should show error state
    await expect(page.locator('text=Something went wrong')).toBeVisible();
    
    // Should have retry option
    await expect(page.locator('text=Reload Page')).toBeVisible();
  });

  test('should handle navigation with keyboard', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should focus on login link
    await expect(page.locator('text=Log In')).toBeFocused();
    
    // Press Enter to navigate
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/login');
  });

  test('should handle navigation with screen reader', async ({ page }) => {
    // Test screen reader navigation
    await page.goto('/');
    
    // Verify skip links are present
    await expect(page.locator('text=Skip to main content')).toBeVisible();
    
    // Verify ARIA labels
    await expect(page.locator('[aria-label="Main navigation"]')).toBeVisible();
    
    // Verify role attributes
    await expect(page.locator('[role="navigation"]')).toBeVisible();
  });
});

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
  });

  test('should open and close mobile menu', async ({ page }) => {
    // Open menu
    await page.click('[aria-label="Toggle navigation menu"]');
    await expect(page.locator('.mobile-navigation')).toBeVisible();
    
    // Close menu by clicking overlay
    await page.click('[style*="rgba(0, 0, 0, 0.5)"]');
    await expect(page.locator('.mobile-navigation')).not.toBeVisible();
  });

  test('should navigate using mobile menu items', async ({ page }) => {
    // Open menu
    await page.click('[aria-label="Toggle navigation menu"]');
    
    // Click menu item
    await page.click('text=Services');
    
    // Menu should close and navigate
    await expect(page.locator('.mobile-navigation')).not.toBeVisible();
    await expect(page.locator('#services')).toBeInViewport();
  });

  test('should handle mobile menu with touch gestures', async ({ page }) => {
    // Test touch interaction
    await page.touchscreen.tap(350, 50); // Tap menu button
    await expect(page.locator('.mobile-navigation')).toBeVisible();
    
    // Test swipe to close (if implemented)
    await page.touchscreen.tap(200, 400); // Tap overlay
    await expect(page.locator('.mobile-navigation')).not.toBeVisible();
  });
});

test.describe('Performance Navigation', () => {
  test('should measure navigation performance', async ({ page }) => {
    // Start performance monitoring
    await page.addInitScript(() => {
      window.performance.mark('navigation-start');
    });

    // Navigate to login
    await page.goto('/login');
    
    // Measure navigation time
    const navigationTime = await page.evaluate(() => {
      window.performance.mark('navigation-end');
      window.performance.measure('navigation', 'navigation-start', 'navigation-end');
      const measure = window.performance.getEntriesByName('navigation')[0];
      return measure.duration;
    });

    // Navigation should be fast
    expect(navigationTime).toBeLessThan(1000);
  });

  test('should measure page load performance', async ({ page }) => {
    // Navigate and measure
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // Page should load quickly
    expect(loadTime).toBeLessThan(3000);
  });
});
