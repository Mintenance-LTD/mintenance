/**
 * GET /api/contractors/[id]/credentials
 *
 * Publicly visible verified credentials for a contractor. Pending +
 * rejected rows are NOT exposed — the RLS public SELECT policy on
 * credential_verifications already enforces `status = 'verified'`,
 * but we filter again here for defense in depth.
 *
 * R4 of docs/RETENTION_ROADMAP_2026.md.
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { isValidUUID } from '@/lib/validation/uuid';
import { BadRequestError } from '@/lib/errors/api-error';

// auth-check: ok — public contractor credentials feed (cert badges,
// insurance type) shown on the marketplace contractor profile to
// anonymous browsers. No PII; specific document URLs are NOT exposed.
export const GET = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 120 } },
  async (_req, ctx) => {
    const { id } = await ctx.params;
    if (!isValidUUID(id)) {
      throw new BadRequestError('Invalid contractor id');
    }

    const { data, error } = await serverSupabase
      .from('credential_verifications')
      .select('id, register, verified_at, expires_at')
      .eq('user_id', id)
      .eq('status', 'verified')
      .order('verified_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { credentials: [], error: 'Failed to load' },
        { status: 500 }
      );
    }

    // Drop expired rows for the public view.
    const now = Date.now();
    const credentials = (data ?? []).filter((r) => {
      if (!r.expires_at) return true;
      return new Date(r.expires_at as string).getTime() > now;
    });

    return NextResponse.json(
      { credentials },
      {
        headers: {
          'Cache-Control':
            'public, s-maxage=300, stale-while-revalidate=3600',
        },
      }
    );
  }
);
