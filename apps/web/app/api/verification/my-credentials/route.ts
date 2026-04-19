/**
 * GET /api/verification/my-credentials
 * Contractor reads their own credential-verification rows for the
 * onboarding / settings UI.
 * R4 of docs/RETENTION_ROADMAP_2026.md.
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';

export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 60 } },
  async (_req, { user }) => {
    const { data, error } = await serverSupabase
      .from('credential_verifications')
      .select(
        'id, register, registration_number, status, verified_at, expires_at, rejected_reason, created_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to load credentials' },
        { status: 500 }
      );
    }
    return NextResponse.json({ credentials: data ?? [] });
  }
);
