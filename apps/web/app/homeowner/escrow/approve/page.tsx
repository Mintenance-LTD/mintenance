import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { HomeownerApprovalClient } from './components/HomeownerApprovalClient';

export const metadata = {
  title: 'Approve Completion | Mintenance',
  description: 'Review and approve job completion',
};

export default async function HomeownerApprovalPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || (user.role !== 'homeowner' && user.role !== 'admin')) {
    redirect('/login');
  }

  return <HomeownerApprovalClient />;
}

