import { NextResponse } from 'next/server';

/**
 * GET /.well-known/apple-app-site-association
 *
 * Apple Universal Links association file for the Mintenance iOS app. iOS
 * fetches this (unauthenticated, over HTTPS, NO redirects) from the exact host
 * declared in the app's `applinks:` entitlement — see
 * apps/mobile/app.config.js `ios.associatedDomains` (mintenance.co.uk +
 * www.mintenance.co.uk). The JS link prefixes in
 * apps/mobile/src/navigation/deepLinking.ts must match the same host.
 *
 * MUST be served with Content-Type: application/json and WITHOUT a file
 * extension — hence a route handler rather than a static file.
 *
 * appID = <Apple Team ID>.<bundle identifier>. The bundle id is stable
 * (com.mintenance.app); the 10-char Team ID is environment-specific and is
 * read from APPLE_APP_SITE_ASSOCIATION_TEAM_ID (set it in Vercel before the
 * EAS build ships, or universal links will fail to verify on device).
 *
 * `components` is an allowlist of the paths the mobile app actually handles
 * (mirrors deepLinking.ts). Everything else — marketing pages, and the
 * password-reset / forgot-password email flows — is deliberately excluded so
 * those open in the browser rather than being hijacked into the app.
 */

// Mirrors apps/mobile/app.config.js ios.bundleIdentifier.
const IOS_BUNDLE_ID = 'com.mintenance.app';

export const dynamic = 'force-dynamic';

export function GET() {
  const teamId =
    process.env.APPLE_APP_SITE_ASSOCIATION_TEAM_ID ||
    process.env.EXPO_APPLE_TEAM_ID ||
    // Obvious, invalid placeholder so a missing secret fails verification
    // loudly rather than silently associating a wrong appID.
    'TEAMID_NOT_SET';

  const appID = `${teamId}.${IOS_BUNDLE_ID}`;

  const body = {
    applinks: {
      details: [
        {
          appIDs: [appID],
          components: [
            // Password flows stay in the browser / email client.
            { '/': '/reset-password*', exclude: true },
            { '/': '/forgot-password*', exclude: true },
            // App-handled entity paths (see deepLinking.ts linkingConfig).
            { '/': '/jobs' },
            { '/': '/jobs/*' },
            { '/': '/payment/*' },
            { '/': '/contracts/*' },
            { '/': '/messages' },
            { '/': '/messages/*' },
            { '/': '/contractors/*' },
            { '/': '/properties' },
            { '/': '/properties/*' },
            { '/': '/bookings/*' },
            { '/': '/notifications' },
            { '/': '/profile' },
            { '/': '/profile/*' },
          ],
        },
      ],
    },
    // webcredentials lets the app offer Password AutoFill / SMS OTP for the
    // same domain; harmless to advertise and useful once shared web creds land.
    webcredentials: {
      apps: [appID],
    },
  };

  return NextResponse.json(body, {
    headers: {
      'Content-Type': 'application/json',
      // Apple caches the AASA; keep it fresh enough to recover from a bad
      // deploy without hammering the origin.
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  });
}
