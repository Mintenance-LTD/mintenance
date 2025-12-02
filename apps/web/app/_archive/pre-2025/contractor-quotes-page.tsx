import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { QuoteBuilderClient } from './components/QuoteBuilderClient';
import { redirect } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function QuoteBuilderPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const { data: quotes } = await supabase
    .from('contractor_quotes')
    .select('*')
    .eq('contractor_id', user.id)
    .order('created_at', { ascending: false });

  const allQuotes = quotes || [];
  const stats = {
    total_quotes: allQuotes.length,
    draft_quotes: allQuotes.filter((q) => q.status === 'draft').length,
    sent_quotes: allQuotes.filter((q) => q.status === 'sent').length,
    accepted_quotes: allQuotes.filter((q) => q.status === 'accepted').length,
    rejected_quotes: allQuotes.filter((q) => q.status === 'rejected').length,
    total_value: allQuotes.reduce((sum, q) => sum + (parseFloat(q.total_amount) || 0), 0),
    acceptance_rate:
      allQuotes.length > 0
        ? (allQuotes.filter((q) => q.status === 'accepted').length / allQuotes.length) * 100
        : 0,
  };

  return <QuoteBuilderClient quotes={allQuotes} stats={stats} />;
}
