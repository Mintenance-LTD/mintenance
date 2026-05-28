/**
 * GET   /api/admin/verifications/documents — list contractor_documents rows
 *                                            with review_status='pending'
 * PATCH /api/admin/verifications/documents — approve/reject a single doc
 *
 * 2026-05-25 audit-44 P1: previously /api/contractor/documents POST set
 * `verification_type` + `review_status='pending'` on uploads, but no
 * admin-side endpoint surfaced or mutated those rows. Evidence sat
 * pending forever and contractors saw no movement on their badge.
 *
 * The per-contractor account-level decision in
 * /api/admin/verifications/[id] now cascades onto pending documents
 * (mass approve/reject); this endpoint is the per-document lever the
 * admin UI uses when a contractor has uploaded several files and only
 * some should be approved.
 *
 * Mirrors the credentials counterpart at
 * /api/admin/verifications/credentials.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { BadRequestError } from '@/lib/errors/api-error';

const QuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const PatchSchema = z
  .object({
    id: z.string().uuid(),
    decision: z.enum(['approved', 'rejected']),
    rejection_reason: z.string().max(1000).optional(),
  })
  .strict()
  .refine((d) => d.decision !== 'rejected' || !!d.rejection_reason?.trim(), {
    path: ['rejection_reason'],
    message: 'A reason is required when rejecting a document',
  });

export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 60 } },
  async (request) => {
    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      status: url.searchParams.get('status') ?? 'pending',
      limit: url.searchParams.get('limit') ?? '50',
    });
    if (!parsed.success) throw new BadRequestError('Invalid query');

    let q = serverSupabase
      .from('contractor_documents')
      .select(
        'id, contractor_id, name, category, verification_type, review_status, reviewed_at, storage_path, size_bytes, created_at'
      )
      .not('verification_type', 'is', null)
      .order('created_at', { ascending: false })
      .limit(parsed.data.limit);

    if (parsed.data.status !== 'all') {
      q = q.eq('review_status', parsed.data.status);
    }

    const { data: rows, error } = await q;
    if (error) {
      logger.error('Failed to load contractor_documents queue', error);
      return NextResponse.json(
        { error: 'Failed to load queue' },
        { status: 500 }
      );
    }

    // Hydrate contractor name + signed URL so the admin reviewer can
    // open the actual file. Bucket is private — signed URLs only.
    const ids = (rows ?? []).map((r) => r.contractor_id as string);
    let profiles: Record<
      string,
      { first_name?: string; last_name?: string; email?: string }
    > = {};
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

    const paths = (rows ?? [])
      .map((r) => r.storage_path as string | undefined)
      .filter((p): p is string => !!p);
    const signedMap = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await serverSupabase.storage
        .from('contractor-documents')
        .createSignedUrls(paths, 60 * 60);
      signed?.forEach((s) => {
        if (s.path && s.signedUrl) signedMap.set(s.path, s.signedUrl);
      });
    }

    return NextResponse.json({
      rows: (rows ?? []).map((r) => ({
        ...r,
        profile: profiles[r.contractor_id as string] ?? null,
        signed_url: signedMap.get(r.storage_path as string) ?? null,
      })),
    });
  }
);

export const PATCH = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 60 },
    // Same trust-grant primitive as the credential PATCH — approving a
    // forged document on a hijacked admin session gives a contractor
    // platform trust they don't deserve.
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'contractor_document_review',
      category: 'verification',
      targetType: 'contractor_document',
      description: 'Reviewed a contractor verification document',
    },
  },
  async (request, { user }) => {
    const raw = await request.json().catch(() => null);
    const parsed = PatchSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues[0]?.message ?? 'Invalid decision payload'
      );
    }
    const { id, decision, rejection_reason } = parsed.data;

    const { data: row, error: rowErr } = await serverSupabase
      .from('contractor_documents')
      .select('id, contractor_id, name, verification_type, review_status')
      .eq('id', id)
      .maybeSingle();

    if (rowErr || !row) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    if (row.review_status && row.review_status !== 'pending') {
      return NextResponse.json(
        { error: `Document already ${row.review_status}` },
        { status: 400 }
      );
    }

    // review_status CHECK allows pending | approved | rejected | not_started
    // (verified live 2026-05-25 via pg_constraint).
    const { error: updateErr } = await serverSupabase
      .from('contractor_documents')
      .update({
        review_status: decision,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        rejection_reason:
          decision === 'rejected' ? (rejection_reason ?? null) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateErr) {
      logger.warn('Failed to update contractor document review', {
        service: 'admin/verifications/documents',
        id,
        err: updateErr.message,
      });
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    const isApproved = decision === 'approved';
    await NotificationService.createNotification({
      userId: row.contractor_id as string,
      type: isApproved ? 'verification_approved' : 'verification_rejected',
      title: isApproved
        ? `Document approved: ${row.name ?? row.verification_type ?? 'evidence'}`
        : `Document needs attention: ${row.name ?? row.verification_type ?? 'evidence'}`,
      message: isApproved
        ? `Your uploaded ${row.verification_type ?? 'document'} has been approved.`
        : `Your uploaded ${row.verification_type ?? 'document'} was not approved. ${rejection_reason ?? 'Please re-upload with the correct file.'}`,
      actionUrl: '/contractor/profile',
      metadata: {
        documentId: id,
        verificationType: row.verification_type,
      },
    });

    return NextResponse.json({ success: true });
  }
);
