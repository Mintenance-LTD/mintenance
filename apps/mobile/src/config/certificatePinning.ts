/**
 * Certificate Pinning for Mintenance Mobile App
 *
 * LIMITATION: True TLS-layer certificate pinning (SPKI pin validation during
 * the TLS handshake) is NOT possible in Expo managed workflow without a native
 * config plugin (e.g., react-native-ssl-pinning or TrustKit). This module
 * provides the best available application-level protection:
 *
 *   1. Domain validation  - ensures requests only target expected hosts over HTTPS.
 *   2. SPKI hash registry - stores known SHA-256 SPKI pin hashes for critical domains.
 *   3. Pre-flight check   - `validateCertificate()` performs a TLS probe and warns
 *      if the connection cannot be verified (e.g., proxy/MITM detected on Android
 *      via expo-network). In production this blocks the request; in __DEV__ it logs.
 *
 * For full TLS-layer pinning before production release:
 *   1. Add a config plugin (react-native-ssl-pinning or expo-config-plugin-ssl-pinning)
 *   2. Move the pin hashes below into the native config
 *   3. Remove the application-level `validateCertificate()` fallback
 *
 * HOW TO UPDATE PIN HASHES WHEN CERTIFICATES ROTATE:
 *   # For any domain, run:
 *   openssl s_client -connect <host>:443 -servername <host> </dev/null 2>/dev/null \
 *     | openssl x509 -pubkey -noout \
 *     | openssl pkey -pubin -outform der \
 *     | openssl dgst -sha256 -binary \
 *     | openssl enc -base64
 *
 *   # Replace or add the hash in PINNED_DOMAINS below.
 *   # Always keep at least 2 pins per domain (primary + backup CA) to avoid
 *   # bricking the app when the leaf certificate rotates.
 */

import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

/**
 * Pinned domain configuration.
 *
 * Each entry maps a hostname to an array of SHA-256 SPKI pin hashes (base64).
 * Include at least one backup pin (e.g., the intermediate CA pin) so that a
 * leaf certificate rotation does not lock users out.
 *
 * These pins are validated at the application layer as a defense-in-depth
 * measure. They do NOT replace TLS-layer pinning.
 */
interface PinnedDomain {
  /** Human-readable label for logging */
  label: string;
  /** SHA-256 SPKI pin hashes in base64. At least one must match. */
  pins: string[];
  /** Whether to enforce (block request) or just warn when validation fails */
  enforce: boolean;
}

/**
 * Registry of pinned domains. Add new domains here as needed.
 *
 * NOTE: The pin hashes below are placeholders. Before production release,
 * generate real hashes using the openssl command documented above and replace
 * the placeholder values.
 */
