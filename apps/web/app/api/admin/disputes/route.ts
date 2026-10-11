import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';

/**
 * GET /api/admin/disputes
 * Fetches escrow transactions that are on admin hold or pending review,
 * joined with job and profile data to build a disputes view.
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 }, csrf: false },
  async (request) => {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Query escrow_transactions with admin_hold_status not null/none,
    // joined with jobs and profiles for both payer (homeowner) and payee (contractor)
    let query = serverSupabase
      .from('escrow_transactions')
      .select(
        `
        id,
        job_id,
        payer_id,
        payee_id,
        amount,
        status,
        admin_hold_status,
        description,
        metadata,
        created_at,
        updated_at,
        homeowner_approval,
        photo_verification_status,
        cooling_off_ends_at,
        jobs:job_id (
          id,
          title,
          status,
          category,
          created_at
        ),
        payer:payer_id (
          id,
          first_name,
          last_name,
          email
        ),
        payee:payee_id (
          id,
          first_name,
          last_name,
          email,
          company_name
        )
      `,
        { count: 'exact' }
      )
      .not('admin_hold_status', 'is', null)
      .neq('admin_hold_status', 'none')
      .order('updated_at', { ascending: false });

    // Filter by dispute status if provided
    if (status === 'open') {
      query = query.eq('admin_hold_status', 'pending_review');
    } else if (status === 'reviewing') {
      query = query.eq('admin_hold_status', 'admin_hold');
    } else if (status === 'resolved') {
      query = query.eq('admin_hold_status', 'released');
    }

    query = query.range(offset, offset + limit - 1);

    const { data: disputes, error, count } = await query;

    if (error) {
      logger.error('Error fetching disputes', { error: error.message });
      throw new InternalServerError('Failed to fetch disputes');
    }

    // Only load resolution decisions for this page; never make a persisted
    // decision appear editable because its lookup failed.
    const resolutionByEscrow = new Map<string, unknown>();
    const disputeByEscrow = new Map<string, { id: string; reason: string }>();
    const assigneeByDispute = new Map<string, string>();
    if (disputes?.length) {
      const canonical = await serverSupabase
        .from('disputes')
        .select('id,reason,dispute_escrow_links!inner(escrow_id)')
        .in(
          'dispute_escrow_links.escrow_id',
          disputes.map((d) => d.id)
        )
        .order('created_at', { ascending: false });
      if (canonical.error)
        throw new InternalServerError('Failed to load dispute details');
      for (const row of canonical.data ?? []) {
        for (const link of row.dispute_escrow_links) {
          if (!disputeByEscrow.has(link.escrow_id))
            disputeByEscrow.set(link.escrow_id, row);
        }
      }
      if (canonical.data?.length) {
        const tasks = await serverSupabase
          .from('admin_dispute_tasks')
          .select('dispute_id,admin_id')
          .in(
            'dispute_id',
            canonical.data.map((d) => d.id)
          );
        if (tasks.error)
          throw new InternalServerError('Failed to load dispute assignments');
        const ids = [
          ...new Set(
            (tasks.data ?? []).flatMap((t) => (t.admin_id ? [t.admin_id] : []))
          ),
        ];
        const admins = ids.length
          ? await serverSupabase
              .from('profiles')
              .select('id,first_name,last_name')
              .in('id', ids)
          : { data: [], error: null };
        if (admins.error)
          throw new InternalServerError(
            'Failed to load assigned administrators'
          );
        for (const task of tasks.data ?? []) {
          const admin = admins.data?.find((p) => p.id === task.admin_id);
          if (admin)
            assigneeByDispute.set(
              task.dispute_id,
              `${admin.first_name ?? ''} ${admin.last_name ?? ''}`.trim() ||
                'Administrator'
            );
        }
      }
      const resolutions = await serverSupabase
        .from('escrow_dispute_resolutions')
        .select(
          'id, escrow_id, decision, reason, state, refund_minor, release_minor'
        )
        .in(
          'escrow_id',
          disputes.map((dispute) => dispute.id)
        );
      if (resolutions.error)
        throw new InternalServerError(
          'Failed to load dispute resolution status'
        );
      for (const resolution of resolutions.data ?? [])
        resolutionByEscrow.set(resolution.escrow_id, resolution);
    }

    // Fetch stats in a single query instead of 4 separate ones
    const { data: statsRows } = await serverSupabase
      .from('escrow_transactions')
      .select('admin_hold_status, amount')
      .in('admin_hold_status', ['pending_review', 'admin_hold', 'released']);

    let openCount = 0;
    let reviewingCount = 0;
    let resolvedCount = 0;
    let totalAmountAtRisk = 0;

    for (const row of statsRows ?? []) {
      switch (row.admin_hold_status) {
        case 'pending_review':
          openCount++;
          totalAmountAtRisk += Number(row.amount) || 0;
          break;
        case 'admin_hold':
          reviewingCount++;
          totalAmountAtRisk += Number(row.amount) || 0;
          break;
        case 'released':
          resolvedCount++;
          break;
      }
    }

    const mapped = (disputes ?? []).map((d) => {
      const jobRaw = d.jobs;
      const job = (Array.isArray(jobRaw) ? jobRaw[0] : jobRaw) as Record<
        string,
        unknown
      > | null;
      const payerRaw = d.payer;
      const payer = (
        Array.isArray(payerRaw) ? payerRaw[0] : payerRaw
      ) as Record<string, unknown> | null;
      const payeeRaw = d.payee;
      const payee = (
        Array.isArray(payeeRaw) ? payeeRaw[0] : payeeRaw
      ) as Record<string, unknown> | null;

      return {
        id: d.id,
        resolution: resolutionByEscrow.get(d.id) ?? null,
        assignedAdmin:
          assigneeByDispute.get(disputeByEscrow.get(d.id)?.id ?? '') ?? null,
        jobId: d.job_id,
        jobTitle: (job?.title as string) ?? 'Unknown Job',
        jobStatus: (job?.status as string) ?? 'unknown',
        jobCategory: (job?.category as string) ?? null,
        homeownerId: d.payer_id,
        homeownerName: payer
          ? `${payer.first_name || ''} ${payer.last_name || ''}`.trim() ||
            (payer.email as string)
          : 'Unknown',
        homeownerEmail: (payer?.email as string) ?? '',
        contractorId: d.payee_id,
        contractorName: payee
          ? (payee.company_name as string) ||
            `${payee.first_name || ''} ${payee.last_name || ''}`.trim() ||
            (payee.email as string)
          : 'Unknown',
        contractorEmail: (payee?.email as string) ?? '',
        amount: Number(d.amount) || 0,
        escrowStatus: d.status,
        adminHoldStatus: d.admin_hold_status,
        holdReason:
          disputeByEscrow.get(d.id)?.reason ??
          ((d.metadata as Record<string, unknown>)?.hold_reason as
            | string
            | null) ??
          d.description,
        homeownerApproval: d.homeowner_approval,
        photoVerificationStatus: d.photo_verification_status,
        coolingOffEndsAt: d.cooling_off_ends_at,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: mapped,
      stats: {
        open: openCount ?? 0,
        reviewing: reviewingCount ?? 0,
        resolved: resolvedCount ?? 0,
        totalAmountAtRisk,
      },
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  }
);
