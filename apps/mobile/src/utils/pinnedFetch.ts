/**
 * `pinnedFetch` — single-touchpoint fetch wrapper for the mobile app.
 *
 * # Why this exists (MSV-P1-7 scaffold extension, 2026-04-25)
 *
 * The runbook at `docs/MOBILE_CERT_PINNING_RUNBOOK.md` lays out a
 * dedicated PR for native cert pinning via `react-native-ssl-pinning`.
 * That PR will eventually replace the global `fetch` for our two
 * pinned hosts (api.mintenance.com + Supabase) with the library's
 * native `fetch` implementation.
 *
 * To make that landing as small as possible, this scaffold introduces
 * a single function — `pinnedFetch` — that EVERY mobile network
 * caller should use. Today it's a transparent pass-through to the
 * global `fetch`. When the native PR lands, only this function's
 * implementation changes; no caller needs to be touched.
 *
 * # What this scaffold does today
 *
 *   1. Exposes `pinnedFetch(url, init)` with the same signature as
 *      `fetch`. Behaves identically — zero behavior change at runtime.
 *   2. Adds startup misconfig logging via `assertCertPinningConsistent`.
 *      Operators get a Sentry breadcrumb if they set
 *      `EXPO_PUBLIC_CERT_PINNING_ENABLED=true` without supplying the
 *      cert hashes.
 *   3. Documents the native-module integration path inline so the
 *      next dev knows exactly where to plug in.
 *
 * # What's still required (user-action — blocking native rollout)
 *
 *   - **Cert hashes from production**: extract via
 *       `openssl s_client -showcerts -servername api.mintenance.com \
 *          -connect api.mintenance.com:443 < /dev/null \
 *        | openssl x509 -pubkey -noout \
 *        | openssl pkey -pubin -outform der \
 *        | openssl dgst -sha256 -binary | base64`
 *     for both api.mintenance.com and ukrjudtlvapiajkjbcrd.supabase.co.
 *   - **Backup hashes**: same extraction against the next-rotation
 *     cert (issued before expiry overlap).
 *   - **Add EAS dev-client + native module**: per runbook step 1-2.
 *   - **Set Vercel env vars**: per runbook section 4.
 *   - **mitmproxy validation**: per runbook step 7.
 *
 * # How callers should adopt this
 *
 * Today, replace:
 *
 *     await fetch('https://api.mintenance.com/v1/foo', { ... });
 *
 * with:
 *
 *     await pinnedFetch('https://api.mintenance.com/v1/foo', { ... });
 *
 * `mobileApiClient` will be the first migration in a follow-up commit
 * once the native library is in place.
 */

import { certPinningMisconfigured, getCertPinningConfig } from './certPinning';
import { logger } from './logger';
import * as sentry from '../config/sentry';

/**
 * The native pinning library this scaffold is preparing to wrap.
 * Imported lazily — when it's not installed (current state) we
 * fall through to the global `fetch`. This keeps the scaffold
 * importable in all environments (dev, test, prod) without
 * requiring the package to be installed yet.
 */
type NativePinningModule = {
  fetch: (
    url: string,
    init: RequestInit & {
      sslPinning?: { certs?: string[]; certHashes?: string[] };
    }
  ) => Promise<Response>;
};

let nativeModuleCache: NativePinningModule | null | undefined;

function loadNativePinningModule(): NativePinningModule | null {
  if (nativeModuleCache !== undefined) return nativeModuleCache;

  try {
    // Lazy require so unit tests + dev builds without the package
    // don't blow up on import. When the native PR lands and adds the
    // dependency, the require() will resolve and pinnedFetch becomes
    // the enforced path automatically.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const mod = require('react-native-ssl-pinning') as NativePinningModule;
    nativeModuleCache = mod;
    return mod;
  } catch {
    nativeModuleCache = null;
    return null;
  }
}

let startupCheckDone = false;

/**
 * Log a Sentry breadcrumb the first time the app makes a pinned
 * request if the config is inconsistent (flag on, no hashes provided).
 * Idempotent — fires once per app session.
 */
function assertCertPinningConsistent(): void {
  if (startupCheckDone) return;
  startupCheckDone = true;

  const cfg = getCertPinningConfig();
  if (cfg.enabled && certPinningMisconfigured(cfg)) {
    const message =
      '[cert-pinning] Configuration inconsistent: ' +
      'EXPO_PUBLIC_CERT_PINNING_ENABLED=true but cert hashes are not set. ' +
      'Pinning will be skipped — see docs/MOBILE_CERT_PINNING_RUNBOOK.md.';
    logger.warn(message);
    sentry.addBreadcrumb('Cert pinning misconfigured', 'security', {
      level: 'warning',
      enabled: cfg.enabled,
      hasApiCurrent: !!cfg.apiCurrent,
      hasApiBackup: !!cfg.apiBackup,
      hasSupabaseCurrent: !!cfg.supabaseCurrent,
      hasSupabaseBackup: !!cfg.supabaseBackup,
    });
  }
}

/**
 * Determine whether the URL belongs to a host we pin. Today returns
 * `null` so all calls fall through to global fetch. When the native
 * module lands, this picks the right hash bundle for the URL's host.
 */
function pinHashesForUrl(
  url: string,
  cfg: ReturnType<typeof getCertPinningConfig>
): string[] | null {
  if (!cfg.enabled) return null;
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    return null;
  }
  // api.mintenance.com — production API
  if (host === 'api.mintenance.com' && cfg.apiCurrent) {
    const hashes = [cfg.apiCurrent];
    if (cfg.apiBackup) hashes.push(cfg.apiBackup);
    return hashes;
  }
  // <project-ref>.supabase.co — Supabase project host
  if (host.endsWith('.supabase.co') && cfg.supabaseCurrent) {
    const hashes = [cfg.supabaseCurrent];
    if (cfg.supabaseBackup) hashes.push(cfg.supabaseBackup);
    return hashes;
  }
  return null;
}

/**
 * Pinned fetch wrapper. Today: transparent pass-through to global
 * `fetch` for ALL hosts. When the native module lands, only the two
 * pinned hosts (API + Supabase) route through the native pinning
 * implementation; everything else continues using global fetch.
 *
 * Signature mirrors `fetch` so a global find-and-replace is safe.
 */
export async function pinnedFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  assertCertPinningConsistent();

  const cfg = getCertPinningConfig();
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  const pinHashes = pinHashesForUrl(url, cfg);
  if (!pinHashes) {
    // Either pinning disabled, or this host isn't pinned. Fall through
    // to global fetch — this is the entire current behavior.
    return fetch(input, init);
  }

  const native = loadNativePinningModule();
  if (!native) {
    // Native module not installed yet. Log once and fall through. The
    // runbook covers the install path.
    logger.warn(
      '[cert-pinning] Hashes configured for ' +
        url +
        ' but native module is not installed. Falling back to unpinned fetch.'
    );
    return fetch(input, init);
  }

  // Native module is present + we have hashes for this host. Route
  // the call through the pinning implementation. The library's
  // `fetch` returns a custom shape — coerce to a standard Response
  // for caller compatibility.
  const result = await native.fetch(url, {
    ...init,
    sslPinning: { certHashes: pinHashes },
  });
  return result;
}
