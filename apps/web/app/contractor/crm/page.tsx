import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CRMDashboardClient } from './components/CRMDashboardClient';

export default async function CRMDashboardPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const clients: any[] = [];
  const analytics = {
    total_clients: 0,
    new_clients_this_month: 0,
    repeat_clients: 0,
    client_lifetime_value: 0,
  };

  return <CRMDashboardClient clients={clients} analytics={analytics} />;
}