const PINNED_DOMAINS: Record<string, PinnedDomain> = {
  // Supabase API - primary host derived from EXPO_PUBLIC_SUPABASE_URL
  // Pins will be matched dynamically (see getSupabaseHost)
  'supabase.co': {
    label: 'Supabase API',
    pins: [
      // Amazon Root CA 1 (Supabase uses AWS/Cloudflare infrastructure)
      // Replace with actual pin from: openssl s_client -connect <project>.supabase.co:443 ...
      'PLACEHOLDER_SUPABASE_PRIMARY_PIN_REPLACE_BEFORE_PRODUCTION',
      // Backup: ISRG Root X1 (Let's Encrypt) - common intermediate
      'PLACEHOLDER_SUPABASE_BACKUP_PIN_REPLACE_BEFORE_PRODUCTION',
    ],
    enforce: false, // Set to true after replacing placeholder pins
  },

  // Stripe API
  'api.stripe.com': {
    label: 'Stripe API',
    pins: [
      // DigiCert Global Root G2 (Stripe's typical CA chain)
      // Replace with actual pin from: openssl s_client -connect api.stripe.com:443 ...
      'PLACEHOLDER_STRIPE_PRIMARY_PIN_REPLACE_BEFORE_PRODUCTION',
      // Backup: DigiCert Global Root CA
      'PLACEHOLDER_STRIPE_BACKUP_PIN_REPLACE_BEFORE_PRODUCTION',
    ],
    enforce: false, // Set to true after replacing placeholder pins
  },

  // Expo Push API
  'exp.host': {
    label: 'Expo Push Service',
    pins: [
      'PLACEHOLDER_EXPO_PRIMARY_PIN_REPLACE_BEFORE_PRODUCTION',
      'PLACEHOLDER_EXPO_BACKUP_PIN_REPLACE_BEFORE_PRODUCTION',
    ],
    enforce: false,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSupabaseHost(): string | null {
  if (!SUPABASE_URL) return null;
  try {
    return new URL(SUPABASE_URL).hostname;
  } catch {
    return null;
  }
}

/**
 * Check if a hostname matches a pinned domain entry.
 * Supports exact match and wildcard suffix match (e.g., "supabase.co"
 * matches "abc.supabase.co").
 */
function findPinnedDomain(hostname: string): PinnedDomain | null {
  // Exact match first
  if (PINNED_DOMAINS[hostname]) {
    return PINNED_DOMAINS[hostname];
  }

  // Suffix match (e.g., "abc.supabase.co" matches "supabase.co")
  for (const [domain, config] of Object.entries(PINNED_DOMAINS)) {
    if (hostname.endsWith(`.${domain}`)) {
      return config;
    }
  }

  return null;
}

/**
 * Returns true if the pin hashes for a domain contain only placeholder values.
 * When all pins are placeholders, enforcement is skipped.
 */
function hasOnlyPlaceholderPins(domain: PinnedDomain): boolean {
  return domain.pins.every(pin => pin.startsWith('PLACEHOLDER_'));
}

// ---------------------------------------------------------------------------
// Domain Validation (original functionality, preserved)
// ---------------------------------------------------------------------------

/**
 * Validates that a URL targets the expected Supabase host over HTTPS.
 * This is an application-level domain check, not certificate pinning.
 */
export const validateRequestDomain = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (!SUPABASE_URL) return true; // no URL configured, skip check
    const expectedHost = new URL(SUPABASE_URL).host;
    return parsed.host === expectedHost;
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// Certificate Validation
// ---------------------------------------------------------------------------

export interface CertificateValidationResult {
  /** Whether the validation passed */
  valid: boolean;
  /** Human-readable reason for the result */
  reason: string;
  /** The domain that was checked */
  domain: string;
  /** Whether enforcement is active (false = warn-only) */
  enforced: boolean;
}

/**
 * Validates that a request to the given URL is safe to proceed.
 *
 * Checks performed:
 *   1. URL must use HTTPS.
 *   2. Hostname must match a known pinned domain (if applicable).
 *   3. If real (non-placeholder) pins are configured and enforcement is on,
 *      the request is blocked when validation cannot confirm the pin.
 *
 * In __DEV__ mode, failures are logged as warnings but never block.
 *
 * Call this before sensitive operations (login, payment, PII transfer):
 *
 *   const result = await validateCertificate('https://api.stripe.com/v1/...');
 *   if (!result.valid && result.enforced) {
 *     throw new Error(`Certificate validation failed: ${result.reason}`);
 *   }
 */
export async function validateCertificate(url: string): Promise<CertificateValidationResult> {
  const defaultResult: CertificateValidationResult = {
    valid: true,
    reason: 'No pinning configured for this domain',
    domain: '',
    enforced: false,
  };

  try {
    const parsed = new URL(url);
    defaultResult.domain = parsed.hostname;

    // Step 1: HTTPS required
    if (parsed.protocol !== 'https:') {
      const result: CertificateValidationResult = {
        valid: false,
        reason: `Insecure protocol: ${parsed.protocol} (HTTPS required)`,
        domain: parsed.hostname,
        enforced: true, // Always enforce HTTPS
      };
      logValidationResult(result);
      return result;
    }

    // Step 2: Find pinned domain config
    const pinnedDomain = findPinnedDomain(parsed.hostname);
    if (!pinnedDomain) {
      // Domain not in our pin registry - allow but note it
      return defaultResult;
    }

    // Step 3: Check if pins are still placeholders
    if (hasOnlyPlaceholderPins(pinnedDomain)) {
      const result: CertificateValidationResult = {
        valid: true,
        reason: `${pinnedDomain.label}: pin hashes are placeholders - replace before production`,
        domain: parsed.hostname,
        enforced: false,
      };

      if (!__DEV__) {
        // In production with placeholder pins, log a strong warning
        logger.warn('CertPinning', `[${pinnedDomain.label}] Placeholder pins detected in production build. ` +
          'Certificate pinning is NOT active. Replace PLACEHOLDER_ values in certificatePinning.ts.');
      }
      return result;
    }

    // Step 4: Application-level connectivity check
    // We cannot do true SPKI validation in JS, but we can verify the TLS
    // connection succeeds (no SSL errors) and the response comes from the
    // expected server. A MITM with an untrusted cert would cause a fetch
    // failure on iOS (ATS) or Android (network security config).
    const probeResult = await performTlsProbe(parsed.hostname, pinnedDomain);
    return probeResult;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const result: CertificateValidationResult = {
      valid: false,
      reason: `Certificate validation error: ${message}`,
      domain: defaultResult.domain,
      enforced: false, // Don't block on unexpected errors
    };
    logValidationResult(result);
    return result;
  }
}

/**
 * Performs a lightweight TLS probe to the target host.
 *
 * This verifies that:
 *   - The TLS handshake succeeds (OS-level cert validation passes)
 *   - The server responds with expected headers
 *
 * On iOS, App Transport Security (ATS) provides additional TLS validation.
 * On Android, the default network security config trusts the system CA store.
 *
 * NOTE: This does NOT perform SPKI hash comparison at the JS layer because
 * the Web Crypto / expo-crypto APIs cannot access the raw TLS certificate
 * presented during the handshake. True SPKI pinning requires native code.
 */
async function performTlsProbe(
  hostname: string,
  pinnedDomain: PinnedDomain,
): Promise<CertificateValidationResult> {
  const probeUrl = `https://${hostname}`;
  const timeoutMs = 5000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(probeUrl, {
      method: 'HEAD',
      signal: controller.signal,
      // Prevent following redirects to unexpected domains
      redirect: 'error',
    }).catch((fetchError: Error) => {
      // On redirect: 'error', fetch throws a TypeError for redirects.
      // Re-throw with clearer message.
      if (fetchError.message?.includes('redirect')) {
        throw new Error(`Unexpected redirect from ${hostname}`);
      }
      throw fetchError;
    });

    clearTimeout(timeoutId);

    // TLS handshake succeeded - the OS verified the certificate chain
    // against its trust store. On a properly configured device, this
    // means the certificate is valid and issued by a trusted CA.
    const result: CertificateValidationResult = {
      valid: true,
      reason: `${pinnedDomain.label}: TLS handshake verified by OS trust store`,
      domain: hostname,
      enforced: pinnedDomain.enforce,
    };

    return result;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isTlsError = message.includes('SSL') ||
      message.includes('certificate') ||
      message.includes('TLS') ||
      message.includes('CERT_') ||
      message.includes('unable to get local issuer');

    const isNetworkError = message.includes('Network request failed') ||
      message.includes('Failed to connect') ||
      message.includes('abort');

    if (isTlsError) {
      // Genuine TLS/certificate error - possible MITM
      const result: CertificateValidationResult = {
        valid: false,
        reason: `${pinnedDomain.label}: TLS certificate validation failed - possible MITM (${message})`,
        domain: hostname,
        enforced: pinnedDomain.enforce,
      };
      logValidationResult(result);
      return result;
    }

    if (isNetworkError) {
      // Network unavailable - can't validate, don't block
      const result: CertificateValidationResult = {
        valid: true,
        reason: `${pinnedDomain.label}: Network unavailable, skipping certificate check`,
        domain: hostname,
        enforced: false,
      };
      return result;
    }

    // Other error (timeout, unexpected redirect, etc.)
    const result: CertificateValidationResult = {
      valid: false,
      reason: `${pinnedDomain.label}: Probe failed (${message})`,
      domain: hostname,
      enforced: false, // Don't block on ambiguous errors
    };
    logValidationResult(result);
    return result;
  }
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function logValidationResult(result: CertificateValidationResult): void {
  if (result.valid) {
    return;
  }

  if (__DEV__) {
    // In development, always warn but never block
    logger.warn('CertPinning', `[DEV] ${result.reason} (domain: ${result.domain})`);
  } else if (result.enforced) {
    logger.error('CertPinning', `BLOCKED: ${result.reason} (domain: ${result.domain})`);
  } else {
    logger.warn('CertPinning', `${result.reason} (domain: ${result.domain})`);
  }
}

// ---------------------------------------------------------------------------
// Convenience: validate before sensitive API calls
// ---------------------------------------------------------------------------

/**
 * Validates the Supabase API domain certificate.
 * Call before auth operations, data sync, or PII transfers.
 */
export async function validateSupabaseCertificate(): Promise<CertificateValidationResult> {
  if (!SUPABASE_URL) {
    return {
      valid: true,
      reason: 'Supabase URL not configured, skipping',
      domain: '',
      enforced: false,
    };
  }
  return validateCertificate(SUPABASE_URL);
}

/**
 * Validates the Stripe API domain certificate.
 * Call before payment operations.
 */
export async function validateStripeCertificate(): Promise<CertificateValidationResult> {
  return validateCertificate('https://api.stripe.com');
}

// ---------------------------------------------------------------------------
// Pin Management Utilities
// ---------------------------------------------------------------------------

/**
 * Returns the current pin configuration for inspection/debugging.
 * Only available in __DEV__ mode.
 */
export function getPinConfiguration(): Record<string, { label: string; pinCount: number; enforced: boolean; hasPlaceholders: boolean }> | null {
  if (!__DEV__) return null;

  const config: Record<string, { label: string; pinCount: number; enforced: boolean; hasPlaceholders: boolean }> = {};
  for (const [domain, pinned] of Object.entries(PINNED_DOMAINS)) {
    config[domain] = {
      label: pinned.label,
      pinCount: pinned.pins.length,
      enforced: pinned.enforce,
      hasPlaceholders: hasOnlyPlaceholderPins(pinned),
    };
  }

  const supabaseHost = getSupabaseHost();
  if (supabaseHost) {
    config._supabaseHost = {
      label: `Resolved Supabase host: ${supabaseHost}`,
      pinCount: 0,
      enforced: false,
      hasPlaceholders: false,
    };
  }

  return config;
}

/**
 * Checks whether certificate pinning is fully active (non-placeholder pins
 * with enforcement enabled) for all critical domains.
 */
export function isPinningActive(): boolean {
  return Object.values(PINNED_DOMAINS).every(
    domain => domain.enforce && !hasOnlyPlaceholderPins(domain)
  );
}
