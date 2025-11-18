import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { MarketInsightsService } from '@/lib/services/MarketInsightsService';
import { MarketInsightsClient } from './components/MarketInsightsClient';
import { DashboardContentWrapper } from '@/app/contractor/dashboard-enhanced/components/DashboardContentWrapper';
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper';
import { OnboardingService } from '@/lib/services/OnboardingService';
import { theme } from '@/lib/theme';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Market Insights | Mintenance',
  description: 'Pricing trends, demand forecasting, and market analysis for contractors',
};

export default async function MarketInsightsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch onboarding status
  const onboardingStatus = await OnboardingService.checkOnboardingStatus(user.id);

  // Fetch market insights
  const insights = await MarketInsightsService.getMarketInsights(user.id);

  return (
    <OnboardingWrapper
      userRole="contractor"
      onboardingCompleted={onboardingStatus.completed}
    >
      <DashboardContentWrapper>
        <div
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            padding: theme.spacing[6],
            width: '100%',
          }}
        >
          <MarketInsightsClient insights={insights} contractorId={user.id} />
        </div>
      </DashboardContentWrapper>
    </OnboardingWrapper>
  );
}

