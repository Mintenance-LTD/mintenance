import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
import { TrialService } from '@/lib/services/subscription/TrialService';
import { getEarlyAccessEntitlement } from '@/lib/subscription/early-access';
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

  // 2026-05-28 audit-89 P1: early-access founding-member grant. The
  // back-end fee logic at FeeCalculationService.resolveContractorTier
  // already treats grant holders as 'enterprise' tier (5% per-job
  // platform fee, no monthly subscription) — but this page never
  // surfaced that to the user. Grant holders saw the generic trial
  // countdown + Basic/Business/Professional upsell cards even though
  // they don't need to subscribe. Fetch the grant so the client can
  // render an honest founding-member card instead.
  const [subscription, trialStatus, plans, earlyAccess] = await Promise.all([
    SubscriptionService.getContractorSubscription(user.id),
    TrialService.getTrialStatus(user.id),
    SubscriptionService.getAvailablePlans(),
    getEarlyAccessEntitlement(user.id),
  ]);

  const isEarlyAccessContractor =
    earlyAccess.eligible && earlyAccess.role === 'contractor';

  return (
    <ContractorPageWrapper>
      <SubscriptionClient
        subscription={subscription}
        trialStatus={trialStatus}
        plans={plans}
        contractorId={user.id}
        earlyAccess={isEarlyAccessContractor}
      />
    </ContractorPageWrapper>
  );
}
