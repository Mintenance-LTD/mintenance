import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DisputesClient } from './components/DisputesClient';

export const metadata = {
  title: 'Disputes Resolution | Admin | Mintenance',
  description:
    'Review and resolve payment disputes between homeowners and contractors',
};

export default async function AdminDisputesPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/admin/login');
  }

  return <DisputesClient />;
}
