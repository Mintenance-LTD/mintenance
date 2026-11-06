import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect, notFound } from 'next/navigation';
import { QuoteAmendmentReview } from '@/components/quotes/QuoteAmendmentReview';
export default async function QuoteAmendmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect('/login');
  const { id } = await params;
  const { data: job, error } = await serverSupabase
    .from('jobs')
    .select('id,homeowner_id,payer_user_id,contractor_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Could not load amendment review');
  if (
    !job ||
    ![job.homeowner_id, job.payer_user_id, job.contractor_id].includes(user.id)
  )
    notFound();
  return <QuoteAmendmentReview jobId={id} />;
}
