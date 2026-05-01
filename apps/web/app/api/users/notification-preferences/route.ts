/**
 * GET/PATCH /api/users/notification-preferences (LEGACY — see note)
 *
 * Stores a 17-field camelCase JSONB blob on
 * `profiles.notification_preferences`. Used today only by the inline
 * settings page (apps/web/app/settings/_components/notifications-section.tsx)
 * which renders a per-category × per-channel matrix
 * (emailJobs/smsJobs/pushJobs etc).
 *
 * @deprecated for NEW code. The newer canonical endpoint is the
 * singular `/api/user/notification-preferences` (note `user`, not
 * `users`) which stores a 7-field snake_case row on the dedicated
 * `user_notification_preferences` table — global channel toggles +
 * `disabled_types` opt-out array + quiet hours + timezone. The
 * singular shape is what the mobile inbox + the R2 `NotificationPreferencesForm`
 * read.
 *
 * Why keep this one alive:
 *   - The inline-settings UX exposes SMS toggles, which the singular
 *     model has no field for. Killing this would silently drop SMS
 *     preferences from the UI.
 *   - Live audit (2026-04-28) confirmed both DB locations have 0 prod
 *     rows — there's no data movement cost yet, but a UI redesign +
 *     decision on SMS support is required before consolidation.
 *
 * Action plan (separate ticket): collapse the per-category matrix into
 * a global-channel + disabled-types model that supports SMS, migrate
 * the inline-settings UI to the singular endpoint, then drop this
 * route + the JSONB column in one atomic change.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

// 2026-05-01 audit follow-up (check-api-contracts): Zod-validated PATCH
// body. The legacy schema is a 17-field JSONB blob — every key is
// optional (PATCH semantics) and `quietHoursStart`/`End` are HH:MM
// strings. `.strict()` rejects unknown keys so a typo in the UI form
// can't silently drop a preference.
const notificationPreferencesPatchSchema = z
  .object({
    pushEnabled: z.boolean().optional(),
    newJobs: z.boolean().optional(),
    newBids: z.boolean().optional(),
    newMessages: z.boolean().optional(),
    jobUpdates: z.boolean().optional(),
    paymentUpdates: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
    promotionalEmails: z.boolean().optional(),
    securityAlerts: z.boolean().optional(),
    soundEnabled: z.boolean().optional(),
    vibrationEnabled: z.boolean().optional(),
    marketingEmails: z.boolean().optional(),
    productUpdates: z.boolean().optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'quietHoursStart must be HH:MM')
      .optional(),
    quietHoursEnd: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'quietHoursEnd must be HH:MM')
      .optional(),
  })
  .strict();

const DEFAULT_PREFS = {
  pushEnabled: true,
  newJobs: true,
  newBids: true,
  newMessages: true,
  jobUpdates: true,
  paymentUpdates: true,
  emailEnabled: true,
  weeklyDigest: true,
  promotionalEmails: false,
  securityAlerts: true,
  soundEnabled: true,
  vibrationEnabled: true,
  marketingEmails: false,
  productUpdates: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const { data, error } = await serverSupabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Failed to fetch notification preferences', error, {
        service: 'notification-preferences',
        userId: user.id,
      });
      throw new InternalServerError('Failed to fetch notification preferences');
    }

    return NextResponse.json({
      preferences: {
        ...DEFAULT_PREFS,
        ...((data?.notification_preferences as Record<string, unknown>) || {}),
      },
    });
  }
);

export const PATCH = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }
    const parsed = notificationPreferencesPatchSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues[0]?.message ?? 'Invalid preferences payload'
      );
    }
    const body = parsed.data;

    // Fetch current preferences to merge
    const { data: current } = await serverSupabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', user.id)
      .single();

    const merged = {
      ...DEFAULT_PREFS,
      ...((current?.notification_preferences as Record<string, unknown>) || {}),
      ...body,
    };

    const { error } = await serverSupabase
      .from('profiles')
      .update({ notification_preferences: merged })
      .eq('id', user.id);

    if (error) {
      logger.error('Failed to update notification preferences', error, {
        service: 'notification-preferences',
        userId: user.id,
      });
      throw new InternalServerError(
        'Failed to update notification preferences'
      );
    }

    return NextResponse.json({ success: true, preferences: merged });
  }
);
