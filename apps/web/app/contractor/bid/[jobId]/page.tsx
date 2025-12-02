import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { BidSubmissionClient2025 } from './components/BidSubmissionClient2025';
import { redirect } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function BidSubmissionPage2025({ params }: { params: { jobId: string } }) {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch job details
  const { data: job, error } = await supabase
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
    .eq('id', params.jobId)
    .single();

  if (error || !job) {
    redirect('/contractor/bid');
  }

  // Check if contractor already has a bid for this job
  const { data: existingBid } = await supabase
    .from('bids')
    .select('*')
    .eq('job_id', params.jobId)
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
        amount: existingBid.bid_amount,
        description: existingBid.proposal_text,
        lineItems: existingBid.line_items,
        taxRate: existingBid.tax_rate,
        terms: existingBid.terms,
      } : undefined}
    />
  );
}
