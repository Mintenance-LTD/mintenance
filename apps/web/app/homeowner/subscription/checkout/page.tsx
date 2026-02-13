import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SubscriptionCheckoutClient } from '@/app/contractor/subscription/checkout/components/SubscriptionCheckoutClient';

export const metadata = {
  title: 'Complete Homeowner Premium | Mintenance',
  description: 'Complete your homeowner premium subscription payment',
};

export default async function HomeownerSubscriptionCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ clientSecret?: string; subscriptionId?: string; planType?: string }>;
}) {
  const { clientSecret, subscriptionId, planType } = await searchParams;
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'homeowner') {
    redirect('/login');
  }

  if (!clientSecret || !subscriptionId) {
    redirect('/pricing?type=homeowner');
  }

  return (
    <SubscriptionCheckoutClient
      clientSecret={clientSecret}
      subscriptionId={subscriptionId}
      planType={planType || 'premium'}
      returnUrl={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/homeowner/subscription?success=true`}
      successRedirectPath="/homeowner/subscription?success=true"
    />
  );
}
