import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
import { TrialService } from '@/lib/services/subscription/TrialService';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import { SubscriptionClient } from './components/SubscriptionClient';

export default async function ContractorSubscriptionPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/contractor/subscription');
  }

  if (user.role !== 'contractor') {
    redirect('/pricing');
  }

  const [subscription, trialStatus, plans] = await Promise.all([
    SubscriptionService.getContractorSubscription(user.id),
    TrialService.getTrialStatus(user.id),
    SubscriptionService.getAvailablePlans(),
  ]);

  return (
    <ContractorPageWrapper>
      <SubscriptionClient
        subscription={subscription}
        trialStatus={trialStatus}
        plans={plans}
        contractorId={user.id}
      />
    </ContractorPageWrapper>
  );
}

