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

              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-base text-gray-500">Here's what's happening with your properties today</p>
              </div>

              {/* Top Row: 4 Primary Metric Cards */}
              <section aria-label="Key Performance Indicators" className="grid grid-cols-12 gap-6">
                {primaryMetrics.map((metric) => (
                  <div key={metric.key} className="col-span-12 sm:col-span-6 xl:col-span-3">
                    <PrimaryMetricCard metric={metric} />
                  </div>
                ))}
              </section>

              {/* Middle Row: Current Job Status */}
              <section className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Current Job Status</h2>
                    {activeJobs.length > 0 ? (
                      <p className="text-sm text-gray-500 mt-1">Tracking progress for: <span className="font-medium text-primary-600">{activeJobs[0].title}</span></p>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">No active jobs currently.</p>
                    )}
                  </div>
                  {activeJobs.length > 0 && (
                    <Link href={`/jobs/${activeJobs[0].id}`}>
                      <Button variant="outline" size="sm">View Details</Button>
                    </Link>
                  )}
                </div>
                {activeJobs.length > 0 ? (
                  <JobStatusStepper currentStatus={activeJobs[0].status as any || 'in_progress'} />
                ) : (
                  <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p>No active jobs to track.</p>
                    <Link href="/jobs/create" className="text-primary-600 hover:underline text-sm mt-2 inline-block">Post a new job</Link>
                  </div>
                )}
              </section>

              {/* Bottom Row: Revenue Overview Chart */}
              <section className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Revenue Overview</h2>
                </div>
                <div className="h-[300px] w-full">
                  {/* Re-using LargeChart but ensuring it fits the container cleanly */}
                  <LargeChart
                    title="" // Title handled by section header
                    subtitle=""
                    data={[
                      { label: 'Jan', value: totalRevenue * 0.2 },
                      { label: 'Feb', value: totalRevenue * 0.3 },
                      { label: 'Mar', value: totalRevenue * 0.5 },
                      { label: 'Apr', value: totalRevenue * 0.4 },
                      { label: 'May', value: totalRevenue * 0.6 },
                      { label: 'Jun', value: totalRevenue * 0.8 },
                      { label: 'Jul', value: totalRevenue },
                      { label: 'Aug', value: totalRevenue * 0.9 },
                      { label: 'Sep', value: totalRevenue * 1.1 },
                      { label: 'Oct', value: totalRevenue * 1.2 },
                      { label: 'Nov', value: totalRevenue * 1.0 },
                      { label: 'Dec', value: totalRevenue * 1.3 },
                    ]}
                  />
                </div>
              </section>

            </div>
          </div>
        </main>
      </div>
    </OnboardingWrapper>
  );
}
