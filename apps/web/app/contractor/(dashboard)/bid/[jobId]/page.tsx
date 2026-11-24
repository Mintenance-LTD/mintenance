import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BidSubmissionClient2025 } from './components/BidSubmissionClient2025';
import { redirect, notFound } from 'next/navigation';
import { logger, platformFeeRateForTier } from '@mintenance/shared';
import { FeeCalculationService } from '@/lib/services/payment/FeeCalculationService';
import { canViewBidJob, formatJobBudget } from '@/lib/contractor/bid-details';
import { canAmendAcceptedBid } from '@/lib/quotes/accepted-bid-amendment';

export const metadata: Metadata = {
  title: 'Submit Bid | Mintenance',
  description:
    'Submit your bid for a maintenance job. Set your price, timeline, and proposal details.',
};

export default async function BidSubmissionPage2025({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams?: Promise<{ view?: string }>;
}) {
  const resolvedParams = await params;
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Debug params structure
  // logger.info('BidSubmissionPage - Raw params:', resolvedParams, { service: 'app' });
  // logger.info('BidSubmissionPage - Job ID:', resolvedParams.jobId, { service: 'app' });
  // logger.info('BidSubmissionPage - Job ID type:', typeof resolvedParams.jobId, { service: 'app' });
  // logger.info('BidSubmissionPage - User:', user.id, { service: 'app' });

  // Fetch job details
  const { data: job, error } = await serverSupabase
    .from('jobs')
    .select(
      `
      *,
      homeowner:homeowner_id (
        first_name,
        last_name,
        email,
        profile_image_url
      )
    `
    )
    .eq('id', resolvedParams.jobId)
    .single();

  // logger.info('BidSubmissionPage - Job fetch result:', {
  //   jobId: resolvedParams.jobId,
  //   found: !!job,
  //   error: error?.message,
  //   errorCode: error?.code,
  //   errorDetails: error?.details
  // }, { service: 'app' });

  if (error || !job) {
    logger.error(
      'BidSubmissionPage - Job not found or error:',
      {
        error,
        jobId: resolvedParams.jobId,
        errorMessage: error?.message,
        errorCode: error?.code,
      },
      { service: 'app' }
    );

    // Instead of redirecting, show an error message
    return (
      <div className='flex flex-col items-center justify-center min-h-screen p-8 me-legacy-fit'>
        <h1 className='text-2xl font-bold text-gray-900 mb-4'>Job Not Found</h1>
        <p className='text-gray-600 mb-6'>
          The job you're looking for doesn't exist or has been removed.
        </p>
        <p className='text-sm text-gray-500 mb-4'>
          Job ID: {resolvedParams.jobId}
        </p>
        {error?.message && (
          <p className='text-sm text-red-600 mb-6'>Error: {error.message}</p>
        )}
        <Link
          href='/contractor/discover'
          className='px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors'
        >
          Browse Available Jobs
        </Link>
      </div>
    );
  }

  // Check if contractor already has a bid for this job
  const { data: existingBid, error: bidError } = await serverSupabase
    .from('bids')
    .select('*')
    .eq('job_id', resolvedParams.jobId)
    .eq('contractor_id', user.id)
    .maybeSingle();
  if (bidError) throw new Error('Could not load your bid.');
  if (!canViewBidJob(job, Boolean(existingBid))) notFound();

  const canBid = canViewBidJob(job, false);
  const recordRequested = (await searchParams)?.view === 'record';
  const canEdit = canBid && existingBid?.status === 'pending';
  const canSubmitAgain = canBid && existingBid?.status === 'withdrawn';

  if (existingBid && (recordRequested || (!canEdit && !canSubmitAgain))) {
    const jobHref =
      job.contractor_id === user.id
        ? `/contractor/jobs/${job.id}`
        : `/contractor/bid/${job.id}/details`;
    const amendmentAvailable = await canAmendAcceptedBid(
      job,
      existingBid,
      user.id
    );
    const message =
      existingBid.message ||
      existingBid.proposal_text ||
      existingBid.description;
    return (
      <section className='mx-auto max-w-3xl space-y-5 rounded-xl border border-slate-200 bg-white p-6'>
        <Link href='/contractor/bid' className='underline'>
          Back to bid history
        </Link>
        <div>
          <p className='text-sm font-semibold capitalize'>
            {existingBid.status} · Read-only record
          </p>
          <h1 className='text-2xl font-semibold'>{job.title}</h1>
          <p className='mt-2 text-lg font-semibold'>
            {formatJobBudget(existingBid.amount ?? existingBid.bid_amount)}
          </p>
        </div>
        {message && <p className='whitespace-pre-wrap'>{message}</p>}
        <div className='flex flex-wrap items-center gap-4'>
          <Link
            href={jobHref}
            className='rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white'
          >
            View job
          </Link>
          {canEdit && (
            <Link href={`/contractor/bid/${job.id}`} className='underline'>
              Edit pending bid
            </Link>
          )}
          {canSubmitAgain && (
            <Link href={`/contractor/bid/${job.id}`} className='underline'>
              Submit a new bid
            </Link>
          )}
          {amendmentAvailable && (
            <Link
              href={`/contractor/quotes/${existingBid.quote_id}/history`}
              className='underline'
            >
              Review quote amendments
            </Link>
          )}
        </div>
      </section>
    );
  }

  // Tax and line items live on the linked quote, not on the bid row.
  let savedQuote = null;
  if (canEdit && existingBid?.quote_id) {
    const { data, error } = await serverSupabase
      .from('contractor_quotes')
      .select('subtotal,tax_rate,line_items,terms')
      .eq('id', existingBid.quote_id)
      .eq('contractor_id', user.id)
      .eq('job_id', job.id)
      .maybeSingle();
    if (error || !data)
      throw new Error(
        'Saved quote pricing is unavailable. Please retry before editing.'
      );
    savedQuote = data;
  }

  // Resolve THIS contractor's effective fee rate with the same resolver
  // the escrow release charges with, so the bid preview quotes their real
  // rate instead of a hardcoded 5%. (2026-07-22 fee-consistency fix.)
  const platformFeeRate = platformFeeRateForTier(
    await FeeCalculationService.resolveContractorTier(user.id)
  );

  // `me-legacy-fit` palette-maps this still-legacy bid form's Tailwind
  // classes onto the Mint Editorial tokens. The shim is self-gating —
  // its selectors require a `.me-root` ancestor (provided by the
  // MintEditorialContractorShell) — so opted-out users are unaffected.
  return (
    <div className='me-legacy-fit'>
      <BidSubmissionClient2025
        job={{
          id: job.id,
          title: job.title,
          description: job.description,
          budget: job.budget?.toString(),
          location: job.location,
          category: job.category,
          createdAt: job.created_at,
          photos: job.photos || [],
          homeowner: Array.isArray(job.homeowner)
            ? job.homeowner[0]
            : job.homeowner,
        }}
        existingBid={
          canEdit && existingBid
            ? {
                amount:
                  savedQuote?.subtotal ??
                  existingBid.bid_amount ??
                  existingBid.amount,
                description:
                  existingBid.proposal_text || existingBid.description,
                lineItems:
                  savedQuote?.line_items ?? existingBid.line_items ?? [],
                taxRate: savedQuote?.tax_rate ?? existingBid.tax_rate ?? 0,
                terms: savedQuote?.terms ?? existingBid.terms ?? '',
                estimatedDuration: existingBid.estimated_duration || undefined,
                proposedStartDate: existingBid.proposed_start_date
                  ? new Date(existingBid.proposed_start_date)
                      .toISOString()
                      .split('T')[0]
                  : undefined,
              }
            : undefined
        }
        platformFeeRate={platformFeeRate}
      />
    </div>
  );
}
