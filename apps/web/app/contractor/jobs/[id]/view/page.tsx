import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { JobDetailsClient } from '../components/JobDetailsClient';
import { logger } from '@mintenance/shared';

export default async function ContractorJobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
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
    .eq('id', resolvedParams.id)
    .single();

  if (error || !job) {
    logger.error('Error fetching job:', error', [object Object], { service: 'app' });
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
        <p className="text-gray-600">The job you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  // Track job view
  const { data: existingView } = await serverSupabase
    .from('job_views')
    .select('*')
    .eq('job_id', resolvedParams.id)
    .eq('contractor_id', user.id)
    .single();

  if (!existingView) {
    await serverSupabase
      .from('job_views')
      .insert({
        job_id: resolvedParams.id,
        contractor_id: user.id,
        viewed_at: new Date().toISOString(),
        view_count: 1,
      });
  } else {
    await serverSupabase
      .from('job_views')
      .update({
        last_viewed_at: new Date().toISOString(),
        view_count: (existingView.view_count || 0) + 1,
      })
      .eq('id', existingView.id);
  }

  // Check if contractor has already bid on this job
  const { data: existingBid } = await serverSupabase
    .from('bids')
    .select('*')
    .eq('job_id', resolvedParams.id)
    .eq('contractor_id', user.id)
    .single();

  return <JobDetailsClient job={job} homeowner={job.homeowner} existingBid={existingBid} />;
}