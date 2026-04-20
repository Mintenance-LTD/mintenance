/**
 * Pure helpers + static data for ContractorVerificationScreen.
 *
 * Extracted 2026-04-20 (Phase 2.5) to keep the screen file under
 * the 500-line pre-commit gate after the credential_verifications
 * dual-write + DateTimePicker additions landed.
 *
 * No React, no navigation, no state — safe to unit-test in isolation
 * and reuse from an admin-side review screen if one ever ships.
 */

export type LicenseType = 'trade' | 'gas_safe' | 'electrical' | 'other';

export interface VerificationData {
  companyName: string;
  businessAddress: string;
  licenseNumber: string;
  licenseType: LicenseType;
  /** Parsed expiry Date, or null when not set. */
  licenseExpiry: Date | null;
}

/**
 * Shape of the SELECT we issue against `profiles`. Kept local because
 * this screen doesn't depend on a generated Database type yet.
 */
export interface ProfileRow {
  company_name: string | null;
  business_address: string | null;
  license_number: string | null;
  license_type: string | null;
  license_expiry: string | null;
  verification_status: string | null;
}

export const INITIAL_FORM: VerificationData = {
  companyName: '',
  businessAddress: '',
  licenseNumber: '',
  licenseType: 'trade',
  licenseExpiry: null,
};

export const LICENSE_TYPE_OPTIONS: ReadonlyArray<{
  value: LicenseType;
  label: string;
}> = [
  { value: 'trade', label: 'Trade License' },
  { value: 'gas_safe', label: 'Gas Safe' },
  { value: 'electrical', label: 'Electrical License' },
  { value: 'other', label: 'Other' },
];

export const VERIFICATION_BENEFITS = [
  'Show up on homeowner map with location pin',
  'Get "Verified" badge on your profile',
  '3x more visibility to homeowners',
  'Priority in search results',
  'Build trust with potential clients',
];

/**
 * Parse the legacy free-text license_expiry value persisted in
 * profiles. Accepts YYYY-MM-DD, ISO timestamps, or DD/MM/YYYY.
 * Returns null for anything we cannot confidently parse.
 */
export function parseLegacyExpiry(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) return new Date(iso);

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (match) {
    const [, dd, mm, yyyy] = match;
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatExpiryForDisplay(d: Date | null): string {
  if (!d) return 'Not set';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** YYYY-MM-DD — safe to persist to TEXT + parse by Postgres DATE. */
export function formatExpiryForPersistence(d: Date | null): string | null {
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
