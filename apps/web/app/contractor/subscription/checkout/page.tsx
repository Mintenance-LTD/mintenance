import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SubscriptionCheckoutClient } from './components/SubscriptionCheckoutClient';

export const metadata = {
  title: 'Complete Subscription | Mintenance',
  description: 'Complete your subscription payment',
};

export default async function SubscriptionCheckoutPage({
  searchParams,
}: {
  searchParams: { clientSecret?: string; subscriptionId?: string; planType?: string };
}) {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  if (!searchParams.clientSecret || !searchParams.subscriptionId) {
    redirect('/contractor/subscription');
  }

  return (
    <SubscriptionCheckoutClient
      clientSecret={searchParams.clientSecret}
      subscriptionId={searchParams.subscriptionId}
      planType={searchParams.planType || 'basic'}
    />
  );
}

