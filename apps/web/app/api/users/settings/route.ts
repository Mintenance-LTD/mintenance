/**
 * GET/PATCH /api/users/settings
 * Read and update user settings (stored in profiles.settings JSONB column)
 */
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const DEFAULT_SETTINGS = {
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

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const { data, error } = await serverSupabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Failed to fetch user settings', error, {
        service: 'user-settings',
        userId: user.id,
      });
      throw new InternalServerError('Failed to fetch settings');
    }

    return NextResponse.json({
      success: true,
      data: { ...DEFAULT_SETTINGS, ...(data?.settings as Record<string, unknown> || {}) },
    });
  }
);

export const PATCH = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    const body = await request.json();

    // Fetch current settings to merge
    const { data: current } = await serverSupabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .single();

    const merged = {
      ...DEFAULT_SETTINGS,
      ...(current?.settings as Record<string, unknown> || {}),
      ...body,
    };

    const { error } = await serverSupabase
      .from('profiles')
      .update({ settings: merged })
      .eq('id', user.id);

    if (error) {
      logger.error('Failed to update user settings', error, {
        service: 'user-settings',
        userId: user.id,
      });
      throw new InternalServerError('Failed to update settings');
    }

    return NextResponse.json({ success: true, data: merged });
  }
);
