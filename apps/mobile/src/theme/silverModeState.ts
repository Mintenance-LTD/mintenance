/**
 * Silver-mode state — isolated to avoid circular imports between
 * theme/index.ts and the hook consumers. R3 #5a of
 * docs/RETENTION_ROADMAP_2026.md.
 *
 * The value is bridged from AsyncStorage → Supabase profiles.settings
 * by useSilverMode() (see src/hooks/useSilverMode.ts). Theme code that
 * wants to scale fonts reads `isSilverMode()` + multiplies by
 * `SILVER_SCALE`.
 */

export const SILVER_SCALE = 1.35;

let _isSilver = false;
const listeners = new Set<(v: boolean) => void>();

export function setSilverModeEnabled(v: boolean) {
  if (_isSilver === v) return;
  _isSilver = v;
  listeners.forEach((l) => l(v));
}

export function isSilverMode(): boolean {
  return _isSilver;
}

export function subscribeSilverMode(cb: (v: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function silverFontSize(base: number): number {
  return _isSilver ? Math.round(base * SILVER_SCALE) : base;
}
