import { resignJobStorageUrls } from '@/lib/api/job-storage';
import type { Metadata } from 'next';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect, notFound } from 'next/navigation';
import { canViewBidJob } from '@/lib/contractor/bid-details';
import { JobDetailsClient } from '@/app/contractor/(dashboard)/jobs/[id]/components/JobDetailsClient';
import { logger } from '@mintenance/shared';

export const metadata: Metadata = {
  title: 'Bid Details | Mintenance',
  description:
    'View job details and your bid information for this maintenance job on Mintenance.',
};

export default async function ContractorJobDetailsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const resolvedParams = await params;
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch job details
  const { data: job, error } = await serverSupabase
    .from('jobs')
    .select(
      `
      id, title, description, budget, status, category, created_at,
      homeowner_id, contractor_id, archived_at, requirements, photos,
      homeowner:homeowner_id (
        id,
        first_name,
        profile_image_url,
        created_at
      )
    `
    )
    .eq('id', resolvedParams.jobId)
    .single();

  if (error || !job) {
    logger.error('Error fetching job:', error, { service: 'app' });
    return (
      <div className='p-8 text-center'>
        <h1 className='text-2xl font-bold text-gray-900 mb-4'>Job Not Found</h1>
        <p className='text-gray-600'>
          The job you're looking for doesn't exist or has been removed.
        </p>
      </div>
    );
  }

  // Check if contractor has already bid on this job
  if (job.contractor_id === user.id) redirect(`/contractor/jobs/${job.id}`);

  const { data: existingBid, error: bidError } = await serverSupabase
    .from('bids')
    .select('id, amount, status')
    .eq('job_id', resolvedParams.jobId)
    .eq('contractor_id', user.id)
    .maybeSingle();

  if (bidError) throw new Error('Unable to verify bid access');
  if (!canViewBidJob(job, Boolean(existingBid))) notFound();

  const photos = await resignJobStorageUrls(job.photos ?? [], user.id);
  return (
    <JobDetailsClient
      job={{ ...job, photos }}
      homeowner={
        (Array.isArray(job.homeowner) ? job.homeowner[0] : job.homeowner) ?? {
          id: job.homeowner_id,
          first_name: 'Homeowner',
          created_at: job.created_at,
        }
      }
      existingBid={existingBid}
    />
  );
}
