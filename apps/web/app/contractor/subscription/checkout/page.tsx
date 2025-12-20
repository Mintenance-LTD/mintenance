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
  searchParams: Promise<{ clientSecret?: string; subscriptionId?: string; planType?: string }>;
}) {
  const { clientSecret, subscriptionId, planType } = await searchParams;
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  if (!clientSecret || !subscriptionId) {
    redirect('/contractor/subscription');
  }

  return (
    <SubscriptionCheckoutClient
      clientSecret={clientSecret}
      subscriptionId={subscriptionId}
      planType={planType || 'basic'}
    />
  );
}

