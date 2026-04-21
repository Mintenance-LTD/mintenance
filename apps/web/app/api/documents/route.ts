import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * GET /api/documents
 * Fetch all documents for the authenticated homeowner:
 * - Contracts (as virtual documents)
 * - Bids received
 * - Escrow/payment records
 */
export const GET = withApiHandler(
  { roles: ['homeowner'], csrf: false },
  async (_req, { user }) => {
    // 1. Fetch contracts where this user is the homeowner
    const { data: contracts } = await serverSupabase
      .from('contracts')
      .select(
        `
        id, job_id, title, status, amount, created_at, updated_at,
        contractor_signed_at, homeowner_signed_at,
        contractor:profiles!contractor_id(first_name, last_name, company_name),
        job:jobs!job_id(title)
      `
      )
      .eq('homeowner_id', user.id)
      .neq('status', 'draft')
      .order('created_at', { ascending: false });

    const contractDocs = (contracts || []).map((c: Record<string, unknown>) => {
      const contractor = c.contractor as {
        first_name?: string;
        last_name?: string;
        company_name?: string;
      } | null;
      const contractorName =
        contractor?.company_name ||
        (contractor?.first_name && contractor?.last_name
          ? `${contractor.first_name} ${contractor.last_name}`
          : 'Contractor');
      // Historic contracts had title "Contract for Job" hard-coded; fall back
      // to the actual job title so the list is legible.
      const rawTitle = typeof c.title === 'string' ? c.title.trim() : '';
      const jobTitle = (c.job as { title?: string } | null)?.title?.trim();
      const isGeneric =
        !rawTitle ||
        rawTitle.toLowerCase() === 'contract' ||
        rawTitle.toLowerCase() === 'contract for job';
      const displayName = isGeneric
        ? jobTitle
          ? `Contract for ${jobTitle}`
          : 'Contract Agreement'
        : rawTitle;
      return {
        id: `contract-${c.id}`,
        type: 'contract' as const,
        name: displayName,
        status: c.status as string,
        amount: c.amount as number | null,
        job_id: c.job_id as string,
        contractor_name: contractorName,
        contractor_signed: !!c.contractor_signed_at,
        homeowner_signed: !!c.homeowner_signed_at,
        created_at: c.created_at as string,
        updated_at: c.updated_at as string,
        href: `/jobs/${c.job_id}`,
      };
    });

    // 2. Fetch bids on homeowner's jobs
    const { data: jobs } = await serverSupabase
      .from('jobs')
      .select('id, title')
      .eq('homeowner_id', user.id);

    const jobIds = (jobs || []).map((j: { id: string }) => j.id);
    const jobTitleMap = new Map(
      (jobs || []).map((j: { id: string; title: string }) => [j.id, j.title])
    );

    let bidDocs: Array<Record<string, unknown>> = [];
    if (jobIds.length > 0) {
      const { data: bids } = await serverSupabase
        .from('bids')
        .select(
          `
          id, job_id, amount, status, message, created_at, updated_at,
          contractor:profiles!contractor_id(first_name, last_name, company_name)
        `
        )
        .in('job_id', jobIds)
        .order('created_at', { ascending: false });

      bidDocs = (bids || []).map((b: Record<string, unknown>) => {
        const contractor = b.contractor as {
          first_name?: string;
          last_name?: string;
          company_name?: string;
        } | null;
        const contractorName =
          contractor?.company_name ||
          (contractor?.first_name && contractor?.last_name
            ? `${contractor.first_name} ${contractor.last_name}`
            : 'Contractor');
        return {
          id: `bid-${b.id}`,
          type: 'bid' as const,
          name: `Bid for ${jobTitleMap.get(b.job_id as string) || 'Job'}`,
          status: b.status as string,
          amount: b.amount as number | null,
          job_id: b.job_id as string,
          job_title: jobTitleMap.get(b.job_id as string) || 'Job',
          contractor_name: contractorName,
          message: b.message as string | null,
          created_at: b.created_at as string,
          updated_at: b.updated_at as string,
          href: `/jobs/${b.job_id}`,
        };
      });
    }

    // 3. Fetch escrow/payment records
    const { data: escrows } = await serverSupabase
      .from('escrow_transactions')
      .select('id, job_id, amount, status, created_at, updated_at')
      .eq('payer_id', user.id)
      .order('created_at', { ascending: false });

    const paymentDocs = (escrows || []).map((e: Record<string, unknown>) => ({
      id: `payment-${e.id}`,
      type: 'payment' as const,
      name: `Payment for ${jobTitleMap.get(e.job_id as string) || 'Job'}`,
      status: e.status as string,
      amount: e.amount as number | null,
      job_id: e.job_id as string,
      job_title: jobTitleMap.get(e.job_id as string) || 'Job',
      created_at: e.created_at as string,
      updated_at: e.updated_at as string,
      href: `/payments`,
    }));

    return NextResponse.json({
      documents: [...contractDocs, ...bidDocs, ...paymentDocs],
      counts: {
        contracts: contractDocs.length,
        bids: bidDocs.length,
        payments: paymentDocs.length,
        total: contractDocs.length + bidDocs.length + paymentDocs.length,
      },
    });
  }
);
