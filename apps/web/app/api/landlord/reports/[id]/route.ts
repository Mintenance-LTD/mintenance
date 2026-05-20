import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';

/**
 * PATCH /api/landlord/reports/[id]
 *
 * Updates the status (+ optional landlord notes) of a tenant-submitted
 * anonymous report. Audit P1 (2026-05-12): the report list had 6
 * filter tabs implying mutation, but neither client variant nor any
 * API route actually supported changing status. The detail modal's
 * "Create Job" link works through /jobs/create but doesn't flip the
 * report's status to `converted` either — so a homeowner who acted on
 * a report still saw it in the `new` bucket forever.
 *
 * Allowed status values are pinned to the DB CHECK constraint on
 * `anonymous_reports.status`. Authorisation is owner-via-token: the
 * caller must own the `anonymous_report_token` that birthed the
 * report (the same join the existing RLS policy enforces). The
 * `acknowledged_at` and `resolved_at` audit timestamps are set
 * automatically when the corresponding transition happens for the
 * first time.
 */

const ALLOWED_STATUSES = new Set([
  'new',
  'acknowledged',
  'converted',
  'resolved',
  'dismissed',
]);

interface UpdatePayload {
  status?: string;
  landlord_notes?: string | null;
  job_id?: string | null;
}

export const PATCH = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const reportId = params.id;
    if (!reportId) {
      return NextResponse.json({ error: 'Missing report id' }, { status: 400 });
    }

    let body: UpdatePayload;
    try {
      body = (await req.json()) as UpdatePayload;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { status, landlord_notes, job_id } = body;
    if (status !== undefined && !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        {
          error: `Invalid status (must be one of ${[...ALLOWED_STATUSES].join(', ')})`,
        },
        { status: 400 }
      );
    }

    // Authorise via the same token-owner trail the RLS policy uses.
    // serverSupabase is service-role, so RLS doesn't apply — we
    // recreate the check here. Admins bypass.
    const { data: report } = await serverSupabase
      .from('anonymous_reports')
      .select(
        'id, status, acknowledged_at, resolved_at, anonymous_report_tokens!inner(owner_id)'
      )
      .eq('id', reportId)
      .single();

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // PostgREST `!inner` join returns an array on the embedded
    // relation even though the FK is one-to-one.
    const tokens = (
      report as { anonymous_report_tokens?: Array<{ owner_id: string }> }
    ).anonymous_report_tokens;
    const ownerId = Array.isArray(tokens) ? tokens[0]?.owner_id : null;
    if (!ownerId || (ownerId !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (status !== undefined) {
      update.status = status;
      // Audit timestamps — only set on the first transition into the
      // matching state so a Reopen → Acknowledge round-trip keeps the
      // original acknowledged_at.
      if (status === 'acknowledged' && !report.acknowledged_at) {
        update.acknowledged_at = update.updated_at;
      }
      if (status === 'resolved' && !report.resolved_at) {
        update.resolved_at = update.updated_at;
      }
    }
    if (landlord_notes !== undefined) {
      update.landlord_notes =
        typeof landlord_notes === 'string'
          ? landlord_notes.trim() || null
          : null;
    }
    if (job_id !== undefined) {
      update.job_id = typeof job_id === 'string' && job_id ? job_id : null;
    }

    const { data: updated, error } = await serverSupabase
      .from('anonymous_reports')
      .update(update)
      .eq('id', reportId)
      .select(
        '*, anonymous_report_tokens!inner (owner_id, label, property_id), properties:property_id (id, property_name, address)'
      )
      .single();

    if (error) {
      logger.error('Failed to update anonymous report', error, {
        service: 'landlord-reports',
        userId: user.id,
        reportId,
      });
      return NextResponse.json(
        { error: 'Failed to update report' },
        { status: 500 }
      );
    }

    return NextResponse.json({ report: updated });
  }
);
