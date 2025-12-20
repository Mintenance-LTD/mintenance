import { headers } from 'next/headers';
import Link from 'next/link';
import { getCurrentUserFromHeaders, getCurrentUserFromCookies } from '@/lib/auth';
import UnauthenticatedCard from '@/components/UnauthenticatedCard';
import { Button } from '@/components/ui/Button';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { LargeChart } from './components/LargeChart';
import { JobStatusStepper } from './components/JobStatusStepper';
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper';
import { PrimaryMetricCard } from './components/PrimaryMetricCard';
import { PrimaryMetricCard2025 } from './components/PrimaryMetricCard2025';
import { WelcomeHero2025 } from './components/WelcomeHero2025';
import { RevenueChart2025 } from './components/RevenueChart2025';
import { ActiveJobsWidget2025 } from './components/ActiveJobsWidget2025';
import type { Metadata } from 'next';
import { fetchDashboardData } from './lib/data-fetching';
import {
  combineBidsAndQuotes,
  filterJobsByStatus,
  calculateKpiData,
  generateMetrics,
  prepareUpcomingJobs,
  prepareUpcomingEstimates,
} from './lib/data-processing';

export const metadata: Metadata = {
  title: 'Dashboard | Mintenance',
  description: 'Manage your Mintenance account and projects',
};

export default async function DashboardPage() {
  const headersList = await headers();

  let user = getCurrentUserFromHeaders(headersList as unknown as Headers);
  if (!user) {
    user = await getCurrentUserFromCookies();
  }

  if (!user) {
    return <UnauthenticatedCard />;
  }

  // Redirect contractors to their enhanced dashboard
  if (user.role === 'contractor') {
    const { redirect } = await import('next/navigation');
    redirect('/contractor/dashboard-enhanced');
  }

  // Fetch all dashboard data
  const dashboardData = await fetchDashboardData(user.id);
  const {
    homeownerProfile,
    jobs,
    bids,
    quotes,
    properties,
    subscriptions,
    payments,
    onboardingStatus,
  } = dashboardData;

  // Process data
  const allBids = combineBidsAndQuotes(
    bids,
    quotes
  );

  const {
    activeJobs,
    completedJobs,
    postedJobs,
    awaitingBids,
    scheduledJobs,
  } = filterJobsByStatus(jobs);

  const kpiData = calculateKpiData(
    jobs,
    allBids,
    properties,
    subscriptions,
    payments,
    completedJobs,
    scheduledJobs
  );

  const { primaryMetrics, secondaryMetrics } = generateMetrics(kpiData);

  const { upcomingJobs, upcomingJobsDate } = prepareUpcomingJobs(scheduledJobs);
  const { upcomingEstimates, upcomingEstimatesDate } = prepareUpcomingEstimates(allBids);

  const userDisplayName = homeownerProfile
    ? `${homeownerProfile.first_name} ${homeownerProfile.last_name}`.trim() || user.email
    : user.email;

  const totalRevenue = kpiData.jobsData.totalRevenue;

  // ✅ FIXED: Get real monthly revenue data instead of hardcoded multipliers
  const { getMonthlyRevenue } = await import('./lib/revenue-queries');
  const monthlyRevenue = await getMonthlyRevenue(user.id, 12, 'spending');

  // Prepare chart data from real database aggregations
  const chartData = monthlyRevenue.map((month) => ({
    label: month.month,
    value: month.total,
  }));

  return (
    <OnboardingWrapper
      userRole="homeowner"
      onboardingCompleted={onboardingStatus.completed}
    >
      <div className="flex min-h-screen bg-gray-50">
        {/* Unified Sidebar */}
        <UnifiedSidebar
          userRole="homeowner"
          userInfo={{
            name: homeownerProfile ? `${homeownerProfile.first_name} ${homeownerProfile.last_name}`.trim() : undefined,
            email: homeownerProfile?.email || user.email,
            avatar: homeownerProfile?.profile_image_url,
          }}
        />

        {/* Main Content */}
        <main className="flex flex-col flex-1 w-[calc(100%-240px)] ml-[240px] transition-[width] duration-300 ease-out">
          {/* Header */}
          <DashboardHeader
            userName={userDisplayName}
            userId={user.id}
            userAvatar={homeownerProfile?.profile_image_url}
            secondaryMetrics={secondaryMetrics}
          />

          {/* Page Content */}
          <div className="max-w-[1600px] m-0 p-8 w-full box-border">
            <div className="flex flex-col gap-8">

              {/* Welcome Hero Section - 2025 */}
              <WelcomeHero2025
                userName={userDisplayName}
                activeJobsCount={activeJobs.length}
                propertiesCount={properties.length}
              />

              {/* Primary Metrics Grid - 2025 */}
              <section aria-label="Key Performance Indicators" className="grid grid-cols-12 gap-6">
                {primaryMetrics.map((metric) => (
                  <div key={metric.key} className="col-span-12 sm:col-span-6 xl:col-span-3">
                    <PrimaryMetricCard2025 metric={metric} />
                  </div>
                ))}
              </section>

              {/* Two Column Layout - 2025 */}
              <div className="grid grid-cols-12 gap-6">
                {/* Left Column: Active Jobs Widget */}
                <div className="col-span-12 lg:col-span-5">
                  <ActiveJobsWidget2025
                    jobs={activeJobs.map((job) => ({
                      id: job.id,
                      title: job.title,
                      status: job.status,
                      budget: job.budget,
                      scheduled_date: job.scheduled_date,
                      contractor_name: (job as any).contractor_name,
                    }))}
                  />
                </div>

                {/* Right Column: Revenue Chart - 2025 */}
                <div className="col-span-12 lg:col-span-7">
                  <RevenueChart2025
                    data={chartData}
                    totalRevenue={totalRevenue}
                  />
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </OnboardingWrapper>
  );
}
