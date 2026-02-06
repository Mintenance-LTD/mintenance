import type { Metadata } from 'next';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CreateQuoteClient } from './components/CreateQuoteClient';

export const metadata: Metadata = {
  title: 'Create Quote | Mintenance',
  description: 'Create a new quote or proposal for a maintenance job. Add line items, set pricing, and send to homeowners.',
};

export default async function CreateQuotePage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  return <CreateQuoteClient />;
}
