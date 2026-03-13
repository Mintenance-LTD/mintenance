/**
 * GET/PATCH /api/users/notification-preferences
 * Read and update notification preferences (stored in profiles.notification_preferences JSONB column)
 */
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

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
      preferences: { ...DEFAULT_PREFS, ...(data?.notification_preferences as Record<string, unknown> || {}) },
    });
  }
);

export const PATCH = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    const body = await request.json();

    // Fetch current preferences to merge
    const { data: current } = await serverSupabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', user.id)
      .single();

    const merged = {
      ...DEFAULT_PREFS,
      ...(current?.notification_preferences as Record<string, unknown> || {}),
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
      throw new InternalServerError('Failed to update notification preferences');
    }

    return NextResponse.json({ success: true, preferences: merged });
  }
);
