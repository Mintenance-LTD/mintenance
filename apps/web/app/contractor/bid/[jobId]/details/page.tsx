import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { JobDetailsClient } from '@/app/contractor/jobs/[id]/components/JobDetailsClient';
import { logger } from '@mintenance/shared';

export default async function ContractorJobDetailsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const resolvedParams = await params;
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch job details
  const { data: job, error } = await serverSupabase
    .from('jobs')
    .select(`
      *,
      homeowner:homeowner_id (
        id,
        first_name,
        last_name,
        email,
        phone,
        profile_image_url,
        created_at
      )
    `)
    .eq('id', resolvedParams.jobId)
    .single();

  if (error || !job) {
    logger.error('Error fetching job:', error, { service: 'app' });
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
        <p className="text-gray-600">The job you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  // Check if contractor has already bid on this job
  const { data: existingBid } = await serverSupabase
    .from('bids')
    .select('*')
    .eq('job_id', resolvedParams.jobId)
    .eq('contractor_id', user.id)
    .single();

  return <JobDetailsClient job={job} homeowner={job.homeowner} existingBid={existingBid} />;
}