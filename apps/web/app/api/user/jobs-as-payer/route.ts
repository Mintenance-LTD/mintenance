/**
 * GET /api/user/jobs-as-payer — deferred follow-up #4 from R6.
 *
 * Landlord / agency inbound view. Returns jobs where the caller is the
 * designated payer (`payer_user_id = auth.uid()`) but NOT the poster
 * (`homeowner_id != auth.uid()`). For each job we surface enough state
 * for a "jobs awaiting your funding" dashboard card:
 *
 *   - contract status      → can they pay yet?
 *   - escrow status        → have they already paid?
 *   - accepted bid amount  → how much will they pay?
 *   - homeowner name       → who posted it?
 *   - contractor name      → who was accepted?
 *
 * The route is read-only and caps at the 50 most recent jobs. Escrow /
 * bids / contracts are fetched in bulk to keep round-trips flat.
 */

import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

interface ProfileMini {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
}

function profileName(p: ProfileMini | undefined | null): string {
  if (!p) return 'Unknown';
  const full = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  return full || p.company_name || 'Unknown';
}

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const { data: jobs, error } = await serverSupabase
      .from('jobs')
      .select(
        'id, title, status, budget, category, homeowner_id, contractor_id, is_rental_property, created_at'
      )
      .eq('payer_user_id', user.id)
      .neq('homeowner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    const jobIds = (jobs || []).map((j) => j.id as string);
    if (jobIds.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    const profileIds = new Set<string>();
    for (const j of jobs || []) {
      if (j.homeowner_id) profileIds.add(j.homeowner_id as string);
      if (j.contractor_id) profileIds.add(j.contractor_id as string);
    }

    const [profilesRes, bidsRes, escrowsRes, contractsRes] = await Promise.all([
      serverSupabase
        .from('profiles')
        .select('id, first_name, last_name, company_name')
        .in('id', Array.from(profileIds)),
      serverSupabase
        .from('bids')
        .select('job_id, amount, status')
        .in('job_id', jobIds)
        .eq('status', 'accepted'),
      serverSupabase
        .from('escrow_transactions')
        .select('job_id, status, amount')
        .in('job_id', jobIds),
      serverSupabase
        .from('contracts')
        .select('job_id, status')
        .in('job_id', jobIds),
    ]);

    const profileById = new Map<string, ProfileMini>(
      (profilesRes.data || []).map((p) => [p.id as string, p as ProfileMini])
    );
    const acceptedBidByJob = new Map<string, number>();
    for (const b of bidsRes.data || []) {
      if (typeof b.amount === 'number') {
        acceptedBidByJob.set(b.job_id as string, b.amount);
      }
    }
    const escrowByJob = new Map<
      string,
      { status: string; amount: number | null }
    >();
    for (const e of escrowsRes.data || []) {
      escrowByJob.set(e.job_id as string, {
        status: (e.status as string) || 'unknown',
        amount: (e.amount as number | null) ?? null,
      });
    }
    const contractByJob = new Map<string, string>();
    for (const c of contractsRes.data || []) {
      contractByJob.set(c.job_id as string, (c.status as string) || 'unknown');
    }

    const out = (jobs || []).map((j) => {
      const escrow = escrowByJob.get(j.id as string) ?? null;
      const acceptedBid = acceptedBidByJob.get(j.id as string) ?? null;
      const contractStatus = contractByJob.get(j.id as string) ?? null;
      // Derive a simple UI state — the card renders the CTA accordingly.
      // 'awaiting_funding' is the hot case we're building this view for.
      let payerState:
        | 'awaiting_contract'
        | 'awaiting_funding'
        | 'funded'
        | 'completed';
      if (
        escrow &&
        ['held', 'release_pending', 'released', 'completed'].includes(
          escrow.status
        )
      ) {
        payerState =
          escrow.status === 'released' || escrow.status === 'completed'
            ? 'completed'
            : 'funded';
      } else if (contractStatus !== 'accepted') {
        payerState = 'awaiting_contract';
      } else {
        payerState = 'awaiting_funding';
      }
      return {
        id: j.id,
        title: j.title,
        status: j.status,
        budget: j.budget,
        category: j.category,
        isRentalProperty: j.is_rental_property,
        createdAt: j.created_at,
        homeowner: {
          id: j.homeowner_id,
          name: profileName(profileById.get(j.homeowner_id as string)),
        },
        contractor: j.contractor_id
          ? {
              id: j.contractor_id,
              name: profileName(profileById.get(j.contractor_id as string)),
            }
          : null,
        contractStatus,
        escrowStatus: escrow?.status ?? null,
        acceptedBidAmount: acceptedBid,
        payerState,
      };
    });

    return NextResponse.json({ jobs: out });
  }
);
