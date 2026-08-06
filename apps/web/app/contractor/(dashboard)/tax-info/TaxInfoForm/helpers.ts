import {
  UTR_REGEX,
  NINO_REGEX,
  VAT_NUMBER_REGEX,
  COMPANY_NUMBER_REGEX,
  UK_POSTCODE_REGEX,
} from './constants';

/** Strip whitespace and upper-case — the canonical form NINO/VAT/company/postcode compare against. */
export function normalise(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

/** Validate a Unique Taxpayer Reference (10 digits). */
export function isValidUtr(utr: string): boolean {
  return UTR_REGEX.test(utr.replace(/\s+/g, ''));
}

/** Validate a National Insurance number. */
export function isValidNino(nino: string): boolean {
  return NINO_REGEX.test(normalise(nino));
}

/** Validate a UK VAT number (with or without the GB prefix). */
export function isValidVatNumber(vat: string): boolean {
  return VAT_NUMBER_REGEX.test(normalise(vat));
}

/** Validate a Companies House number. */
export function isValidCompanyNumber(num: string): boolean {
  return COMPANY_NUMBER_REGEX.test(normalise(num));
}

/** Validate a UK postcode. */
export function isValidPostcode(postcode: string): boolean {
  return UK_POSTCODE_REGEX.test(postcode.trim());
}

/** Validate an ISO date of birth (YYYY-MM-DD); age must be between 16 and 120. */
export function isValidDateOfBirth(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const age = (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return age >= 16 && age <= 120;
}
