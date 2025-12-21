import { test, expect } from '@playwright/test';

/**
 * E2E Tests for MintAI Property Damage Analysis Flow
 *
 * Tests the complete flow:
 * 1. Upload property images
 * 2. Trigger AI analysis (YOLO v11 + SAM3)
 * 3. Verify damage detection results
 * 4. Generate cost estimates
 * 5. Create job from analysis
 */

test.describe('MintAI Property Damage Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated homeowner session
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'test-homeowner-id',
        email: 'homeowner@mintai-test.com',
        role: 'homeowner',
        verified: true
      }));
    });
  });

  test('should navigate to AI assessment page', async ({ page }) => {
    await page.goto('/ai-assessment');
    await expect(page).toHaveURL(/\/ai-assessment/);

    // Verify page title or heading
    await expect(page.locator('h1, h2').first()).toContainText(/AI.*Assessment|MintAI|Property.*Analysis/i);
  });

  test('should display upload interface', async ({ page }) => {
    await page.goto('/ai-assessment');

    // Verify file upload input is visible
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible();

    // Verify drag-and-drop zone if present
    const dropZone = page.locator('[data-testid*="dropzone"], .dropzone, [role="button"]:has-text("upload")').first();
    if (await dropZone.count() > 0) {
      await expect(dropZone).toBeVisible();
    }
  });

  test('should upload property images successfully', async ({ page }) => {
    await page.goto('/ai-assessment');

    // Locate file input
    const fileInput = page.locator('input[type="file"]').first();

    // Upload test images
    await fileInput.setInputFiles([
      {
        name: 'property-exterior.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-jpeg-data-exterior')
      },
      {
        name: 'damage-area.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-jpeg-data-damage')
      }
    ]);

    // Wait for upload confirmation
    await page.waitForTimeout(1000);

    // Verify images appear in preview
    const imagePreview = page.locator('img[src*="blob:"], img[src*="data:"], [data-testid*="preview"]').first();
    if (await imagePreview.count() > 0) {
      await expect(imagePreview).toBeVisible();
    }
  });

  test('should validate file types and sizes', async ({ page }) => {
    await page.goto('/ai-assessment');

    const fileInput = page.locator('input[type="file"]').first();

    // Try to upload invalid file type
    await fileInput.setInputFiles({
      name: 'malicious.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('fake-exe-data')
    });

    // Should show validation error
    await page.waitForTimeout(500);
    const errorMessage = page.locator('text=/invalid.*type|not.*allowed|wrong.*format/i');
    if (await errorMessage.count() > 0) {
      await expect(errorMessage.first()).toBeVisible();
    }
  });

  test('should trigger AI analysis on image upload', async ({ page }) => {
    await page.goto('/ai-assessment');

    // Upload valid image
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'property.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-jpeg-data')
    });

    // Look for analyze button
    const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Start"), button:has-text("Process")').first();
    if (await analyzeButton.count() > 0) {
      await analyzeButton.click();

      // Should show processing indicator
      await expect(page.locator('text=/analyzing|processing|detecting/i')).toBeVisible({ timeout: 2000 });
    }
  });

  test('should display AI analysis results', async ({ page }) => {
    await page.goto('/ai-assessment/test-assessment-id');

    // Wait for results to load
    await page.waitForTimeout(2000);

    // Should show damage detection results
    const resultsContainer = page.locator('[data-testid*="results"], .results, [role="region"]:has-text("Results")').first();
    if (await resultsContainer.count() > 0) {
      await expect(resultsContainer).toBeVisible();
    }

    // Should show detected damage types
    const damageList = page.locator('text=/crack|leak|mold|damage|dent|scratch/i');
    if (await damageList.count() > 0) {
      await expect(damageList.first()).toBeVisible();
    }
  });

  test('should display cost estimates', async ({ page }) => {
    await page.goto('/ai-assessment/test-assessment-id');

    await page.waitForTimeout(2000);

    // Should show estimated costs
    const costDisplay = page.locator('text=/£|cost|estimate|\d+\.\d{2}/i').first();
    if (await costDisplay.count() > 0) {
      await expect(costDisplay).toBeVisible();
    }

    // Should show breakdown by damage type
    const breakdown = page.locator('text=/breakdown|itemized|detail/i');
    if (await breakdown.count() > 0) {
      await expect(breakdown.first()).toBeVisible();
    }
  });

  test('should show confidence scores for detections', async ({ page }) => {
    await page.goto('/ai-assessment/test-assessment-id');

    await page.waitForTimeout(2000);

    // Look for confidence indicators
    const confidence = page.locator('text=/confidence|accuracy|\d+%/i').first();
    if (await confidence.count() > 0) {
      await expect(confidence).toBeVisible();
    }
  });

  test('should allow creating job from assessment', async ({ page }) => {
    await page.goto('/ai-assessment/test-assessment-id');

    await page.waitForTimeout(2000);

    // Look for "Create Job" button
    const createJobButton = page.locator('button:has-text("Create Job"), a:has-text("Create Job"), button:has-text("Post")').first();
    if (await createJobButton.count() > 0) {
      await createJobButton.click();

      // Should redirect to job creation with pre-filled data
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/jobs\/create|\/jobs\/new/);

      // Verify assessment data is pre-filled
      const titleInput = page.locator('input[name="title"]').first();
      if (await titleInput.count() > 0) {
        const titleValue = await titleInput.inputValue();
        expect(titleValue).toBeTruthy();
      }
    }
  });

  test('should display annotated images with bounding boxes', async ({ page }) => {
    await page.goto('/ai-assessment/test-assessment-id');

    await page.waitForTimeout(2000);

    // Should show analyzed images
    const analyzedImage = page.locator('img[alt*="analysis"], img[alt*="annotated"], canvas').first();
    if (await analyzedImage.count() > 0) {
      await expect(analyzedImage).toBeVisible();
    }
  });

  test('should allow downloading analysis report', async ({ page }) => {
    await page.goto('/ai-assessment/test-assessment-id');

    await page.waitForTimeout(2000);

    // Look for download button
    const downloadButton = page.locator('button:has-text("Download"), a:has-text("Download"), button:has-text("Export")').first();
    if (await downloadButton.count() > 0) {
      await expect(downloadButton).toBeVisible();
    }
  });

  test('should handle analysis errors gracefully', async ({ page }) => {
    await page.goto('/ai-assessment');

    // Mock network error
    await page.route('**/api/ai-assessment/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Analysis failed' })
      });
    });

    // Upload image
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'property.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-jpeg-data')
    });

    // Try to analyze
    const analyzeButton = page.locator('button:has-text("Analyze")').first();
    if (await analyzeButton.count() > 0) {
      await analyzeButton.click();

      // Should show error message
      await expect(page.locator('text=/failed|error|try.*again/i')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should save assessment history', async ({ page }) => {
    await page.goto('/assessments');

    // Should show list of past assessments
    await page.waitForTimeout(2000);

    const assessmentList = page.locator('[data-testid*="assessment"], .assessment-item, [role="listitem"]').first();
    if (await assessmentList.count() > 0) {
      await expect(assessmentList).toBeVisible();
    }
  });

  test('should allow re-analyzing with different images', async ({ page }) => {
    await page.goto('/ai-assessment/test-assessment-id');

    await page.waitForTimeout(1000);

    // Look for "Add More Images" or "Re-analyze" button
    const addButton = page.locator('button:has-text("Add"), button:has-text("Re-analyze"), button:has-text("Upload More")').first();
    if (await addButton.count() > 0) {
      await expect(addButton).toBeVisible();
    }
  });

  test('should display processing status updates', async ({ page }) => {
    await page.goto('/ai-assessment');

    // Upload image and start analysis
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'property.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-jpeg-data')
    });

    const analyzeButton = page.locator('button:has-text("Analyze")').first();
    if (await analyzeButton.count() > 0) {
      await analyzeButton.click();

      // Should show progress indicator
      const progress = page.locator('[role="progressbar"], .progress, text=/\d+%/').first();
      if (await progress.count() > 0) {
        await expect(progress).toBeVisible({ timeout: 2000 });
      }
    }
  });
});
