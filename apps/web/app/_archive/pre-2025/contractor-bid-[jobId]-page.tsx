import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { BidSubmissionClient } from './components/BidSubmissionClient';

export default async function BidSubmissionPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const { data: job, error: jobError } = await serverSupabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    redirect('/contractor/bid');
  }

  // Map database fields to component expected format
  const mappedJob = {
    id: job.id,
    title: job.title || 'Untitled Job',
    description: job.description || '',
    budget: job.budget ? String(job.budget) : undefined,
    location: job.location || undefined,
    category: job.category || undefined,
    createdAt: job.created_at || undefined,
    postedBy: undefined, // Can be fetched separately if needed
  };

  return <BidSubmissionClient job={mappedJob} />;
}
