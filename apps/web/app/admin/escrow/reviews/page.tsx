import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EscrowReviewDashboardClient } from './components/EscrowReviewDashboardClient';

export const metadata = {
  title: 'Escrow Review | Mintenance Admin',
  description: 'Review and approve escrow releases',
};

export default async function EscrowReviewPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/admin/login');
  }

  return <EscrowReviewDashboardClient />;
}

