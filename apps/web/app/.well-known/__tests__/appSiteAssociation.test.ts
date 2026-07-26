import { describe, it, expect } from 'vitest';
import { buildIosComponents } from '../apple-app-site-association/route';
import deepLinkPaths from '@mintenance/shared/deep-link-paths.json';

/**
 * Counterpart to apps/mobile/__tests__/deepLinkIntentFilters.test.ts.
 *
 * Both platforms derive their deep-link allowlist from
 * packages/shared/deep-link-paths.json. These tests assert the iOS side
 * honours it — in particular that the auth paths stay excluded, which is the
 * behaviour Android was previously missing entirely.
 */

describe('buildIosComponents()', () => {
  const components = buildIosComponents();

  it('excludes every browser-only path', () => {
    for (const blocked of deepLinkPaths.browserOnly) {
      const rule = components.find((c) => c['/'] === `${blocked}*`);
      expect(rule, `missing exclude for ${blocked}`).toBeDefined();
      expect(rule?.exclude).toBe(true);
    }
  });

  it('lists excludes before includes — iOS takes the first match', () => {
    const lastExclude = components.map((c) => !!c.exclude).lastIndexOf(true);
    const firstInclude = components.map((c) => !!c.exclude).indexOf(false);
    expect(lastExclude).toBeLessThan(firstInclude);
  });

  it('claims every app-handled path exactly as declared', () => {
    for (const entry of deepLinkPaths.appHandled) {
      const paths = components.filter((c) => !c.exclude).map((c) => c['/']);
      expect(paths.includes(entry.path)).toBe(entry.exact);
      if (entry.children) {
        expect(paths).toContain(`${entry.path}/*`);
      }
    }
  });

  it('never claims an auth path as an include', () => {
    const includes = components.filter((c) => !c.exclude).map((c) => c['/']);
    for (const blocked of deepLinkPaths.browserOnly) {
      expect(includes.some((p) => p.startsWith(blocked))).toBe(false);
    }
  });
});
