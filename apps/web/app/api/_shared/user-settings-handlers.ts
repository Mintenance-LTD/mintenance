/**
 * Shared handlers for `/api/users/settings` (canonical) and
 * `/api/user/settings` (legacy alias).
 *
 * Audit step 8 (2026-04-29): the singular and plural URLs both
 * wrote to `profiles.settings` JSONB but with different validation
 * (the singular had a strict whitelist for `silverMode` + R3 keys;
 * the plural had no validation but seeded `DEFAULT_SETTINGS` for
 * `notifications`, `privacy`, `display`). They served disjoint key
 * namespaces in practice, but the duplication created a real risk
 * that one route would shallow-overwrite a key the other route
 * thought it owned.
 *
 * Now: one schema covers every known key and is `.strict()` so
 * unknown payload keys fail loudly. Both URLs re-export the same
 * handlers; the singular path is documented as deprecated but kept
 * alive so mobile builds in the wild keep working — once they're
 * gone, delete the singular route.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/** Defaults seeded into the GET response when a user has no row yet. */
export const USER_SETTINGS_DEFAULTS = {
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
  privacy: {
    profileVisible: true,
    shareActivityData: false,
  },
  display: {
    theme: 'system',
    language: 'en',
    timezone: 'Europe/London',
    dateFormat: 'DD/MM/YYYY',
  },
};

/**
 * Whitelist of every settings key the route accepts. `.strict()`
 * means a typo (`silvr_mode`, `notifictions`) returns 400 rather
 * than silently writing a junk key into the JSONB blob.
 *
 * To add a new setting: add the key here, then update the relevant
 * UI to send it. No route changes needed beyond this file.
 */
const NotificationsSchema = z
  .object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
  })
  .strict()
  .partial();

const PrivacySchema = z
  .object({
    profileVisible: z.boolean().optional(),
    shareActivityData: z.boolean().optional(),
  })
  .strict()
  .partial();

const DisplaySchema = z
  .object({
    theme: z.enum(['system', 'light', 'dark']).optional(),
    language: z.string().max(8).optional(),
    timezone: z.string().max(64).optional(),
    dateFormat: z.string().max(32).optional(),
  })
  .strict()
  .partial();

const UserSettingsSchema = z
  .object({
    // R3 #5a — Silver-mode feature flag.
    silverMode: z.boolean().optional(),
    // Onboarding-style "do not show again" markers.
    learning_completed: z.array(z.string().max(64)).max(32).optional(),
    protected_payment_explainer_seen: z.boolean().optional(),
    // Generic UI preference groups (web settings page + mobile
    // SettingsHubScreen). Each group is independently strict so a
    // typo'd key in one group doesn't leak into the JSONB blob.
    notifications: NotificationsSchema.optional(),
    privacy: PrivacySchema.optional(),
    display: DisplaySchema.optional(),
  })
  .strict();

export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const userSettingsGet = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (_request, { user }) => {
    const { data, error } = await serverSupabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      logger.warn('Failed to load user settings', {
        service: 'api/users/settings',
        userId: user.id,
        error: error.message,
      });
      return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
    }

    const stored = (data?.settings as Record<string, unknown>) ?? {};
    return NextResponse.json({
      ...USER_SETTINGS_DEFAULTS,
      ...stored,
    });
  }
);

export const userSettingsPatch = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const raw = await request.json().catch(() => null);
    const parsed = UserSettingsSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid settings', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Shallow-merge the patch on top of stored settings. Nested
    // objects (notifications/privacy/display) are replaced wholesale
    // — callers must include every key they want preserved within a
    // group, mirroring the previous behaviour of both routes.
    const { data: current } = await serverSupabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .maybeSingle();

    const merged = {
      ...((current?.settings as Record<string, unknown>) || {}),
      ...parsed.data,
    };

    const { error } = await serverSupabase
      .from('profiles')
      .update({ settings: merged, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      logger.error('Failed to save user settings', error, {
        service: 'api/users/settings',
        userId: user.id,
      });
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json(merged);
  }
);
