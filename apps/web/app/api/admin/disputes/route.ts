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

    // Also get summary counts for the stats cards
    const [
      { count: openCount },
      { count: reviewingCount },
      { count: resolvedCount },
    ] = await Promise.all([
      serverSupabase
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('admin_hold_status', 'pending_review'),
      serverSupabase
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('admin_hold_status', 'admin_hold'),
      serverSupabase
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('admin_hold_status', 'released')
        .not('admin_hold_status', 'is', null),
    ]);

    // Calculate total amount at risk (open + reviewing)
    const { data: atRiskData } = await serverSupabase
      .from('escrow_transactions')
      .select('amount')
      .in('admin_hold_status', ['pending_review', 'admin_hold']);

    const totalAmountAtRisk = (atRiskData ?? []).reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0
    );

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
          ((d.metadata as Record<string, unknown>)?.hold_reason as
            | string
            | null) ?? d.description,
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
