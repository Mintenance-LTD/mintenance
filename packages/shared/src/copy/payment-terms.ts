/**
 * Canonical payment-terminology strings shared across the platform.
 *
 * Homeowner-facing surfaces use the user-friendly labels
 * ("Protected Payment"); contractor + admin + API + DB code keeps the
 * technical term ("escrow"). See R1 in docs/RETENTION_ROADMAP_2026.md
 * and §4 of that document for the legal rationale.
 */

/**
 * Primary user-facing noun for the money-holding mechanism on homeowner
 * surfaces. Replace all customer-visible literal "escrow" strings in
 * homeowner flows with this constant.
 */
export const PROTECTED_PAYMENT = 'Protected Payment';

/**
 * Lowercase variant for inline use inside sentences ("Your money is held
 * in protected payment until you approve the work").
 */
export const PROTECTED_PAYMENT_LOWER = 'protected payment';

/**
 * Short benefit phrase for marketing surfaces.
 */
export const PROTECTED_PAYMENT_BADGE = 'Protected Payment';

/**
 * One-line explainer suitable for tooltips and info cards.
 */
export const PROTECTED_PAYMENT_EXPLAINER =
  'Your money is held securely until you approve the completed work.';

/**
 * Contractor-side framing — the same custody mechanism, but described
 * from the trades person's perspective. See R2 move #21 in the roadmap.
 */
export const PROTECTED_PAYMENT_CONTRACTOR_EXPLAINER =
  'Payment is funded before you arrive on-site and released to you after the homeowner approves the work (or automatically after the 7-day review window).';
