/**
 * NOTE: True TLS certificate pinning requires a native module
 * (e.g., react-native-ssl-pinning or TrustKit via an Expo config plugin).
 * This module provides application-level domain validation only —
 * it verifies that requests target the expected Supabase host over HTTPS,
 * but does NOT perform SHA-256 public key pinning at the TLS layer.
 *
 * Before production release, evaluate adding native TLS pinning:
 *   1. Obtain your Supabase project's certificate pin hash:
 *      openssl s_client -connect <project>.supabase.co:443 | \
 *        openssl x509 -pubkey -noout | \
 *        openssl pkey -pubin -outform der | \
 *        openssl dgst -sha256 -binary | openssl enc -base64
 *   2. Integrate react-native-ssl-pinning or TrustKit
 *   3. Configure pins in the native module (not here)
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

/**
 * Validates that a URL targets the expected Supabase host over HTTPS.
 * This is NOT certificate pinning — it is an application-level domain check.
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
