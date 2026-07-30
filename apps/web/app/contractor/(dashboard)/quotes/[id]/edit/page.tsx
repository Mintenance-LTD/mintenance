import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { EditQuoteClient } from './components/EditQuoteClient';

export const metadata: Metadata = {
  title: 'Edit Quote | Mintenance',
  description: 'Update quote title, validity, terms, and notes.',
  robots: { index: false, follow: false },
};

/**
 * /contractor/quotes/[id]/edit
 *
 * Audit follow-up (2026-04-29): the QuoteCard `handleEdit` button
 * was pointing at `${id}/edit` originally; that route didn't exist,
 * so the card was patched to route to `${id}` (view-only) with a
 * "swap back once edit ships" TODO. This is the missing edit page.
 *
 * Editable fields:
 *   - title           (up to 500 chars)
 *   - total_amount    (re-quote the bottom line without touching line items)
 *   - valid_until     (date)
 *   - terms / notes   (free text)
 *   - status          (limited to draft / sent for the contractor — accepted
 *                      / declined / expired flip via the wire-up to bid
 *                      acceptance + the cron, not by manual edit)
 *
 * Line items are intentionally out of scope for the v1 edit. If a
 * contractor needs to change line items, they should duplicate the
 * quote and create a new one — keeps the audit trail clean on each
 * version sent to the client.
 */
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
    .single();

  if (error || !quote) {
    redirect('/contractor/quotes');
  }

  return <EditQuoteClient quote={quote} />;
}
