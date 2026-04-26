'use client';

/**
 * Sentry browser-runtime mount point.
 *
 * The actual init lives in `sentry.client.config.ts` so it can stay
 * close to its server / edge siblings. This file's only job is to
 * import that module exactly once on the browser side, side-effect
 * style, by being mounted from inside the root <Providers />.
 *
 * Why a separate file rather than an import in providers.tsx:
 *   - The Sentry SDK has measurable bundle weight (~100KB minzipped).
 *     Co-locating it in providers.tsx would make every providers
 *     change bust the Sentry chunk cache. Splitting the import
 *     gives webpack a clean code-splitting boundary.
 *   - Server Components that re-render providers.tsx on every request
 *     don't need to re-evaluate the Sentry init module.
 *
 * Renders nothing — purely a side-effect mount.
 */

import { useEffect } from 'react';

export function SentryInit(): null {
  useEffect(() => {
    // Dynamic import so the Sentry SDK is excluded from the initial
    // client bundle and only loaded once the app boots. The init
    // itself is idempotent — Sentry SDK v10 silently no-ops a second
    // call to Sentry.init.
    void import('../sentry.client.config');
  }, []);

  return null;
}
