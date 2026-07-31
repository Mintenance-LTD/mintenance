/**
 * Builds the Android App Links intent-filter `data` entries from the canonical
 * path allowlist in packages/shared/deep-link-paths.json.
 *
 * WHY (2026-07-21): Android's assetlinks.json has no path concept — it binds a
 * domain to a package + signing cert and nothing more. Path filtering has to be
 * declared here, in the app manifest. Previously this file didn't exist and
 * app.config.js declared only `{ scheme, host }`, which claims EVERY path on
 * mintenance.co.uk — including /auth/callback and the password flows that the
 * iOS association file deliberately excludes ("password flows stay in the
 * browser"). That asymmetry meant a tapped auth link could open the app on
 * Android, where the linking config has no route for it, leaving the token
 * unprocessed.
 *
 * Android has no `exclude` primitive, so this emits a POSITIVE allowlist:
 * anything not listed falls through to the browser, which is the same end
 * behaviour as the iOS excludes.
 *
 * Plain CommonJS (not TypeScript) on purpose: app.config.js is evaluated by
 * Expo in Node at build time, before any package `dist/` is guaranteed to
 * exist, so it must not depend on a compiled workspace build.
 */
const { appHandled } = require('../../packages/shared/deep-link-paths.json');

/**
 * @param {string[]} hosts e.g. ['mintenance.co.uk', 'www.mintenance.co.uk']
 * @returns {{scheme: string, host: string, path?: string, pathPrefix?: string}[]}
 */
function buildAndroidIntentData(hosts) {
  const data = [];
  for (const host of hosts) {
    for (const entry of appHandled) {
      if (entry.exact) {
        // Exact match only. `pathPrefix: '/jobs'` would also swallow
        // '/jobsomething', so the bare path needs its own `path` entry.
        data.push({ scheme: 'https', host, path: entry.path });
      }
      if (entry.children) {
        // Trailing slash is deliberate — see the note above.
        data.push({ scheme: 'https', host, pathPrefix: `${entry.path}/` });
      }
    }
  }
  return data;
}

module.exports = { buildAndroidIntentData, appHandled };
