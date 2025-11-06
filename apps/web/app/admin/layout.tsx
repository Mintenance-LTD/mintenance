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
    redirect('/admin/login');
  }

  // At this point we know user.role is 'admin' due to the check above
  return (
    <AdminLayoutShell user={user as typeof user & { role: 'admin' }}>
      {children}
    </AdminLayoutShell>
  );
}

