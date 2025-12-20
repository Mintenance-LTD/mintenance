import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CreateQuoteClient } from './components/CreateQuoteClient';

export default async function CreateQuotePage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  return <CreateQuoteClient />;
}
