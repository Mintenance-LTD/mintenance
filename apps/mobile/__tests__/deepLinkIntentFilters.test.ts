/* eslint-disable @typescript-eslint/no-require-imports -- app.config.js and the
 * intent-filter builder are CommonJS evaluated by Expo in Node at build time;
 * they cannot be ESM-imported here.
 */
const { buildAndroidIntentData } = require('../deepLinkIntentFilters') as {
  buildAndroidIntentData: (
    hosts: string[]
  ) => { scheme: string; host: string; path?: string; pathPrefix?: string }[];
};
const deepLinkPaths =
  require('../../../packages/shared/deep-link-paths.json') as {
    appHandled: { path: string; exact: boolean; children: boolean }[];
    browserOnly: string[];
  };

/**
 * Guards the iOS/Android deep-link asymmetry found on 2026-07-21.
 *
 * Android's assetlinks.json cannot express paths, so the app manifest was
 * claiming EVERY path on mintenance.co.uk — including /auth/callback and the
 * password flows that the iOS association file deliberately excludes. A tapped
 * auth link could therefore open the app on Android, where the linking config
 * has no route for it, stranding the token.
 *
 * Both platforms now derive from packages/shared/deep-link-paths.json. These
 * tests assert the Android derivation honours it.
 */

const HOSTS = ['mintenance.co.uk', 'www.mintenance.co.uk'];

describe('buildAndroidIntentData()', () => {
  const data = buildAndroidIntentData(HOSTS);

  it('never emits a bare host entry (which would claim the whole domain)', () => {
    // This is the actual bug: `{ scheme, host }` with no path captures
    // everything, including auth callbacks.
    const bare = data.filter((d) => !d.path && !d.pathPrefix);
    expect(bare).toEqual([]);
  });

  it('covers every host', () => {
    for (const host of HOSTS) {
      expect(data.some((d) => d.host === host)).toBe(true);
    }
    expect(data.every((d) => d.scheme === 'https')).toBe(true);
  });

  it('claims none of the browser-only paths', () => {
    for (const blocked of deepLinkPaths.browserOnly) {
      const captured = data.some(
        (d) =>
          d.path === blocked ||
          (d.pathPrefix && blocked.startsWith(d.pathPrefix))
      );
      expect({ blocked, captured }).toEqual({ blocked, captured: false });
    }
  });

  it('claims every app-handled path exactly as declared', () => {
    for (const entry of deepLinkPaths.appHandled) {
      const forHost = data.filter((d) => d.host === HOSTS[0]);
      if (entry.exact) {
        expect(forHost.some((d) => d.path === entry.path)).toBe(true);
      } else {
        // Not exact -> the bare path must NOT be claimed.
        expect(forHost.some((d) => d.path === entry.path)).toBe(false);
      }
      if (entry.children) {
        expect(forHost.some((d) => d.pathPrefix === `${entry.path}/`)).toBe(
          true
        );
      }
    }
  });

  it('uses a trailing slash on prefixes so /jobs does not swallow /jobsomething', () => {
    const prefixes = data.filter((d) => d.pathPrefix).map((d) => d.pathPrefix!);
    expect(prefixes.length).toBeGreaterThan(0);
    for (const p of prefixes) {
      expect(p.endsWith('/')).toBe(true);
    }
  });
});

describe('app.config.js wiring', () => {
  it('feeds the derived data into the Android intent filter', () => {
    const raw = require('../app.config.js');
    const resolved =
      typeof raw === 'function' ? raw({ config: {} }) : (raw.default ?? raw);
    const expo = resolved.expo ?? resolved;
    const filter = expo.android.intentFilters[0];

    expect(filter.autoVerify).toBe(true);
    expect(filter.data.length).toBe(buildAndroidIntentData(HOSTS).length);
    expect(
      filter.data.some((d: { path?: string }) => d.path === '/login')
    ).toBe(false);
    expect(
      filter.data.some((d: { pathPrefix?: string }) =>
        (d.pathPrefix ?? '').startsWith('/auth')
      )
    ).toBe(false);
  });
});
