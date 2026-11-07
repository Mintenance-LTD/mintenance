import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect, notFound } from 'next/navigation';
import { QuoteHistoryClient } from './QuoteHistoryClient';

export default async function QuoteHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUserFromCookies();
  if (!user || user.role !== 'contractor') redirect('/login');
  const { id } = await params;
  const { data: quote, error } = await serverSupabase
    .from('contractor_quotes')
    .select('id, job_id, title, status, updated_at, total_amount, line_items')
    .eq('id', id)
    .eq('contractor_id', user.id)
    .maybeSingle();
  if (error) throw new Error('Could not load quote history');
  if (!quote) notFound();
  const { data: current, error: currentError } = await serverSupabase
    .from('current_contractor_quotes')
    .select('id')
    .eq('id', id)
    .eq('contractor_id', user.id)
    .maybeSingle();
  if (currentError) throw new Error('Could not load current quote status');
  return (
    <QuoteHistoryClient
      key={id}
      quote={{ ...quote, is_current: Boolean(current) }}
    />
  );
}
