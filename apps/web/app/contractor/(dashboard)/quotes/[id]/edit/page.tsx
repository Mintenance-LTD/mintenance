import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { EditQuoteClient } from './components/EditQuoteClient';

export const metadata: Metadata = {
  title: 'Edit Quote | Mintenance',
  description: 'Edit a draft quote and review its item prices and totals.',
  robots: { index: false, follow: false },
};

/** Draft edits preserve the loaded version; sent quotes need an amendment workflow. */
export default async function EditQuotePage({
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
    .maybeSingle();

  if (error) throw new Error('Could not load quote for editing');
  if (!quote) {
    redirect('/contractor/quotes');
  }
  if (quote.status !== 'draft') redirect(`/contractor/quotes/${id}`);

  return <EditQuoteClient quote={quote} />;
}
