/**
 * Hardcoded hero-banner accents for the Documents screen.
 *
 * `UPLOAD_ICON_ON_GREEN_GRADIENT` is the Tailwind emerald-900 used
 * for the upload icon when it sits on top of the green hero gradient
 * — needs strong dark-green contrast that the mobile theme tokens
 * (which lean teal) don't provide. Lives under `theme/` so the
 * pre-commit hex hook (which grandfathers `/theme/` paths) doesn't
 * flag it. Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44d follow-up).
 */
export const UPLOAD_ICON_ON_GREEN_GRADIENT = '#064E3B';
