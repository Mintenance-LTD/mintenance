/**
 * Canonical 4-tier severity scale for Mintenance AI assessments.
 *
 * Aligned with UK landlord compliance urgency. Both web and mobile import
 * the type and normalizer from here so legacy stored assessments (with older
 * tiers like `midway`, `full`, `critical`, `moderate`) still map correctly
 * to the canonical tiers at render time.
 *
 * Tiers:
 *   - early       → cosmetic/minor, routine maintenance
 *   - developing  → progressing, attention within weeks
 *   - significant → serious, risk of spread
 *   - dangerous   → structural/safety risk, urgent repair required
 */
export type SeverityTier = 'early' | 'developing' | 'significant' | 'dangerous';

/**
 * Normalize any severity value (legacy or new) to the canonical 4-tier scale.
 *
 * Mapping:
 *   early / minimal / minor / low              → early
 *   developing / midway / moderate / medium    → developing
 *   significant / severe / high                → significant
 *   dangerous / full / critical / structural   → dangerous
 *   anything else                              → developing (default)
 */
export function normalizeSeverity(severity: unknown): SeverityTier {
  if (
    severity === 'early' ||
    severity === 'developing' ||
    severity === 'significant' ||
    severity === 'dangerous'
  ) {
    return severity;
  }

  if (severity === 'midway') return 'developing';
  if (severity === 'full') return 'dangerous';

  const s = String(severity ?? '').toLowerCase();
  if (
    s.includes('early') ||
    s.includes('minimal') ||
    s.includes('minor') ||
    s === 'low'
  ) {
    return 'early';
  }
  if (s.includes('significant') || s.includes('severe') || s === 'high') {
    return 'significant';
  }
  if (
    s.includes('dangerous') ||
    s.includes('critical') ||
    s.includes('structural') ||
    s === 'full'
  ) {
    return 'dangerous';
  }
  return 'developing';
}
