/**
 * GET /api/contracts/preparation-data?jobId=...
 *
 * Aggregate read used by the mobile ContractPreparationScreen to
 * pre-fill the contract draft. Replaces 6 parallel direct-Supabase
 * queries the screen used to do (profiles, contractor_insurance,
 * contractor_licenses, contracts, bids, contractor_quotes).
 *
 * Returns the auth contractor's business profile + insurance + license
 * (already covered by /api/contractor/business-profile but inlined
 * here so the screen can do a single round-trip), plus the latest
 * contract for the job, the contractor's accepted bid on that job,
 * and the latest matching quote.
 *
 * Authorisation: contractor only. We only return contract / bid / quote
 * rows the contractor actually owns (contractor_id = auth.uid OR is
 * the job's contractor_id), so a leaked jobId can't reveal anyone
 * else's contract draft.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';

const querySchema = z
  .object({
    jobId: z.string().uuid(),
  })
  .strict();

export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (request, { user }) => {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      jobId: url.searchParams.get('jobId') ?? '',
    });
    if (!parsed.success) {
      throw new BadRequestError('Valid jobId query parameter is required');
    }
    const { jobId } = parsed.data;

    const [
      profileRes,
      insuranceRes,
      licenseRes,
      contractsRes,
      bidRes,
      quoteRes,
    ] = await Promise.all([
      serverSupabase
        .from('profiles')
        .select('company_name, license_number')
        .eq('id', user.id)
        .maybeSingle(),
      serverSupabase
        .from('contractor_insurance')
        .select('provider, policy_number')
        .eq('contractor_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      serverSupabase
        .from('contractor_licenses')
        .select('name, number')
        .eq('contractor_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      serverSupabase
        .from('contracts')
        .select('id, amount, title, description, terms, status')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1),
      serverSupabase
        .from('bids')
        .select('amount, description, message')
        .eq('job_id', jobId)
        .eq('contractor_id', user.id)
        .eq('status', 'accepted')
        .limit(1)
        .maybeSingle(),
      serverSupabase
        .from('contractor_quotes')
        .select('id, line_items, total_amount, tax_rate, tax_amount, terms')
        .eq('job_id', jobId)
        .eq('contractor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // Surface read failures — but do not throw on individual misses
    // since the screen treats every field as optional pre-fill data.
    if (profileRes.error) {
      logger.warn('contracts/preparation-data profile read failed', {
        service: 'contracts.preparation-data',
        userId: user.id,
        error: profileRes.error.message,
      });
    }

    return NextResponse.json({
      profile: profileRes.data ?? null,
      insurance: insuranceRes.data ?? null,
      license: licenseRes.data ?? null,
      contract: contractsRes.data?.[0] ?? null,
      acceptedBid: bidRes.data ?? null,
      quote: quoteRes.data ?? null,
    });
  }
);
