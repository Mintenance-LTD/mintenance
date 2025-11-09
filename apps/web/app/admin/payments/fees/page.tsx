import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FeeTransferManagementClient } from './components/FeeTransferManagementClient';

export const metadata = {
  title: 'Fee Transfer Management | Mintenance Admin',
  description: 'Manage platform fee transfers and holds',
};

export default async function FeeTransferManagementPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  return <FeeTransferManagementClient />;
}

