/**
 * GET /api/referrals/:code — R7 #8 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Public lookup used by the /refer/[code] landing page to render
 * "X invited you to Mintenance — £20 off your first job, N__ on <PREFIX>".
 * Does NOT require auth. Does not leak the referrer's email.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { NeighbourhoodReferralService } from '@/lib/services/referrals/NeighbourhoodReferralService';
import { BadRequestError } from '@/lib/errors/api-error';

const paramsSchema = z.object({
  code: z.string().min(4).max(40),
});

// auth-check: ok — referral code lookup is the entry-point of the
// referral flow; the user clicks a /ref/:code link BEFORE signing up,
// so the route must be public. Returns minimal lookup data only
// (referrer first name + service area) — no PII.
export const GET = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 30 } },
  async (_request, { params }) => {
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) {
      throw new BadRequestError('Invalid code');
    }

    const ref = await NeighbourhoodReferralService.lookup(parsed.data.code);
    if (!ref) {
      return NextResponse.json(
        { valid: false, reason: 'This invite link is no longer active.' },
        { status: 200 }
      );
    }

    // Lightweight referrer display — first name only, no email.
    const { data: referrer } = await serverSupabase
      .from('profiles')
      .select('first_name')
      .eq('id', ref.referrer_user_id)
      .maybeSingle();

    return NextResponse.json({
      valid: true,
      code: ref.code,
      postcodePrefix: ref.postcode_prefix,
      referrerFirstName:
        (referrer?.first_name as string | null) ?? 'A neighbour',
      rewardPence: 2000,
    });
  }
);
