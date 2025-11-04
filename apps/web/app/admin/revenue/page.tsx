import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { RevenueAnalytics } from '@/lib/services/revenue/RevenueAnalytics';
import { RevenueDashboardClient } from './components/RevenueDashboardClient';

export const metadata = {
  title: 'Revenue Analytics | Mintenance Admin',
  description: 'Revenue and subscription analytics dashboard',
};

export default async function RevenueDashboardPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  // Fetch revenue data
  const [revenueMetrics, mrr, conversionRate, arpc, trends] = await Promise.all([
    RevenueAnalytics.getRevenueMetrics(),
    RevenueAnalytics.getMRR(),
    RevenueAnalytics.getTrialConversionRate(),
    RevenueAnalytics.getARPC(),
    RevenueAnalytics.getRevenueTrends(30),
  ]);

  return (
    <RevenueDashboardClient
      revenueMetrics={revenueMetrics}
      mrr={mrr}
      conversionRate={conversionRate}
      arpc={arpc}
      trends={trends}
    />
  );
}

