import type { TinType } from './types';

/** Format a raw TIN string into XXX-XX-XXXX (SSN) or XX-XXXXXXX (EIN) for display, masking all but last 4. */
export function maskTin(raw: string, type: TinType): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (type === 'ssn') {
    // Show ***-**-XXXX
    if (digits.length <= 5) return '*'.repeat(digits.length);
    return `***-**-${digits.slice(5, 9)}`;
  }
  // EIN: **-***XXXX
  if (digits.length <= 5) return '*'.repeat(digits.length);
  return `**-***${digits.slice(5, 9)}`;
}

/** Strip non-digits from a TIN input and cap at 9 digits. */
export function sanitizeTin(value: string): string {
  return value.replace(/\D/g, '').slice(0, 9);
}

/** Validate US ZIP code (5 digits or 5+4). */
export function isValidZip(zip: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zip);
}
