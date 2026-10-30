import { test, expect } from './fixtures';
import { expectJobsListContent } from './helpers/jobs-list';

for (const [name, content] of [
  [
    'editorial card',
    '<a href="/jobs/synthetic" data-testid="job-card">Repair tap</a>',
  ],
  [
    'legacy card',
    '<a href="/jobs/synthetic"><article>Repair tap</article></a>',
  ],
  [
    'editorial empty',
    '<p>No jobs yet. Post your first one and local tradespeople will respond.</p>',
  ],
  ['legacy empty', '<h3>Post your first maintenance job</h3>'],
]) {
  test(`jobs readiness waits for delayed ${name}`, async ({ page }) => {
    await page.setContent('<main><p>Loading your jobs...</p></main>');
    await page.evaluate((html) => {
      setTimeout(() => {
        const main = document.querySelector('main');
        if (main) main.innerHTML = html;
      }, 250);
    }, content);
    await expectJobsListContent(page);
  });
}

for (const [name, html] of [
  [
    'navigation only',
    '<nav><a href="/jobs/create">Post a job</a></nav><main><h1>Your jobs</h1></main>',
  ],
  [
    'hidden streamed content',
    '<main><div hidden><p>No jobs yet.</p><a data-testid="job-card">Hidden job</a></div><p>Loading...</p></main>',
  ],
  [
    'error page',
    '<main><h1>Unable to load jobs</h1><button>Retry</button></main>',
  ],
  ['login page', '<main><h1>Welcome back</h1><button>Sign in</button></main>'],
]) {
  test(`jobs readiness rejects ${name}`, async ({ page }) => {
    await page.setContent(html);
    await expect(expectJobsListContent(page, 250)).rejects.toThrow();
  });
}
