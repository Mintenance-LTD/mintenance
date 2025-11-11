import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EscrowStatusDashboardClient } from './components/EscrowStatusDashboardClient';

export const metadata = {
  title: 'Escrow Status | Mintenance Contractor',
  description: 'View escrow status and release timeline',
};

export default async function EscrowStatusPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  return <EscrowStatusDashboardClient />;
}

