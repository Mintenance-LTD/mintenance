import { NextResponse } from 'next/server';

/**
 * GET /.well-known/assetlinks.json
 *
 * Android App Links (Digital Asset Links) file for the Mintenance Android app.
 * The Play Store / device fetches this (unauthenticated, HTTPS) from the host
 * declared with autoVerify in apps/mobile/app.config.js android.intentFilters
 * (mintenance.co.uk + www.mintenance.co.uk). The JS link prefixes in
 * apps/mobile/src/navigation/deepLinking.ts must match the same host.
 *
 * package_name is stable (com.mintenance.app). The signing-cert SHA-256
 * fingerprint(s) are environment-specific and read from ANDROID_CERT_SHA256
 * (comma-separated to list more than one — e.g. the Play App Signing key AND
 * an upload/debug key). Set it in Vercel before the EAS build ships, or
 * autoVerify will fail and links open in Chrome instead of the app.
 *
 * Get the fingerprint from `eas credentials` (Android → keystore) or from the
 * Play Console → Setup → App integrity → App signing key certificate. Format
 * is uppercase hex pairs joined by colons.
 */

// Mirrors apps/mobile/app.config.js android.package.
const ANDROID_PACKAGE = 'com.mintenance.app';

export const dynamic = 'force-dynamic';

export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 || '')
    .split(',')
    .map((fp) => fp.trim())
    .filter(Boolean);

  // Obvious, invalid placeholder so a missing secret fails verification
  // loudly rather than silently shipping an empty fingerprint list.
  const sha256CertFingerprints =
    fingerprints.length > 0 ? fingerprints : ['SHA256_FINGERPRINT_NOT_SET'];

  const body = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: ANDROID_PACKAGE,
        sha256_cert_fingerprints: sha256CertFingerprints,
      },
    },
  ];

  return NextResponse.json(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  });
}
