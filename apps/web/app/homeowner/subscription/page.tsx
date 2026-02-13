import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { HomeownerSubscriptionClient } from './subscription-client';

export const metadata: Metadata = {
  title: 'Homeowner Subscription | Mintenance',
  description: 'Manage your homeowner premium subscription.',
};

export default async function HomeownerSubscriptionPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/homeowner/subscription');
  }

  if (user.role !== 'homeowner') {
    redirect('/pricing?type=homeowner');
  }

  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email;

  return (
    <HomeownerSubscriptionClient
      user={{
        id: user.id,
        name: displayName,
        email: user.email,
      }}
    />
  );
}

