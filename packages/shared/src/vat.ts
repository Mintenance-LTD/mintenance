/**
 * UK VAT — single source of truth for VAT rates and computation, shared by web
 * and mobile so every quote/invoice agrees (2026-08-05, UK market readiness).
 *
 * Replaces the hardcoded `0.2` / "20%" scattered across quote + invoice flows.
 * UK VAT is not a single rate: construction has a 5% reduced rate (certain
 * residential conversions, energy-saving materials) and 0% (new build); many
 * supplies are exempt. A contractor who is not VAT-registered may not charge
 * VAT at all.
 *
 * NOTE (domestic reverse charge, NOT implemented): the VAT domestic reverse
 * charge for building and construction services applies to VAT-registered
 * contractor-to-contractor supplies (CIS-covered work) — the CUSTOMER accounts
 * for the VAT, the supplier charges none and states so on the invoice. Our
 * quote/invoice flows are contractor→homeowner (end consumer), which is NOT in
 * scope for the reverse charge. If contractor→contractor (sub-to-main) billing
 * is ever added, this module is where a `reverseCharge` code would live. See
 * the reverse-charge scoping note in the Task 3 summary.
 */

export type VatRateCode = 'standard' | 'reduced' | 'zero' | 'exempt';

export interface VatRate {
  code: VatRateCode;
  /** Human-readable label for selectors. */
  label: string;
  /** Rate as a fraction (0.20 = 20%). `exempt` and `zero` both charge £0. */
  fraction: number;
}

/** UK VAT rates. `zero` and `exempt` both yield £0 VAT but are legally distinct. */
export const UK_VAT_RATES: Record<VatRateCode, VatRate> = {
  standard: { code: 'standard', label: 'Standard rate (20%)', fraction: 0.2 },
  reduced: { code: 'reduced', label: 'Reduced rate (5%)', fraction: 0.05 },
  zero: { code: 'zero', label: 'Zero rate (0%)', fraction: 0 },
  exempt: { code: 'exempt', label: 'Exempt from VAT', fraction: 0 },
};

/** Order for rendering a VAT selector. */
export const VAT_RATE_CODES: VatRateCode[] = [
  'standard',
  'reduced',
  'zero',
  'exempt',
];

/** Default rate a VAT-registered contractor charges unless they pick another. */
export const DEFAULT_VAT_RATE_CODE: VatRateCode = 'standard';

/** VAT rate as a fraction (0.20). Unknown codes → 0. */
export function vatRateFraction(code: VatRateCode | null | undefined): number {
  return code ? (UK_VAT_RATES[code]?.fraction ?? 0) : 0;
}

/** VAT rate as a percentage (20). Persist this on quote/invoice rows. */
export function vatRatePercent(code: VatRateCode | null | undefined): number {
  return vatRateFraction(code) * 100;
}

/** VAT due on a net amount for the given rate, rounded to pence. */
export function computeVat(
  netAmount: number,
  code: VatRateCode | null | undefined
): number {
  return Math.round(netAmount * vatRateFraction(code) * 100) / 100;
}

/**
 * The VAT code a contractor should DEFAULT to. A non-registered contractor
 * cannot charge VAT, so they default (and are locked) to `exempt`. A registered
 * contractor defaults to the standard rate but may pick reduced/zero/exempt
 * per the work.
 */
export function defaultVatCodeForContractor(
  vatRegistered: boolean
): VatRateCode {
  return vatRegistered ? DEFAULT_VAT_RATE_CODE : 'exempt';
}

/** Whether a code actually charges VAT (used to gate "VAT-bearing" quotes). */
export function isVatBearing(code: VatRateCode | null | undefined): boolean {
  return vatRateFraction(code) > 0;
}
