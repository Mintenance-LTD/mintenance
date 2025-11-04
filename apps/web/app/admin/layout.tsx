import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminLayoutShell } from '@/components/layouts/AdminLayoutShell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  return (
    <AdminLayoutShell user={user}>
      {children}
    </AdminLayoutShell>
  );
}

