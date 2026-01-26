import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BidSubmissionClient2025 } from './components/BidSubmissionClient2025';
import { redirect } from 'next/navigation';
import { logger } from '@mintenance/shared';

export default async function BidSubmissionPage2025({ params }: { params: Promise<{ jobId: string }> }) {
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
    .select(`
      *,
      homeowner:homeowner_id (
        first_name,
        last_name,
        email,
        profile_image_url
      )
    `)
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
    logger.error('BidSubmissionPage - Job not found or error:', {
      error,
      jobId: resolvedParams.jobId,
      errorMessage: error?.message,
      errorCode: error?.code
    }, { service: 'app' });

    // Instead of redirecting, show an error message
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
        <p className="text-gray-600 mb-6">
          The job you're looking for doesn't exist or has been removed.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Job ID: {resolvedParams.jobId}
        </p>
        {error?.message && (
          <p className="text-sm text-red-600 mb-6">
            Error: {error.message}
          </p>
        )}
        <a
          href="/contractor/discover"
          className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          Browse Available Jobs
        </a>
      </div>
    );
  }

  // Check if contractor already has a bid for this job
  const { data: existingBid } = await serverSupabase
    .from('bids')
    .select('*')
    .eq('job_id', resolvedParams.jobId)
    .eq('contractor_id', user.id)
    .single();

  return (
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
          homeowner: Array.isArray(job.homeowner) ? job.homeowner[0] : job.homeowner,
        }}
        existingBid={existingBid ? {
          amount: existingBid.bid_amount || existingBid.amount,
          description: existingBid.proposal_text || existingBid.description,
          lineItems: existingBid.line_items || [],
          taxRate: existingBid.tax_rate ?? 0,
          terms: existingBid.terms || '',
          estimatedDuration: existingBid.estimated_duration || undefined,
          proposedStartDate: existingBid.proposed_start_date ? new Date(existingBid.proposed_start_date).toISOString().split('T')[0] : undefined,
        } : undefined}
    />
  );
}
