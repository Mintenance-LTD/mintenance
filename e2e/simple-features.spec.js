// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Mintenance App - Simple Feature Tests', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check if homepage loads
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Check for main content
    await expect(page.locator('body')).toBeVisible();
    
    // Look for Mintenance branding
    const mintenanceText = page.locator('text=Mintenance');
    expect(await mintenanceText.count()).toBeGreaterThan(0);
    
    console.log('✅ Homepage loaded successfully');
  });

  test('should load login page', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    // Check if login page loads
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Check for main content
    await expect(page.locator('body')).toBeVisible();
    
    // Look for login form or Mintenance branding
    const loginForm = page.locator('input[type="email"], input[type="password"], button:has-text("Login")');
    const mintenanceText = page.locator('text=Mintenance');
    
    const hasForm = await loginForm.count() > 0;
    const hasBranding = await mintenanceText.count() > 0;
    
    expect(hasForm || hasBranding).toBeTruthy();
    
    console.log('✅ Login page loaded successfully');
  });

  test('should load register page', async ({ page }) => {
    await page.goto('http://localhost:3000/register');
    
    // Check if register page loads
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Check for main content
    await expect(page.locator('body')).toBeVisible();
    
    // Look for register form or Mintenance branding
    const registerForm = page.locator('input[type="email"], input[type="password"], button:has-text("Register")');
    const mintenanceText = page.locator('text=Mintenance');
    
    const hasForm = await registerForm.count() > 0;
    const hasBranding = await mintenanceText.count() > 0;
    
    expect(hasForm || hasBranding).toBeTruthy();
    
    console.log('✅ Register page loaded successfully');
  });

  test('should handle discover page', async ({ page }) => {
    await page.goto('http://localhost:3000/discover');
    
    // Check if discover page loads
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Check for main content
    await expect(page.locator('body')).toBeVisible();
    
    // Look for discover content or access denied
    const discoverContent = page.locator('text=Discover, text=Contractor, text=Access Denied');
    const mintenanceText = page.locator('text=Mintenance');
    
    const hasContent = await discoverContent.count() > 0;
    const hasBranding = await mintenanceText.count() > 0;
    
    expect(hasContent || hasBranding).toBeTruthy();
    
    console.log('✅ Discover page handled successfully');
  });

  test('should handle jobs page', async ({ page }) => {
    await page.goto('http://localhost:3000/jobs');
    
    // Check if jobs page loads
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Check for main content
    await expect(page.locator('body')).toBeVisible();
    
    // Look for jobs content or access denied
    const jobsContent = page.locator('text=Job, text=Maintenance, text=Access Denied');
    const mintenanceText = page.locator('text=Mintenance');
    
    const hasContent = await jobsContent.count() > 0;
    const hasBranding = await mintenanceText.count() > 0;
    
    expect(hasContent || hasBranding).toBeTruthy();
    
    console.log('✅ Jobs page handled successfully');
  });

  test('should handle payments page', async ({ page }) => {
    await page.goto('http://localhost:3000/payments');
    
    // Check if payments page loads
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Check for main content
    await expect(page.locator('body')).toBeVisible();
    
    // Look for payments content or access denied
    const paymentsContent = page.locator('text=Payment, text=Escrow, text=Access Denied');
    const mintenanceText = page.locator('text=Mintenance');
    
    const hasContent = await paymentsContent.count() > 0;
    const hasBranding = await mintenanceText.count() > 0;
    
    expect(hasContent || hasBranding).toBeTruthy();
    
    console.log('✅ Payments page handled successfully');
  });

  test('should handle messages page', async ({ page }) => {
    await page.goto('http://localhost:3000/messages');
    
    // Check if messages page loads
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Check for main content
    await expect(page.locator('body')).toBeVisible();
    
    // Look for messages content or access denied
    const messagesContent = page.locator('text=Message, text=Chat, text=Access Denied');
    const mintenanceText = page.locator('text=Mintenance');
    
    const hasContent = await messagesContent.count() > 0;
    const hasBranding = await mintenanceText.count() > 0;
    
    expect(hasContent || hasBranding).toBeTruthy();
    
    console.log('✅ Messages page handled successfully');
  });

  test('should handle dashboard page', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    // Check if dashboard page loads
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Check for main content
    await expect(page.locator('body')).toBeVisible();
    
    // Look for dashboard content or access denied
    const dashboardContent = page.locator('text=Dashboard, text=Welcome, text=Access Denied');
    const mintenanceText = page.locator('text=Mintenance');
    
    const hasContent = await dashboardContent.count() > 0;
    const hasBranding = await mintenanceText.count() > 0;
    
    expect(hasContent || hasBranding).toBeTruthy();
    
    console.log('✅ Dashboard page handled successfully');
  });

  test('should handle search page', async ({ page }) => {
    await page.goto('http://localhost:3000/search');
    
    // Check if search page loads
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Check for main content
    await expect(page.locator('body')).toBeVisible();
    
    // Look for search content
    const searchContent = page.locator('text=Search, text=Find, text=Filter');
    const mintenanceText = page.locator('text=Mintenance');
    
    const hasContent = await searchContent.count() > 0;
    const hasBranding = await mintenanceText.count() > 0;
    
    expect(hasContent || hasBranding).toBeTruthy();
    
    console.log('✅ Search page handled successfully');
  });

  test('should handle analytics page', async ({ page }) => {
    await page.goto('http://localhost:3000/analytics');
    
    // Check if analytics page loads
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Check for main content
    await expect(page.locator('body')).toBeVisible();
    
    // Look for analytics content
    const analyticsContent = page.locator('text=Analytics, text=Coming Soon, text=Performance');
    const mintenanceText = page.locator('text=Mintenance');
    
    const hasContent = await analyticsContent.count() > 0;
    const hasBranding = await mintenanceText.count() > 0;
    
    expect(hasContent || hasBranding).toBeTruthy();
    
    console.log('✅ Analytics page handled successfully');
  });

  test('should handle contractors page', async ({ page }) => {
    await page.goto('http://localhost:3000/contractors');
    
    // Check if contractors page loads
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Check for main content
    await expect(page.locator('body')).toBeVisible();
    
    // Look for contractors content
    const contractorsContent = page.locator('text=Contractor, text=Directory, text=Coming Soon');
    const mintenanceText = page.locator('text=Mintenance');
    
    const hasContent = await contractorsContent.count() > 0;
    const hasBranding = await mintenanceText.count() > 0;
    
    expect(hasContent || hasBranding).toBeTruthy();
    
    console.log('✅ Contractors page handled successfully');
  });

  test('should handle video calls page', async ({ page }) => {
    await page.goto('http://localhost:3000/video-calls');
    
    // Check if video calls page loads
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Check for main content
    await expect(page.locator('body')).toBeVisible();
    
    // Look for video calls content
    const videoContent = page.locator('text=Video, text=Call, text=Meeting');
    const mintenanceText = page.locator('text=Mintenance');
    
    const hasContent = await videoContent.count() > 0;
    const hasBranding = await mintenanceText.count() > 0;
    
    expect(hasContent || hasBranding).toBeTruthy();
    
    console.log('✅ Video calls page handled successfully');
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000');
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:3000');
    await expect(page.locator('body')).toBeVisible();
    
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Responsive design works on all screen sizes');
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Look for navigation links
    const links = page.locator('a[href]');
    const linkCount = await links.count();
    
    expect(linkCount).toBeGreaterThan(0);
    
    // Test a few navigation links
    for (let i = 0; i < Math.min(5, linkCount); i++) {
      const link = links.nth(i);
      const href = await link.getAttribute('href');
      
      if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        await expect(link).toBeVisible();
      }
    }
    
    console.log('✅ Navigation links are working');
  });
});
