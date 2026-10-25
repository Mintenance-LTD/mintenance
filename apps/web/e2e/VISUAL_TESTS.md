# Visual screenshot coverage

Run the `visual-regression` Playwright project against the disposable E2E app configured by
`.github/workflows/e2e-tests.yml`. It includes the public-page comparisons and the synthetic
capture-helper regressions in `visual-capture.spec.ts`.

`prepareVisualPage` visits overlapping viewports to trigger the application's real scroll observers.
It returns to the top and requires the main content's headings, paragraphs and images (including
their ancestors) to be opaque and settled, with fonts and images loaded. It does not set opacity,
mock IntersectionObserver, or turn off the application's reveal animations. Pages that hide content
again when it leaves the viewport fail preparation instead of recording a blank baseline.

Landing, pricing and About captures include the revealed content below the fold. The mobile
(375×812), tablet (768×1024) and desktop (1440×900) landing captures are also full-page images. The
comparison tolerance remains `maxDiffPixelRatio: 0.01`.

## Reviewing and refreshing baselines

Use the repository's pinned Playwright version and Ubuntu 24.04 CI environment. Do not copy Windows
screenshots into the `*-linux.png` files. Baselines are in `visual-regression.spec.ts-snapshots/`.

1. Run the changed tests with the normal comparison enabled. If preparation fails, fix that error
   first; a partial or transparent capture is not a valid baseline.
2. Inspect the expected, actual and diff images in the `playwright-report-shard-*` artifact. Check
   the feature cards, pricing FAQ cards, About mission/values/ timeline/story, bottom CTAs and
   footer. On responsive captures, inspect the entire page for clipping or missing content, not just
   the hero.
3. For an intentional change, copy only the reviewed Linux actual images to the corresponding
   baseline files. Alternatively, in the same isolated Linux app environment, run from `apps/web`:

   ```sh
   npx playwright test visual-regression.spec.ts --project=visual-regression --update-snapshots
   ```

4. Review every changed PNG and rerun normal comparisons without `--update-snapshots`. Keep
   capture-helper failures and the 1% tolerance intact.

The normal suite also covers login and signup. These screenshots do not certify authenticated
product flows, every animation state or accessibility compliance.
