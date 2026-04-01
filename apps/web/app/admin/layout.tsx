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

  // SECURITY: Allow access to auth pages without authentication.
  // Check with startsWith to handle query params (e.g., /admin/login?redirect=...)
  const authRoutes = [
    '/admin/login',
    '/admin/register',
    '/admin/forgot-password',
  ];
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(route)
  );

  if (isAuthRoute) {
    // For auth routes, render without layout shell — no sidebar, no admin nav
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
