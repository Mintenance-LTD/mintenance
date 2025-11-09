import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminLayoutShell } from '@/components/layouts/AdminLayoutShell';
import { headers } from 'next/headers';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get pathname from headers (set by middleware)
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  
  // Allow access to registration and login pages without authentication
  // These routes are in the (auth) route group but still go through this layout
  const isAuthRoute = pathname === '/admin/login' || pathname === '/admin/register';
  
  if (isAuthRoute) {
    // For auth routes, render without layout shell
    return <>{children}</>;
  }
  
  // For protected routes, check authentication
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

