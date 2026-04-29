/**
 * GET/PATCH /api/users/settings — canonical user-settings endpoint.
 *
 * Read/write the authenticated user's `profiles.settings` JSONB.
 * Handler logic lives in `_shared/user-settings-handlers.ts` so the
 * legacy alias `/api/user/settings` (singular) can re-export it
 * without code drift. Audit step 8 (2026-04-29).
 */
export {
  userSettingsGet as GET,
  userSettingsPatch as PATCH,
} from '@/app/api/_shared/user-settings-handlers';
