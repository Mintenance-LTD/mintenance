/**
 * GET  /api/admin/verifications/credentials — list credential-verification rows
 * PATCH /api/admin/verifications/credentials — approve/reject a row
 *
 * R4 of docs/RETENTION_ROADMAP_2026.md — admin-manual fallback while
 * the Gas Safe / NICEIC / TrustMark API contracts are in procurement.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { BadRequestError } from '@/lib/errors/api-error';

const QuerySchema = z.object({
  status: z.enum(['pending', 'verified', 'rejected', 'expired', 'all']).default('pending'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const PatchSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(['verified', 'rejected']),
  rejected_reason: z.string().max(500).optional(),
  expires_at: z.string().datetime().optional(),
});

export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 60 } },
  async (request) => {
    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      status: url.searchParams.get('status') ?? 'pending',
      limit: url.searchParams.get('limit') ?? '50',
    });
    if (!parsed.success) {
      throw new BadRequestError('Invalid query');
    }

    let q = serverSupabase
      .from('credential_verifications')
      .select(
        'id, user_id, register, registration_number, status, evidence_path, rejected_reason, expires_at, verified_at, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(parsed.data.limit);

    if (parsed.data.status !== 'all') {
      q = q.eq('status', parsed.data.status);
    }

    const { data: rows, error } = await q;
    if (error) {
      return NextResponse.json(
        { error: 'Failed to load queue' },
        { status: 500 }
      );
    }

    // Hydrate contractor name/email for display (single query + map).
    const ids = (rows ?? []).map((r) => r.user_id as string);
    let profiles: Record<string, { first_name?: string; last_name?: string; email?: string }> = {};
    if (ids.length) {
      const { data: pData } = await serverSupabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', ids);
      if (pData) {
        profiles = Object.fromEntries(
          pData.map((p) => [
            p.id as string,
            {
              first_name: p.first_name as string | undefined,
              last_name: p.last_name as string | undefined,
              email: p.email as string | undefined,
            },
          ])
        );
      }
    }

    return NextResponse.json({
      rows: (rows ?? []).map((r) => ({
        ...r,
        profile: profiles[r.user_id as string] ?? null,
      })),
    });
  }
);

export const PATCH = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 60 } },
  async (request, { user }) => {
    const raw = await request.json().catch(() => null);
    const parsed = PatchSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestError('Invalid decision payload');
    }
    const { id, decision, rejected_reason, expires_at } = parsed.data;

    // Load the row to preserve user_id for the follow-up notification.
    const { data: row, error: rowErr } = await serverSupabase
      .from('credential_verifications')
      .select('id, user_id, register, registration_number, status')
      .eq('id', id)
      .maybeSingle();

    if (rowErr || !row) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }
    if (row.status !== 'pending') {
      return NextResponse.json(
        { error: `Row already ${row.status}` },
        { status: 400 }
      );
    }

    const update = {
      status: decision,
      verified_at: decision === 'verified' ? new Date().toISOString() : null,
      verified_by: user.id,
      rejected_reason: decision === 'rejected' ? rejected_reason ?? null : null,
      expires_at: decision === 'verified' ? expires_at ?? null : null,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await serverSupabase
      .from('credential_verifications')
      .update(update)
      .eq('id', id);

    if (updateErr) {
      logger.warn('Failed to update credential verification', {
        service: 'admin/credential-verifications',
        id,
        err: updateErr.message,
      });
      return NextResponse.json(
        { error: 'Failed to update' },
        { status: 500 }
      );
    }

    // Notify the contractor either way.
    const title =
      decision === 'verified'
        ? 'Credential verified'
        : 'Credential rejected';
    const message =
      decision === 'verified'
        ? `Your ${row.register} registration has been verified and the badge is live on your profile.`
        : `Your ${row.register} registration was not verified. ${
            rejected_reason ?? 'Please double-check the number and try again.'
          }`;
    await NotificationService.createNotification({
      userId: row.user_id as string,
      type:
        decision === 'verified'
          ? 'credential_verified'
          : 'credential_rejected',
      title,
      message,
      actionUrl: '/contractor/onboarding/credentials',
      metadata: { credentialId: id, register: row.register },
    });

    return NextResponse.json({ success: true });
  }
);
