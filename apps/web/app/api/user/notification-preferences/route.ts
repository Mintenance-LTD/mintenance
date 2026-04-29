/**
 * /api/user/notification-preferences — CANONICAL surface for user
 * notification settings.
 *
 * Stores a 7-field snake_case row on the dedicated
 * `user_notification_preferences` table:
 *   push_enabled, email_enabled, in_app_enabled, disabled_types[],
 *   quiet_hours_start, quiet_hours_end, timezone.
 *
 * This is the model the mobile inbox + R2 `NotificationPreferencesForm`
 * use. The plural sibling `/api/users/notification-preferences` is a
 * legacy endpoint kept alive only to support SMS toggles in the inline
 * settings UI; new code should use this one.
 *
 * Absent row returns permissive defaults so the client can show a
 * sensible form even on first load. Table defined in migration
 * 20260417000005_user_notification_preferences.sql with RLS that
 * already scopes select/insert/update to `auth.uid()`.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

const DEFAULTS = {
  push_enabled: true,
  email_enabled: true,
  in_app_enabled: true,
  disabled_types: [] as string[],
  quiet_hours_start: null as string | null,
  quiet_hours_end: null as string | null,
  timezone: 'UTC',
};

// HH:MM or HH:MM:SS
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

const PatchSchema = z
  .object({
    push_enabled: z.boolean().optional(),
    email_enabled: z.boolean().optional(),
    in_app_enabled: z.boolean().optional(),
    disabled_types: z.array(z.string().min(1).max(64)).max(64).optional(),
    quiet_hours_start: z
      .union([z.string().regex(timeRegex), z.null()])
      .optional(),
    quiet_hours_end: z
      .union([z.string().regex(timeRegex), z.null()])
      .optional(),
    timezone: z.string().min(1).max(64).optional(),
  })
  .strict();

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (_request, { user }) => {
    const { data, error } = await serverSupabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      logger.warn('Failed to load notification preferences', {
        service: 'api/user/notification-preferences',
        userId: user.id,
        error: error.message,
      });
      return NextResponse.json(
        { error: 'Failed to load preferences' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ user_id: user.id, ...DEFAULTS });
    }

    return NextResponse.json(data);
  }
);

export const PATCH = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid preference payload',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    // Upsert — insert if missing, update if present. Matches the
    // "first-save creates a row" UX pattern.
    const { data, error } = await serverSupabase
      .from('user_notification_preferences')
      .upsert(
        {
          user_id: user.id,
          ...parsed.data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to save notification preferences', {
        service: 'api/user/notification-preferences',
        userId: user.id,
        error: error.message,
      });
      return NextResponse.json(
        { error: 'Failed to save preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  }
);
