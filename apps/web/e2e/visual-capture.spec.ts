import { test, expect } from './fixtures';
import { prepareVisualPage } from './helpers/prepare-visual-page';

for (const width of [375, 1440]) {
  test(`capture reveals nested, delayed content and lazy images at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.setContent(`
      <style>
        body { margin: 0; }
        .spacer { height: 1100px; }
        .reveal { opacity: 0; transform: translateY(24px); transition: opacity .2s, transform .2s; }
        .reveal.shown { opacity: 1; transform: none; }
      </style>
      <main><h1>Top</h1><div class="spacer"></div>
        <section class="reveal"><h2>Below the fold</h2>
          <div class="reveal"><h3>Delayed nested card</h3><p>Real visible copy</p></div>
          <img width="80" height="80" loading="lazy" alt="Lazy illustration">
        </section><div class="spacer"></div><h2>Bottom</h2>
      </main>
      <script>
        const observer = new IntersectionObserver(entries => {
          for (const entry of entries) if (entry.isIntersecting) {
            const el = entry.target;
            setTimeout(() => el.classList.add('shown'), el.querySelector('h3') ? 350 : 100);
            observer.unobserve(el);
          }
        });
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        const image = document.querySelector('img');
        const images = new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) {
            setTimeout(() => image.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="green"/></svg>'), 250);
            images.disconnect();
          }
        });
        images.observe(image);
      </script>
    `);
    expect(
      await page
        .locator('section')
        .evaluate((el) => getComputedStyle(el).opacity)
    ).toBe('0');
    await prepareVisualPage(page);
    await expect(page.locator('.reveal').first()).toHaveCSS('opacity', '1');
    await expect(page.locator('.reveal').last()).toHaveCSS('opacity', '1');
    expect(
      await page
        .locator('img')
        .evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0
        )
    ).toBe(true);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    // It really scrolled/revealed the page; no injected opacity override.
    await expect(page.locator('section')).not.toHaveAttribute('style');
  });
}

test('capture rejects content that never reveals', async ({ page }) => {
  await page.setContent(
    '<main><section style="opacity:0"><h2>Invisible section</h2></section></main>'
  );
  await expect(prepareVisualPage(page, { timeout: 500 })).rejects.toThrow(
    'Screenshot content must be revealed'
  );
});

test('capture rejects sections that hide again when returning to the top', async ({
  page,
}) => {
  await page.setContent(`
    <main><h1>Top</h1><div style="height:1200px"></div>
      <section style="opacity:0"><h2>Temporary reveal</h2></section>
    </main>
    <script>new IntersectionObserver(([entry]) => {
      entry.target.style.opacity = entry.isIntersecting ? '1' : '0';
    }).observe(document.querySelector('section'));</script>
  `);
  await expect(prepareVisualPage(page, { timeout: 500 })).rejects.toThrow(
    'Screenshot content must be revealed'
  );
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('capture rejects a broken image instead of recording an empty box', async ({
  page,
}) => {
  await page.setContent(
    '<main><h1>Top</h1><img width="50" height="50" src="data:image/png,broken"></main>'
  );
  await expect(prepareVisualPage(page, { timeout: 500 })).rejects.toThrow(
    'Screenshot content must be revealed'
  );
});

test('capture bounds scrolling on unexpectedly long pages', async ({
  page,
}) => {
  await page.setContent(
    '<main><h1>Top</h1><div style="height:100000px"></div></main>'
  );
  await expect(prepareVisualPage(page, { maxScrollSteps: 2 })).rejects.toThrow(
    'exceeded 2 scroll steps'
  );
});
