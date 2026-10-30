import { expect, type Page } from '@playwright/test';

export async function expectJobsListContent(page: Page, timeout = 10_000) {
  const main = page.locator('main');
  // Match real list content in both themes. A generic 'Post a job' navigation
  // link or a hidden streamed duplicate must never satisfy this assertion.
  const content = main
    .locator('[data-testid="job-card"]:visible')
    .or(
      main.locator(
        'a[href^="/jobs/"]:not([href="/jobs/create"]) article:visible'
      )
    )
    .or(
      main
        .getByText(
          /^(No jobs yet\.|No jobs match|Post your first maintenance job)/
        )
        .filter({ visible: true })
    );
  await expect(content.first()).toBeVisible({ timeout });
}
