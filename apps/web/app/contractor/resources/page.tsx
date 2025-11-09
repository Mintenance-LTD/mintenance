import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ResourcesPageClient } from './components/ResourcesPageClient';
import { DashboardContentWrapper } from '../dashboard-enhanced/components/DashboardContentWrapper';
import { OnboardingWrapper } from '@/components/OnboardingWrapper';
import { getOnboardingStatus } from '@/lib/onboarding';

export default async function ContractorResourcesPage() {
  const user = await getCurrentUserFromCookies();
  
  if (!user) {
    redirect('/login?redirect=/contractor/resources');
  }

  if (user.role !== 'contractor') {
    redirect('/dashboard');
  }

  const onboardingStatus = await getOnboardingStatus(user.id, 'contractor');

  return (
    <OnboardingWrapper
      userRole="contractor"
      onboardingCompleted={onboardingStatus.completed}
    >
      <DashboardContentWrapper>
        <ResourcesPageClient />
      </DashboardContentWrapper>
    </OnboardingWrapper>
  );
}

