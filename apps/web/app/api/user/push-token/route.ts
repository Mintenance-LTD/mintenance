import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import { z } from 'zod';

const pushTokenSchema = z.object({
  pushToken: z.string().min(1).max(500),
  platform: z.enum(['ios', 'android']).default('ios'),
});

/**
 * POST /api/user/push-token
 * Register or update a push notification token for the current user.
 * Called by the mobile app on launch after obtaining the Expo push token.
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const body = await request.json();
    const parsed = pushTokenSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestError('Invalid push token data');
    }

    const { pushToken, platform } = parsed.data;

    // Upsert the token (same user + same token = update timestamp)
    const { error } = await serverSupabase.from('user_push_tokens').upsert(
      {
        user_id: user.id,
        push_token: pushToken,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,push_token' }
    );

    if (error) {
      logger.error('Failed to save push token', error, {
        service: 'push',
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to save push token' },
        { status: 500 }
      );
    }

    logger.info('Push token registered', {
      service: 'push',
      userId: user.id,
      platform,
    });

    return NextResponse.json({ success: true });
  }
);

/**
 * DELETE /api/user/push-token
 * Remove a push token (e.g., on logout).
 */
export const DELETE = withApiHandler(
  { rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const body = await request.json();
    const { pushToken } = body;

    if (!pushToken) {
      throw new BadRequestError('pushToken is required');
    }

    const { error } = await serverSupabase
      .from('user_push_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('push_token', pushToken);

    if (error) {
      logger.error('Failed to remove push token', error, {
        service: 'push',
        userId: user.id,
      });
    }

    return NextResponse.json({ success: true });
  }
);
