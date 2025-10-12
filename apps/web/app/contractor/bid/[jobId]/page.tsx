import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { BidSubmissionClient } from './components/BidSubmissionClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function BidSubmissionPage({ params }: { params: { jobId: string } }) {
  const { jobId } = params;
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (!job) {
    redirect('/jobs');
  }

  return <BidSubmissionClient job={job} />;
}
