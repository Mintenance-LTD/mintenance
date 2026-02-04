import { test, expect, Page } from '@playwright/test';
test.describe('Job Posting Flow', () => {
  let page: Page;
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // Login as homeowner
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test.homeowner@example.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });
  test.afterEach(async () => {
    await page.close();
  });
  test('should complete full job posting flow', async () => {
    // 1. Navigate to job creation
    await page.goto('/jobs/create');
    await expect(page).toHaveTitle(/Create Job/);
    // 2. Fill in job details
    await page.fill('input[name="title"]', 'Fix leaky kitchen faucet');
    await page.selectOption('select[name="category"]', 'Plumbing');
    await page.fill('textarea[name="description"]', 'The kitchen faucet is dripping constantly. Need it fixed ASAP.');
    // 3. Set urgency
    await page.click('input[value="high"]');
    // 4. Set budget
    await page.fill('input[name="budget.min"]', '50');
    await page.fill('input[name="budget.max"]', '150');
    // 5. Set timeline
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[name="timeline.startDate"]', tomorrow.toISOString().split('T')[0]);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    await page.fill('input[name="timeline.endDate"]', nextWeek.toISOString().split('T')[0]);
    // 6. Set location
    await page.fill('input[name="location.address"]', '123 Main St');
    await page.fill('input[name="location.city"]', 'New York');
    await page.fill('input[name="location.postcode"]', '10001');
    // 7. Upload images (simulate)
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'faucet.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    });
    // 8. Add requirements
    await page.fill('input[placeholder*="requirement"]', 'Must have insurance');
    await page.click('button:has-text("Add")');
    // 9. Submit the job
    await page.click('button:has-text("Post Job")');
    // 10. Verify job was created
    await page.waitForURL(/\/jobs\/[^/]+$/);
    await expect(page.locator('h1')).toContainText('Fix leaky kitchen faucet');
    await expect(page.locator('text=Plumbing')).toBeVisible();
    await expect(page.locator('text=$50 - $150')).toBeVisible();
  });
  test('should handle validation errors', async () => {
    await page.goto('/jobs/create');
    // Try to submit without filling required fields
    await page.click('button:has-text("Post Job")');
    // Check validation messages
    await expect(page.locator('text=Title is required')).toBeVisible();
    await expect(page.locator('text=Please select a category')).toBeVisible();
    await expect(page.locator('text=Description is required')).toBeVisible();
    // Fill partial data and verify inline validation
    await page.fill('input[name="title"]', 'Short'); // Too short
    await page.click('button:has-text("Post Job")');
    await expect(page.locator('text=Title must be at least 10 characters')).toBeVisible();
  });
  test('should save draft and resume', async () => {
    await page.goto('/jobs/create');
    // Fill partial job details
    await page.fill('input[name="title"]', 'Incomplete job posting');
    await page.selectOption('select[name="category"]', 'Electrical');
    // Save as draft
    await page.click('button:has-text("Save Draft")');
    await expect(page.locator('text=Draft saved')).toBeVisible();
    // Navigate away and come back
    await page.goto('/dashboard');
    await page.goto('/jobs/drafts');
    // Find and resume draft
    await page.click('text=Incomplete job posting');
    await expect(page.locator('input[name="title"]')).toHaveValue('Incomplete job posting');
    await expect(page.locator('select[name="category"]')).toHaveValue('Electrical');
  });
  test('should allow editing posted job', async () => {
    // Create a job first
    await page.goto('/jobs/create');
    await page.fill('input[name="title"]', 'Job to be edited');
    await page.selectOption('select[name="category"]', 'Carpentry');
    await page.fill('textarea[name="description"]', 'Original description');
    await page.fill('input[name="location.postcode"]', '10001');
    await page.click('button:has-text("Post Job")');
    // Wait for job detail page
    await page.waitForURL(/\/jobs\/[^/]+$/);
    const jobUrl = page.url();
    // Click edit button
    await page.click('button:has-text("Edit Job")');
    // Modify job details
    await page.fill('input[name="title"]', 'Updated job title');
    await page.fill('textarea[name="description"]', 'Updated description with more details');
    await page.click('button:has-text("Save Changes")');
    // Verify changes
    await page.goto(jobUrl);
    await expect(page.locator('h1')).toContainText('Updated job title');
    await expect(page.locator('text=Updated description')).toBeVisible();
  });
  test('should handle contractor bidding flow', async () => {
    // First create a job as homeowner
    await page.goto('/jobs/create');
    await page.fill('input[name="title"]', 'Job for bidding test');
    await page.selectOption('select[name="category"]', 'Plumbing');
    await page.fill('textarea[name="description"]', 'Test job for bidding');
    await page.fill('input[name="location.postcode"]', '10001');
    await page.click('button:has-text("Post Job")');
    const jobUrl = page.url();
    // Logout and login as contractor
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test.contractor@example.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    // Navigate to the job
    await page.goto(jobUrl);
    // Submit a bid
    await page.click('button:has-text("Place Bid")');
    await page.fill('input[name="bidAmount"]', '100');
    await page.fill('textarea[name="proposal"]', 'I can fix this issue quickly and professionally.');
    await page.fill('input[name="estimatedDuration"]', '2');
    await page.click('button:has-text("Submit Bid")');
    // Verify bid was submitted
    await expect(page.locator('text=Bid submitted successfully')).toBeVisible();
    await expect(page.locator('text=$100')).toBeVisible();
  });
});
test.describe('Mobile Responsive Job Posting', () => {
  test('should work on mobile viewport', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone 8 size
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X)',
    });
    const page = await context.newPage();
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test.homeowner@example.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    // Navigate to job creation
    await page.goto('/jobs/create');
    // Verify mobile menu works
    await page.click('button[aria-label="Menu"]');
    await expect(page.locator('nav[aria-label="Mobile navigation"]')).toBeVisible();
    // Fill form on mobile
    await page.fill('input[name="title"]', 'Mobile job posting test');
    await page.selectOption('select[name="category"]', 'Painting');
    // Verify responsive layout
    const formContainer = page.locator('form');
    const boundingBox = await formContainer.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(375);
    await context.close();
  });
});
test.describe('Job Posting Performance', () => {
  test('should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/jobs/create');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    // Check Core Web Vitals
    const metrics = await page.evaluate(() => {
      return {
        FCP: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        LCP: performance.getEntriesByType('largest-contentful-paint').pop()?.startTime,
      };
    });
    expect(metrics.FCP).toBeLessThan(1800); // FCP < 1.8s
    expect(metrics.LCP).toBeLessThan(2500); // LCP < 2.5s
  });
});