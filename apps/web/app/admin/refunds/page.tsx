import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { RefundManagementClient } from './components/RefundManagementClient';

export const metadata = {
  title: 'Refund & Payout Management | Admin | Mintenance',
};

export default async function AdminRefundsPage() {
  const user = await getCurrentUserFromCookies();
  if (!user || user.role !== 'admin') redirect('/login');
  return <RefundManagementClient adminId={user.id} />;
}
