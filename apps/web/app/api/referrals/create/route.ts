/**
 * POST /api/referrals/create — R7 #8 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Homeowner requests a share code for their postcode. Returns the full
 * referral object + a ready-to-share URL.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NeighbourhoodReferralService } from '@/lib/services/referrals/NeighbourhoodReferralService';
import { BadRequestError } from '@/lib/errors/api-error';
import { env } from '@/lib/env';

const bodySchema = z.object({
  postcode: z.string().min(2).max(10),
  referred_email: z.string().email().optional(),
});

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('postcode is required');
    }

    const referral = await NeighbourhoodReferralService.getOrCreate(
      user.id,
      parsed.data.postcode,
      parsed.data.referred_email ?? null
    );

    const baseUrl = env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com';
    return NextResponse.json({
      referral,
      shareUrl: `${baseUrl}/refer/${referral.code}`,
    });
  }
);
