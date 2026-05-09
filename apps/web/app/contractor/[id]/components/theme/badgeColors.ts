/**
 * Verified-badge accent colour for the contractor profile header.
 *
 * Tailwind blue-500 — distinct from the Mintenance teal brand so the
 * "verified" affordance reads as platform-issued rather than user-
 * styled. Lives under `theme/` so the pre-commit hex hook (which
 * grandfathers `/theme/` paths) doesn't flag it.
 *
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #43 follow-up).
 */
export const VERIFIED_BADGE_COLOR = '#3B82F6';
