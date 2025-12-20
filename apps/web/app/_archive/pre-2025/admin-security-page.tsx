import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SecurityDashboard } from '@/components/admin/SecurityDashboard';

export const metadata = {
  title: 'Security Dashboard | Mintenance Admin',
  description: 'Security monitoring and threat detection dashboard',
};

export default async function SecurityPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/admin/login');
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto' }}>
      <SecurityDashboard />
    </div>
  );
}

