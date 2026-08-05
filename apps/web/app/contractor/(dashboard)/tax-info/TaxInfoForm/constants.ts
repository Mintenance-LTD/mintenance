// UK tax-identity client-side validation patterns. These mirror the server
// schema in lib/services/tax/uk-tax.ts — the server remains the source of
// truth; these only give fast inline feedback before the form is submitted.

/** Unique Taxpayer Reference: exactly 10 digits. */
export const UTR_REGEX = /^\d{10}$/;

/**
 * National Insurance number. Two prefix letters, six digits, one suffix A–D.
 * Case-insensitive; spaces are stripped before matching.
 */
export const NINO_REGEX =
  /^(?!BG|GB|NK|KN|TN|NT|ZZ)[ABCEGHJ-PRSTW-Z][ABCEGHJ-NPRSTW-Z]\d{6}[A-D]$/i;

/** UK VAT number: 9 or 12 digits, optionally prefixed "GB". */
export const VAT_NUMBER_REGEX = /^(GB)?(\d{9}|\d{12})$/i;

/** Companies House number: 8 digits, or 2 letters + 6 digits. */
export const COMPANY_NUMBER_REGEX = /^(\d{8}|[A-Z]{2}\d{6})$/i;

/** UK postcode (loose, canonical format). */
export const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;
