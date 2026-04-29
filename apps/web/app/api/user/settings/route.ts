/**
 * GET/PATCH /api/user/settings — DEPRECATED legacy alias.
 *
 * Audit step 8 (2026-04-29) consolidated the user-settings routes.
 * The canonical URL is `/api/users/settings` (plural) and lives in
 * `_shared/user-settings-handlers.ts`. This file is kept alive so
 * mobile builds in the wild that hit the singular path keep
 * working — once the older mobile build's expiry passes (90 days
 * post-release as a safe default), delete this directory.
 *
 * Also handles R3 #5a Silver mode toggle calls from
 * `apps/mobile/src/hooks/useSilverMode.ts` (now updated to call
 * the canonical URL but legacy installs may still be on this one).
 */
export {
  userSettingsGet as GET,
  userSettingsPatch as PATCH,
} from '@/app/api/_shared/user-settings-handlers';
