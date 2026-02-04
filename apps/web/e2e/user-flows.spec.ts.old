import { test, expect } from '@playwright/test';

test.describe('Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test.describe('User Registration and Login Flow', () => {
    test('should complete full registration process', async ({ page }) => {
      // Navigate to registration
      await page.click('text=Get Started');
      await page.waitForURL('/register');

      // Fill registration form
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
      await page.fill('input[name="fullName"]', 'Test User');

      // Select role
      await page.click('input[value="homeowner"]');

      // Accept terms
      await page.check('input[name="acceptTerms"]');

      // Submit form
      await page.click('button[type="submit"]');

      // Verify redirect to dashboard
      await page.waitForURL('/dashboard');
      expect(await page.textContent('h1')).toContain('Welcome, Test User');
    });

    test('should login with existing account', async ({ page }) => {
      // Navigate to login
      await page.click('text=Sign In');
      await page.waitForURL('/login');

      // Fill login form
      await page.fill('input[name="email"]', 'existing@example.com');
      await page.fill('input[name="password"]', 'Password123!');

      // Submit
      await page.click('button[type="submit"]');

      // Verify redirect to dashboard
      await page.waitForURL('/dashboard');
      expect(await page.isVisible('text=Dashboard')).toBeTruthy();
    });

    test('should handle login errors gracefully', async ({ page }) => {
      await page.goto('/login');

      // Submit with invalid credentials
      await page.fill('input[name="email"]', 'wrong@example.com');
      await page.fill('input[name="password"]', 'WrongPass');
      await page.click('button[type="submit"]');

      // Check for error message
      await expect(page.locator('.error-message')).toContainText('Invalid credentials');
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Job Posting Flow (Homeowner)', () => {
    test.beforeEach(async ({ page }) => {
      // Login as homeowner
      await page.goto('/login');
      await page.fill('input[name="email"]', 'homeowner@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
    });

    test('should create a new job posting', async ({ page }) => {
      // Navigate to create job
      await page.click('text=Post a Job');
      await page.waitForURL('/jobs/create');

      // Fill job details
      await page.fill('input[name="title"]', 'Fix leaking roof');
      await page.fill('textarea[name="description"]', 'Need urgent repair for leaking roof in the kitchen area');
      await page.selectOption('select[name="category"]', 'roofing');
      await page.fill('input[name="budget"]', '5000');
      await page.selectOption('select[name="urgency"]', 'urgent');

      // Add location
      await page.fill('input[name="location"]', 'London, UK');

      // Upload images (if file input exists)
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles('test-fixtures/roof-damage.jpg');
      }

      // Submit job
      await page.click('button:has-text("Post Job")');

      // Verify success
      await page.waitForURL(/\/jobs\/[a-zA-Z0-9]+/);
      expect(await page.textContent('h1')).toContain('Fix leaking roof');
      expect(await page.isVisible('text=Job posted successfully')).toBeTruthy();
    });

    test('should edit existing job', async ({ page }) => {
      // Navigate to jobs list
      await page.goto('/dashboard/jobs');

      // Click on first job to edit
      await page.click('.job-card:first-child >> text=Edit');

      // Update job details
      await page.fill('input[name="title"]', 'Updated: Fix leaking roof URGENT');
      await page.fill('input[name="budget"]', '6000');

      // Save changes
      await page.click('button:has-text("Save Changes")');

      // Verify update
      await expect(page.locator('.success-message')).toContainText('Job updated successfully');
      expect(await page.textContent('h1')).toContain('Updated: Fix leaking roof URGENT');
    });
  });

  test.describe('Contractor Bidding Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Login as contractor
      await page.goto('/login');
      await page.fill('input[name="email"]', 'contractor@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('/contractor/dashboard');
    });

    test('should submit a bid on a job', async ({ page }) => {
      // Navigate to job listings
      await page.goto('/jobs');

      // Click on first available job
      await page.click('.job-card:first-child');

      // Submit bid
      await page.click('text=Place Bid');
      await page.fill('input[name="amount"]', '4500');
      await page.fill('textarea[name="proposal"]', 'I can fix your roof within 2 days with high-quality materials');
      await page.fill('input[name="estimatedDuration"]', '2');

      // Submit bid
      await page.click('button:has-text("Submit Bid")');

      // Verify success
      await expect(page.locator('.success-message')).toContainText('Bid submitted successfully');
      expect(await page.isVisible('text=Your bid: £4,500')).toBeTruthy();
    });

    test('should view and manage bids', async ({ page }) => {
      await page.goto('/contractor/bids');

      // Check bid list is visible
      await expect(page.locator('.bid-list')).toBeVisible();

      // Click on a bid to view details
      await page.click('.bid-item:first-child');

      // Verify bid details page
      expect(await page.isVisible('text=Bid Details')).toBeTruthy();
      expect(await page.isVisible('text=Job Information')).toBeTruthy();
    });
  });

  test.describe('Payment and Escrow Flow', () => {
    test('should process payment and escrow', async ({ page }) => {
      // Login as homeowner
      await page.goto('/login');
      await page.fill('input[name="email"]', 'homeowner@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');

      // Navigate to accepted bid
      await page.goto('/dashboard/jobs');
      await page.click('.job-card:has-text("In Progress") >> text=View');

      // Click on pay button
      await page.click('text=Fund Escrow');

      // Fill payment details
      await page.fill('input[name="cardNumber"]', '4242424242424242');
      await page.fill('input[name="cardExpiry"]', '12/25');
      await page.fill('input[name="cardCvc"]', '123');
      await page.fill('input[name="cardName"]', 'Test User');

      // Confirm payment
      await page.click('button:has-text("Pay £5,000")');

      // Wait for payment processing
      await page.waitForSelector('.success-message', { timeout: 10000 });

      // Verify escrow created
      expect(await page.isVisible('text=Payment successful')).toBeTruthy();
      expect(await page.isVisible('text=Funds held in escrow')).toBeTruthy();
    });

    test('should release escrow after job completion', async ({ page }) => {
      // Login as homeowner
      await page.goto('/login');
      await page.fill('input[name="email"]', 'homeowner@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');

      // Navigate to completed job
      await page.goto('/dashboard/jobs');
      await page.click('.job-card:has-text("Awaiting Approval") >> text=View');

      // Review work
      await page.click('text=Review Work');

      // Rate contractor
      await page.click('.star-rating >> nth=4'); // 5 stars
      await page.fill('textarea[name="review"]', 'Excellent work, very professional');

      // Approve and release funds
      await page.click('button:has-text("Approve & Release Funds")');

      // Confirm release
      await page.click('button:has-text("Confirm Release")');

      // Verify completion
      await expect(page.locator('.success-message')).toContainText('Funds released successfully');
      expect(await page.isVisible('text=Job Completed')).toBeTruthy();
    });
  });

  test.describe('Search and Discovery', () => {
    test('should search for contractors', async ({ page }) => {
      await page.goto('/contractors');

      // Use search filters
      await page.fill('input[placeholder="Search contractors..."]', 'plumber');
      await page.selectOption('select[name="location"]', 'london');
      await page.click('input[value="4"]'); // 4+ star rating

      // Apply filters
      await page.click('button:has-text("Search")');

      // Verify results
      await expect(page.locator('.contractor-card')).toHaveCount({ min: 1, max: 20 });

      // Click on a contractor profile
      await page.click('.contractor-card:first-child');

      // Verify profile page
      expect(await page.isVisible('text=Contractor Profile')).toBeTruthy();
      expect(await page.isVisible('text=Reviews')).toBeTruthy();
      expect(await page.isVisible('text=Portfolio')).toBeTruthy();
    });

    test('should filter jobs by category', async ({ page }) => {
      await page.goto('/jobs');

      // Apply category filter
      await page.click('button:has-text("Categories")');
      await page.click('input[value="plumbing"]');
      await page.click('input[value="electrical"]');
      await page.click('button:has-text("Apply Filters")');

      // Verify filtered results
      const jobCards = page.locator('.job-card');
      const count = await jobCards.count();

      for (let i = 0; i < count; i++) {
        const category = await jobCards.nth(i).locator('.category-badge').textContent();
        expect(['Plumbing', 'Electrical']).toContain(category);
      }
    });
  });

  test.describe('Accessibility Checks', () => {
    test('should navigate with keyboard only', async ({ page }) => {
      await page.goto('/');

      // Tab through navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Activate link with Enter
      await page.keyboard.press('Enter');

      // Verify navigation worked
      expect(page.url()).not.toBe('/');
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/');

      // Check for skip links
      const skipLink = page.locator('a:has-text("Skip to main content")');
      await skipLink.focus();
      expect(await skipLink.isVisible()).toBeTruthy();

      // Check main navigation has proper role
      const nav = page.locator('nav[role="navigation"]');
      expect(await nav.count()).toBeGreaterThan(0);

      // Check forms have labels
      await page.goto('/login');
      const emailLabel = page.locator('label[for="email"]');
      expect(await emailLabel.isVisible()).toBeTruthy();
    });

    test('should announce page changes to screen readers', async ({ page }) => {
      await page.goto('/');

      // Check for aria-live region
      const liveRegion = page.locator('[aria-live="polite"]');
      expect(await liveRegion.count()).toBeGreaterThan(0);

      // Navigate and check for announcement
      await page.click('text=About');

      // Wait for potential announcement
      await page.waitForTimeout(100);

      // Check page title updated
      expect(await page.title()).toContain('About');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page, context }) => {
      // Simulate offline mode
      await context.setOffline(true);

      await page.goto('/');

      // Check for offline message
      expect(await page.isVisible('text=You are offline')).toBeTruthy();

      // Re-enable network
      await context.setOffline(false);

      // Reload and verify recovery
      await page.reload();
      expect(await page.isVisible('text=You are offline')).toBeFalsy();
    });

    test('should handle 404 pages', async ({ page }) => {
      await page.goto('/non-existent-page');

      // Check for 404 page
      expect(await page.textContent('h1')).toContain('404');
      expect(await page.isVisible('text=Page not found')).toBeTruthy();

      // Check for home link
      await page.click('text=Go to Homepage');
      await page.waitForURL('/');
    });

    test('should handle form validation errors', async ({ page }) => {
      await page.goto('/register');

      // Submit empty form
      await page.click('button[type="submit"]');

      // Check for validation messages
      expect(await page.isVisible('text=Email is required')).toBeTruthy();
      expect(await page.isVisible('text=Password is required')).toBeTruthy();

      // Fill with invalid data
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', '123'); // Too short

      // Check for specific validation errors
      await page.click('button[type="submit"]');
      expect(await page.isVisible('text=Invalid email format')).toBeTruthy();
      expect(await page.isVisible('text=Password must be at least 8 characters')).toBeTruthy();
    });
  });
});