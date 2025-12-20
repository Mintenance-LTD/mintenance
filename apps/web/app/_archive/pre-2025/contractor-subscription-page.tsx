import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
import { TrialService } from '@/lib/services/subscription/TrialService';
import { SubscriptionClient } from './components/SubscriptionClient';

export const metadata = {
  title: 'Subscription | Mintenance',
  description: 'Manage your subscription and billing',
};

export default async function SubscriptionPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch subscription and trial data
  const [subscription, trialStatus, plans] = await Promise.all([
    SubscriptionService.getContractorSubscription(user.id),
    TrialService.getTrialStatus(user.id),
    SubscriptionService.getAvailablePlans(),
  ]);

  return (
    <SubscriptionClient
      subscription={subscription}
      trialStatus={trialStatus}
      plans={plans}
      contractorId={user.id}
    />
  );
}

