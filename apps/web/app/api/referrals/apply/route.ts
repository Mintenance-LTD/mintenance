/**
 * POST /api/referrals/apply — R7 #8 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Signed-in neighbour posts { code } to attach themselves to the referral.
 * Called from the /refer/[code] landing page after login/signup.
 *
 * GET /api/referrals/apply — returns the caller's credit balance + their
 * own redeemed referral row (for the dashboard card). Used by web + mobile.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { NeighbourhoodReferralService } from '@/lib/services/referrals/NeighbourhoodReferralService';
import { BadRequestError } from '@/lib/errors/api-error';

const bodySchema = z.object({
  code: z.string().min(4).max(40),
});

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('code is required');
    }
    const redeemed = await NeighbourhoodReferralService.redeem(
      parsed.data.code,
      user.id
    );
    if (!redeemed) {
      return NextResponse.json({
        redeemed: false,
        reason: 'Invite not available — maybe already used or expired.',
      });
    }
    return NextResponse.json({ redeemed: true, referral: redeemed });
  }
);

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (_request, { user }) => {
    const balancePence = await NeighbourhoodReferralService.getBalancePence(
      user.id
    );

    const { data: myRedeemed } = await serverSupabase
      .from('neighbourhood_referrals')
      .select(
        'id, code, status, postcode_prefix, first_job_id, reward_applied_at, created_at'
      )
      .eq('referred_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      balancePence,
      myRedeemedReferral: myRedeemed ?? null,
    });
  }
);
