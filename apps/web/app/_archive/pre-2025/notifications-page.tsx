import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NotificationsClient } from './components/NotificationsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications | Mintenance',
  description: 'View and manage your notifications',
};

export default async function NotificationsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login');
  }

  return <NotificationsClient user={user} />;
}
