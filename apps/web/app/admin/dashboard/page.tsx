import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Admin Dashboard | Mintenance',
  description: 'Administrative dashboard',
};

/**
 * /admin/dashboard redirects to /admin (the canonical dashboard route).
 * DashboardClient is rendered by /admin/page.tsx with server-fetched metrics.
 */
export default function DashboardRedirect() {
  redirect('/admin');
}
