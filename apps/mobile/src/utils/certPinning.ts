/**
 * Sprint 7 (4.1): TLS certificate pinning scaffolding.
 *
 * This module is the JS-level read-through for the cert pinning config
 * that the forthcoming `react-native-ssl-pinning` native module will
 * consume. Shipping it now means:
 *
 *   - The feature-flag + env-var surface is already in place, so the
 *     dedicated native PR only has to add the plugin + wrap fetch calls.
 *   - Operators can set the env vars in staging today without waiting
 *     for the native code.
 *   - Callers that want to branch on "are we pinned?" have a stable API.
 *
 * Full implementation lives in docs/MOBILE_CERT_PINNING_RUNBOOK.md.
 * Tracks MSV-P1-7.
 */

export interface CertPinningConfig {
  /** Pinning is enabled for production builds. Dev = pinning off for DX. */
  enabled: boolean;
  /** Current primary API host pin (SPKI SHA-256 base64). Ignored when disabled. */
  apiCurrent: string | null;
  /** Next-rotation API host pin, staged ahead of the cert swap. */
  apiBackup: string | null;
  /** Current Supabase REST / Storage host pin. */
  supabaseCurrent: string | null;
  /** Next-rotation Supabase pin. */
  supabaseBackup: string | null;
}

export function getCertPinningConfig(): CertPinningConfig {
  const flag = process.env.EXPO_PUBLIC_CERT_PINNING_ENABLED;
  const enabled = flag === 'true' || flag === '1';
  return {
    enabled,
    apiCurrent: envOrNull('EXPO_PUBLIC_API_CERT_HASH'),
    apiBackup: envOrNull('EXPO_PUBLIC_API_CERT_HASH_BACKUP'),
    supabaseCurrent: envOrNull('EXPO_PUBLIC_SUPABASE_CERT_HASH'),
    supabaseBackup: envOrNull('EXPO_PUBLIC_SUPABASE_CERT_HASH_BACKUP'),
  };
}

/**
 * Convenience guard for callers that want to fail closed when pinning is
 * misconfigured in a production build (no pins provided but flag is on).
 * The native module fail-closed is the enforcement layer; this is just
 * a UX-facing signal.
 */
export function certPinningMisconfigured(cfg: CertPinningConfig): boolean {
  if (!cfg.enabled) return false;
  return !cfg.apiCurrent || !cfg.supabaseCurrent;
}

function envOrNull(key: string): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = (process.env as any)[key];
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}
