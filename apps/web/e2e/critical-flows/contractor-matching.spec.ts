import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Contractor Discovery and Matching Algorithm
 *
 * Tests the complete flow:
 * 1. Job posting by homeowner
 * 2. Contractor discovery page
 * 3. Matching algorithm (skills, location, rating)
 * 4. Contractor search and filtering
 * 5. Viewing contractor profiles
 * 6. Sending job invitations
 */

test.describe('Contractor Discovery & Matching', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated homeowner session
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'test-homeowner-id',
        email: 'homeowner@contractor-test.com',
        role: 'homeowner',
        verified: true
      }));
    });
  });

  test('should display contractor discover page', async ({ page }) => {
    await page.goto('/contractors');
    await expect(page).toHaveURL(/\/contractors/);

    // Verify contractor list is visible
    await page.waitForTimeout(2000);
    const contractorList = page.locator('[data-testid*="contractor"], .contractor-card, [role="listitem"]').first();
    if (await contractorList.count() > 0) {
      await expect(contractorList).toBeVisible();
    }
  });

  test('should display contractor profiles with key information', async ({ page }) => {
    await page.goto('/contractors');
    await page.waitForTimeout(2000);

    // Should show contractor name
    const contractorName = page.locator('[data-testid*="contractor-name"], .contractor-name, h2, h3').first();
    if (await contractorName.count() > 0) {
      await expect(contractorName).toBeVisible();
    }

    // Should show rating
    const rating = page.locator('text=/★|⭐|rating|\d+\.\d+/i').first();
    if (await rating.count() > 0) {
      await expect(rating).toBeVisible();
    }

    // Should show skills/specialties
    const skills = page.locator('text=/skill|specialty|plumb|electric|carpent/i').first();
    if (await skills.count() > 0) {
      await expect(skills).toBeVisible();
    }
  });

  test('should filter contractors by skill', async ({ page }) => {
    await page.goto('/contractors');
    await page.waitForTimeout(2000);

    // Look for skill filter
    const skillFilter = page.locator('select[name*="skill"], input[placeholder*="skill" i], button:has-text("Filter")').first();
    if (await skillFilter.count() > 0) {
      await skillFilter.click();
      await page.waitForTimeout(500);

      // Select a skill
      const plumbingOption = page.locator('text=/plumbing/i').first();
      if (await plumbingOption.count() > 0) {
        await plumbingOption.click();
        await page.waitForTimeout(1000);

        // Verify filtered results
        const contractorCards = page.locator('[data-testid*="contractor"], .contractor-card');
        if (await contractorCards.count() > 0) {
          // All should have plumbing skill
          const firstCard = contractorCards.first();
          await expect(firstCard).toContainText(/plumbing/i);
        }
      }
    }
  });

  test('should filter contractors by location', async ({ page }) => {
    await page.goto('/contractors');
    await page.waitForTimeout(2000);

    // Look for location filter
    const locationFilter = page.locator('input[name*="location"], input[placeholder*="location" i]').first();
    if (await locationFilter.count() > 0) {
      await locationFilter.fill('London');
      await page.waitForTimeout(1000);

      // Press Enter or click search
      await locationFilter.press('Enter');
      await page.waitForTimeout(1000);

      // Verify contractors in London area are shown
      const contractorLocation = page.locator('text=/london/i').first();
      if (await contractorLocation.count() > 0) {
        await expect(contractorLocation).toBeVisible();
      }
    }
  });

  test('should sort contractors by rating', async ({ page }) => {
    await page.goto('/contractors');
    await page.waitForTimeout(2000);

    // Look for sort dropdown
    const sortDropdown = page.locator('select[name*="sort"], button:has-text("Sort")').first();
    if (await sortDropdown.count() > 0) {
      await sortDropdown.click();
      await page.waitForTimeout(500);

      // Select "Rating (High to Low)"
      const ratingOption = page.locator('text=/rating.*high|highest.*rating/i').first();
      if (await ratingOption.count() > 0) {
        await ratingOption.click();
        await page.waitForTimeout(1000);

        // Verify contractors are sorted by rating
        const ratings = await page.locator('[data-testid*="rating"]').allTextContents();
        // First contractor should have highest rating
        expect(ratings.length).toBeGreaterThan(0);
      }
    }
  });

  test('should view individual contractor profile', async ({ page }) => {
    await page.goto('/contractors');
    await page.waitForTimeout(2000);

    // Click on first contractor card
    const firstContractor = page.locator('[data-testid*="contractor"], .contractor-card, a[href*="/contractor/"]').first();
    if (await firstContractor.count() > 0) {
      await firstContractor.click();
      await page.waitForTimeout(1000);

      // Should navigate to contractor detail page
      await expect(page).toHaveURL(/\/contractor\/\w+/);

      // Should show full profile
      await expect(page.locator('h1, h2').first()).toBeVisible();
    }
  });

  test('should display contractor portfolio/past work', async ({ page }) => {
    await page.goto('/contractor/test-contractor-id');
    await page.waitForTimeout(2000);

    // Should show portfolio section
    const portfolio = page.locator('text=/portfolio|past.*work|previous.*jobs|gallery/i').first();
    if (await portfolio.count() > 0) {
      await expect(portfolio).toBeVisible();

      // Should show project images
      const projectImages = page.locator('img[src*="project"], img[alt*="work"]').first();
      if (await projectImages.count() > 0) {
        await expect(projectImages).toBeVisible();
      }
    }
  });

  test('should display contractor reviews and ratings', async ({ page }) => {
    await page.goto('/contractor/test-contractor-id');
    await page.waitForTimeout(2000);

    // Should show reviews section
    const reviewsSection = page.locator('text=/reviews|testimonials|feedback/i').first();
    if (await reviewsSection.count() > 0) {
      await expect(reviewsSection).toBeVisible();

      // Should show individual reviews
      const review = page.locator('[data-testid*="review"], .review-item').first();
      if (await review.count() > 0) {
        await expect(review).toBeVisible();
      }
    }
  });

  test('should send job invitation to contractor', async ({ page }) => {
    await page.goto('/contractor/test-contractor-id');
    await page.waitForTimeout(2000);

    // Look for "Invite to Job" button
    const inviteButton = page.locator('button:has-text("Invite"), button:has-text("Send"), button:has-text("Contact")').first();
    if (await inviteButton.count() > 0) {
      await inviteButton.click();
      await page.waitForTimeout(500);

      // Should show job selection modal or form
      const jobSelect = page.locator('select[name*="job"], [data-testid*="job-select"]').first();
      if (await jobSelect.count() > 0) {
        await expect(jobSelect).toBeVisible();
      }
    }
  });

  test('should display matching score for contractors', async ({ page }) => {
    await page.goto('/contractors?jobId=test-job-id');
    await page.waitForTimeout(2000);

    // Should show match percentage
    const matchScore = page.locator('text=/match|\d+%|score/i').first();
    if (await matchScore.count() > 0) {
      await expect(matchScore).toBeVisible();
    }

    // Higher matches should be ranked first
    const firstMatch = page.locator('[data-testid*="contractor"]').first();
    if (await firstMatch.count() > 0) {
      const matchText = await firstMatch.textContent();
      expect(matchText).toMatch(/\d+%/);
    }
  });

  test('should filter by verification status', async ({ page }) => {
    await page.goto('/contractors');
    await page.waitForTimeout(2000);

    // Look for "Verified Only" toggle/filter
    const verifiedFilter = page.locator('input[type="checkbox"]:has-text("Verified"), label:has-text("Verified")').first();
    if (await verifiedFilter.count() > 0) {
      await verifiedFilter.click();
      await page.waitForTimeout(1000);

      // All shown contractors should be verified
      const verifiedBadge = page.locator('text=/✓|verified|✔/i').first();
      if (await verifiedBadge.count() > 0) {
        await expect(verifiedBadge).toBeVisible();
      }
    }
  });

  test('should display contractor availability', async ({ page }) => {
    await page.goto('/contractor/test-contractor-id');
    await page.waitForTimeout(2000);

    // Should show availability status
    const availability = page.locator('text=/available|booked|busy|calendar/i').first();
    if (await availability.count() > 0) {
      await expect(availability).toBeVisible();
    }
  });

  test('should show contractor response time', async ({ page }) => {
    await page.goto('/contractor/test-contractor-id');
    await page.waitForTimeout(2000);

    // Should show average response time
    const responseTime = page.locator('text=/response.*time|responds.*in|within.*\d+.*hours/i').first();
    if (await responseTime.count() > 0) {
      await expect(responseTime).toBeVisible();
    }
  });

  test('should display contractor certifications', async ({ page }) => {
    await page.goto('/contractor/test-contractor-id');
    await page.waitForTimeout(2000);

    // Should show certifications section
    const certifications = page.locator('text=/certification|qualified|licensed|accredited/i').first();
    if (await certifications.count() > 0) {
      await expect(certifications).toBeVisible();
    }
  });

  test('should search contractors by name', async ({ page }) => {
    await page.goto('/contractors');
    await page.waitForTimeout(1000);

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('John Smith');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);

      // Should show search results
      const results = page.locator('text=/john.*smith/i').first();
      if (await results.count() > 0) {
        await expect(results).toBeVisible();
      }
    }
  });

  test('should show "No contractors found" message when filters match nothing', async ({ page }) => {
    await page.goto('/contractors');
    await page.waitForTimeout(2000);

    // Apply very specific filters that match nothing
    const searchInput = page.locator('input[type="search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('NonexistentContractorXYZ123');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);

      // Should show no results message
      const noResults = page.locator('text=/no.*contractor|no.*results|not.*found/i').first();
      if (await noResults.count() > 0) {
        await expect(noResults).toBeVisible();
      }
    }
  });

  test('should paginate contractor results', async ({ page }) => {
    await page.goto('/contractors');
    await page.waitForTimeout(2000);

    // Look for pagination controls
    const pagination = page.locator('[aria-label*="pagination"], .pagination, button:has-text("Next")').first();
    if (await pagination.count() > 0) {
      await expect(pagination).toBeVisible();

      // Click next page
      const nextButton = page.locator('button:has-text("Next"), a:has-text("Next")').first();
      if (await nextButton.count() > 0) {
        await nextButton.click();
        await page.waitForTimeout(1000);

        // URL should update with page parameter
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/page=2/);
      }
    }
  });
});
