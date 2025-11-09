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
  
  return <MessagesClient />;
}

