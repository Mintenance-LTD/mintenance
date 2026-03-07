import { Suspense } from 'react';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { MessagesClient } from './components/MessagesClient';

export const metadata = {
  title: 'Messages | Mintenance',
  description: 'View and manage your conversations with homeowners',
};

export default async function ContractorMessagesPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[600px]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-teal-500" /></div>}>
      <MessagesClient />
    </Suspense>
  );
}

