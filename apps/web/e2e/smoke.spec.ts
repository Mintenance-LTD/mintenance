import { expect, test } from '@playwright/test';

test('public login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('body')).toContainText(/sign in|log in|welcome/i);
});
