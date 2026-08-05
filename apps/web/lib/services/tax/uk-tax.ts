/**
 * UK tax helpers — tax-year maths, identity validation, and encryption of
 * special-category-adjacent identifiers (DOB, UTR, NINO).
 *
 * Replaces the former US tax surface (Task 2, UK market readiness).
 *
 * Encryption matches the canonical field-encryption module used for other
 * sensitive columns (totp_secret etc.): AES-256-GCM EncryptedField envelope,
 * stored as jsonb. These values must NEVER be logged and are revoked from the
 * `authenticated` client role at the DB layer (service-role read + decrypt).
 */
import {
  encryptField,
  decryptField,
  type EncryptedField,
} from '@/lib/encryption/field-encryption';

// ── UK tax year (6 April – 5 April) ─────────────────────────────────────

/**
 * The UK tax year runs 6 April → 5 April. `2025` denotes the year the tax
 * year STARTS, i.e. 6 Apr 2025 – 5 Apr 2026, labelled "2025-26".
 */
export interface UKTaxYear {
  /** Calendar year the tax year starts in (e.g. 2025 for 2025-26). */
  startYear: number;
  /** Inclusive start — 6 April `startYear` (UTC midnight). */
  start: Date;
  /** Inclusive end — 5 April `startYear + 1` (end of day UTC). */
  end: Date;
  /** HMRC-style label, e.g. "2025-26". */
  label: string;
}

/** Build a UKTaxYear from the calendar year it starts in. */
export function ukTaxYearFromStartYear(startYear: number): UKTaxYear {
  // 6 April startYear 00:00:00 UTC → 5 April (startYear+1) 23:59:59.999 UTC.
  const start = new Date(Date.UTC(startYear, 3, 6, 0, 0, 0, 0));
  const end = new Date(Date.UTC(startYear + 1, 3, 5, 23, 59, 59, 999));
  const label = `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
  return { startYear, start, end, label };
}

/** The UK tax year containing `date`. */
export function ukTaxYearForDate(date: Date): UKTaxYear {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-indexed; April = 3
  const day = date.getUTCDate();
  // On/after 6 April the tax year starts this calendar year; before that it
  // started the previous calendar year.
  const startYear = month > 3 || (month === 3 && day >= 6) ? year : year - 1;
  return ukTaxYearFromStartYear(startYear);
}

/**
 * Parse a tax-year label ("2025-26" or the start year "2025") into a UKTaxYear.
 * Returns null if it can't be parsed.
 */
export function parseUKTaxYearLabel(input: string): UKTaxYear | null {
  const trimmed = input.trim();
  const rangeMatch = /^(\d{4})-(\d{2})$/.exec(trimmed);
  if (rangeMatch) {
    return ukTaxYearFromStartYear(Number(rangeMatch[1]));
  }
  const singleMatch = /^(\d{4})$/.exec(trimmed);
  if (singleMatch) {
    return ukTaxYearFromStartYear(Number(singleMatch[1]));
  }
  return null;
}

// ── UK identity validation ──────────────────────────────────────────────

/** UTR: exactly 10 digits (HMRC Unique Taxpayer Reference). */
export const UTR_REGEX = /^\d{10}$/;

/**
 * National Insurance number. Two prefix letters (excluding D, F, I, Q, U, V
 * in either position and O in the second), six digits, one suffix A–D.
 * Case-insensitive; spaces allowed and stripped by the caller.
 */
export const NINO_REGEX =
  /^(?!BG|GB|NK|KN|TN|NT|ZZ)[ABCEGHJ-PRSTW-Z][ABCEGHJ-NPRSTW-Z]\d{6}[A-D]$/i;

/** UK VAT number: 9 or 12 digits, optionally prefixed "GB". */
export const VAT_NUMBER_REGEX = /^(GB)?(\d{9}|\d{12})$/i;

/** Companies House number: 8 chars — 8 digits, or 2 letters + 6 digits. */
export const COMPANY_NUMBER_REGEX = /^(\d{8}|[A-Z]{2}\d{6})$/i;

/** UK postcode (loose, canonical format). */
export const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

// ── Encryption wrappers (context-bound) ─────────────────────────────────

const DOB_CONTEXT = 'user_dob';
const UTR_CONTEXT = 'contractor_utr';
const NINO_CONTEXT = 'contractor_nino';

export function encryptDateOfBirth(isoDate: string): EncryptedField {
  return encryptField(isoDate, DOB_CONTEXT);
}
export function decryptDateOfBirth(field: EncryptedField): string {
  return decryptField(field, DOB_CONTEXT);
}
export function encryptUTR(utr: string): EncryptedField {
  return encryptField(utr, UTR_CONTEXT);
}
export function decryptUTR(field: EncryptedField): string {
  return decryptField(field, UTR_CONTEXT);
}
export function encryptNINO(nino: string): EncryptedField {
  return encryptField(nino, NINO_CONTEXT);
}
export function decryptNINO(field: EncryptedField): string {
  return decryptField(field, NINO_CONTEXT);
}

/** Normalise a NINO for storage/validation: uppercase, no spaces. */
export function normaliseNINO(nino: string): string {
  return nino.replace(/\s+/g, '').toUpperCase();
}

/** Normalise a VAT number: uppercase, no spaces, strip leading "GB". */
export function normaliseVatNumber(vat: string): string {
  return vat.replace(/\s+/g, '').toUpperCase().replace(/^GB/, '');
}
