import { withEffectiveQuoteStatuses } from '@/lib/quotes/effective-quotes';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { QuoteDetailsClient } from './components/QuoteDetailsClient';
import { MintEditorialQuoteDetailView } from './components/MintEditorialQuoteDetailView';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Quote Details | Mintenance',
  description:
    'View and manage your quote details, line items, and send to homeowners on Mintenance.',
};

export default async function QuoteDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const { data: quote, error } = await serverSupabase
    .from('contractor_quotes')
    .select('*')
    .eq('id', id)
    .eq('contractor_id', user.id)
    .single();

  if (error || !quote) {
    redirect('/contractor/quotes');
  }

  const [effectiveQuote] = await withEffectiveQuoteStatuses([quote], user.id, true);

  // Mint Editorial theme branch — same data shape, polished editorial layout.
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  if (isMintEditorial) {
    return <MintEditorialQuoteDetailView quote={effectiveQuote} />;
  }

  return <QuoteDetailsClient quote={effectiveQuote} />;
}
