/**
 * POST /api/subscriptions/feature-access/track
 *
 * Sprint 7 (3.2): server-side increment of `feature_usage` counters so the
 * client hook no longer calls Supabase rpc('increment_feature_usage')
 * directly with `p_user_id: user.id` — a client-supplied user id was the
 * whole risk. The route enforces p_user_id = auth user id.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';

const trackSchema = z.object({
  featureId: z.string().min(1).max(100),
  incrementBy: z.number().int().positive().max(1000).default(1),
});

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 120 } },
  async (request, { user }) => {
    const body = await request.json().catch(() => ({}));
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('Invalid track payload');
    }
    const { featureId, incrementBy } = parsed.data;

    const { error } = await serverSupabase.rpc('increment_feature_usage', {
      p_user_id: user.id, // server-derived — client cannot spoof
      p_feature_id: featureId,
      p_increment: incrementBy,
    });

    if (error) {
      logger.error(
        'feature-access track: increment_feature_usage failed',
        error,
        {
          service: 'subscriptions',
          userId: user.id,
          featureId,
        }
      );
      return NextResponse.json(
        { ok: false, error: 'Failed to record feature usage' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  }
);
