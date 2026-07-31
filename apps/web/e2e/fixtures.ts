/**
 * Shared Playwright fixtures for the Mintenance e2e suite.
 *
 * Every spec should import `test`/`expect` from here rather than from
 * '@playwright/test' directly, so the fixtures below apply suite-wide.
 */

import { test as base, expect } from '@playwright/test';

/**
 * Must stay in sync with components/CookieConsent.tsx (STORAGE_KEY and
 * CONSENT_VERSION). e2e/ is excluded from tsconfig and imports no app code by
 * design, so these are duplicated rather than imported. If the component's
 * version is bumped without updating CONSENT_VERSION here, the banner starts
 * appearing again and the click-blocking failures below return.
 */
const CONSENT_STORAGE_KEY = 'mintenance_cookie_consent';
const CONSENT_VERSION = '2.0';

export const test = base.extend({
  /**
   * Pre-accept the cookie banner for every test.
   *
   * CookieConsent renders a full-viewport `fixed inset-0` backdrop one second
   * after mount whenever no stored consent is found. The backdrop is
   * aria-hidden and purely decorative, but it still intercepts pointer events
   * across the whole page, so any click issued more than a second after
   * navigation hangs until the test times out. That accounted for most of the
   * 60s click timeouts in CI run 30432147313.
   *
   * This runs as an init script rather than via storageState so it survives
   * `clearAuth()` (which calls localStorage.clear()) — the script re-seeds on
   * the next navigation.
   */
  page: async ({ page }, use) => {
    await page.addInitScript(
      ({ key, version }) => {
        try {
          window.localStorage.setItem(
            key,
            JSON.stringify({
              preferences: {
                essential: true,
                analytics: false,
                functional: false,
                marketing: false,
              },
              timestamp: new Date().toISOString(),
              version,
            })
          );
        } catch {
          // Storage is unavailable on opaque origins (about:blank); the banner
          // cannot render there either, so there is nothing to suppress.
        }
      },
      { key: CONSENT_STORAGE_KEY, version: CONSENT_VERSION }
    );

    await use(page);
  },
});

export { expect };
