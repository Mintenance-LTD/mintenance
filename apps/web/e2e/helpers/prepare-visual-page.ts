import { expect, type Page } from '@playwright/test';

const CONTENT = 'main h1, main h2, main h3, main p, main img';

/** Exercise real viewport observers; never force opacity or disable app animations. */
export async function prepareVisualPage(
  page: Page,
  { timeout = 5_000, maxScrollSteps = 80 } = {}
) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));

  async function settle(viewportOnly: boolean) {
    let previous = '';
    let stableSamples = 0;
    await expect
      .poll(
        async () => {
          const state = await page.evaluate(
            ({ selector, viewportOnly }) => {
              const issues: string[] = [];
              const geometry: number[] = [];
              for (const element of document.querySelectorAll(selector)) {
                const rect = element.getBoundingClientRect();
                // Responsive display:none alternatives and collapsed content are
                // not screenshot content. Opacity:0 still has a box and MUST fail.
                if (!rect.width || !rect.height) continue;
                if (
                  viewportOnly &&
                  (rect.bottom <= 0 || rect.top >= innerHeight)
                )
                  continue;
                const label =
                  element.textContent?.trim().slice(0, 80) || element.tagName;
                let opacity = 1;
                for (
                  let ancestor: Element | null = element;
                  ancestor;
                  ancestor = ancestor.parentElement
                ) {
                  const style = getComputedStyle(ancestor);
                  opacity *= Number(style.opacity);
                  if (!viewportOnly && style.visibility !== 'visible')
                    issues.push(`${label}: hidden`);
                }
                // A tall parent's observer may need more of the next viewport
                // before it starts. Keep scrolling; require visibility only
                // after the entire page has been visited.
                if (!viewportOnly && opacity < 0.99)
                  issues.push(`${label}: opacity ${opacity.toFixed(3)}`);
                if (
                  !viewportOnly &&
                  element instanceof HTMLImageElement &&
                  (!element.complete || !element.naturalWidth)
                ) {
                  issues.push(`${label}: image not loaded`);
                }
                geometry.push(
                  Math.round(opacity * 1000),
                  ...[rect.x, rect.y, rect.width, rect.height].map((n) =>
                    Math.round(n * 10)
                  )
                );
              }
              if (document.fonts.status !== 'loaded')
                issues.push('fonts not loaded');
              return {
                issues,
                geometry,
                height: document.documentElement.scrollHeight,
              };
            },
            { selector: CONTENT, viewportOnly }
          );
          const sample = JSON.stringify([state.geometry, state.height]);
          stableSamples =
            sample === previous && state.issues.length === 0
              ? stableSamples + 1
              : 0;
          previous = sample;
          return state.issues.length
            ? state.issues
            : stableSamples >= 2
              ? []
              : ['layout still settling'];
        },
        {
          timeout,
          intervals: [100],
          message: 'Screenshot content must be revealed, loaded and settled',
        }
      )
      .toEqual([]);
  }

  async function scrollTo(top: number) {
    await page.evaluate(async (top) => {
      window.scrollTo({ top, behavior: 'instant' });
      // Give IntersectionObserver and React a chance to start their animations.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
    }, top);
  }

  await scrollTo(0);
  let reachedBottom = false;
  for (let step = 0; step < maxScrollSteps; step++) {
    await settle(true);
    const { y, height, viewport } = await page.evaluate(() => ({
      y: scrollY,
      height: document.documentElement.scrollHeight,
      viewport: innerHeight,
    }));
    if (y + viewport >= height - 1) {
      reachedBottom = true;
      break;
    }
    // Overlap viewports so small/nested reveal targets are not jumped over.
    await scrollTo(
      Math.min(y + Math.floor(viewport * 0.65), height - viewport)
    );
  }
  if (!reachedBottom)
    throw new Error(`Screenshot page exceeded ${maxScrollSteps} scroll steps`);

  await scrollTo(0);
  // Full-page screenshots expand the capture, not the observer viewport. Check
  // offscreen content too, including elements that hide again on scroll-out.
  await settle(false);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.querySelectorAll<HTMLImageElement>('main img'))
        .filter((image) => image.getBoundingClientRect().width > 0)
        .map((image) => image.decode())
    );
  });
}
