import { getCurrentUserFromCookies } from '@/lib/auth';
import { readVerificationQueueCounts } from '@/lib/admin/verification-queue';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import { redirect } from 'next/navigation';
import { VerificationClient } from './components/VerificationClient';

export const metadata = {
  title: 'Contractor Verifications | Admin | Mintenance',
};

export default async function AdminVerificationsPage() {
  const user = await getCurrentUserFromCookies();
  if (!user || user.role !== 'admin')
    redirect('/admin/login?redirect=%2Fadmin%2Fverifications');
  await requireAdminFromDatabase(user.id);
  const initialStats = await readVerificationQueueCounts();
  return <VerificationClient initialStats={initialStats} />;
}
