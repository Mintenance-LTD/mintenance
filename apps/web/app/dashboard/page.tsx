import { headers } from 'next/headers';
import Link from 'next/link';
import { getCurrentUserFromHeaders, getCurrentUserFromCookies } from '@/lib/auth';
import UnauthenticatedCard from '@/components/UnauthenticatedCard';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { theme } from '@/lib/theme';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { ActivityFeed } from './components/ActivityFeed';
import { LargeChart } from './components/LargeChart';
import { BarChartsSection } from './components/BarChartsSection';
import './components/bento-grid.css';
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper';
import type { Metadata } from 'next';
import { fetchDashboardData } from './lib/data-fetching';
import {
  combineBidsAndQuotes,
  filterJobsByStatus,
  calculateKpiData,
  generateMetrics,
  prepareUpcomingJobs,
  prepareUpcomingEstimates,
  prepareRecentActivities,
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
    recentActivity,
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

  const recentActivities = prepareRecentActivities(
    jobs,
    allBids,
    recentActivity,
    payments,
    subscriptions
  );

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
        <main className="flex flex-col flex-1 w-[calc(100%-280px)] ml-[280px] transition-[width] duration-300 ease-out">
          {/* Header */}
          <DashboardHeader userName={userDisplayName} userId={user.id} secondaryMetrics={secondaryMetrics} />

          {/* Page Content */}
          <div className="max-w-[1440px] m-0 p-6 w-full box-border">
            <div className="flex flex-col gap-6">
              {/* Header */}
              <section aria-labelledby="dashboard-welcome" className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 rounded-2xl p-8 mb-6 border border-primary-700/50 shadow-xl">
                {/* Decorative Elements */}
                <div aria-hidden="true" className="absolute top-0 right-0 w-64 h-64 bg-secondary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div aria-hidden="true" className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

                <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <h1 id="dashboard-welcome" className="text-heading-md font-[640] text-white mb-3 tracking-tighter">
                      Hi, {homeownerProfile?.first_name || 'Alex'}
                    </h1>
                    <p className="text-base font-[460] text-gray-300 leading-[1.5]">
                      Here's what's happening with your properties today
                    </p>
                  </div>
                  <Link
                    href="/jobs/create"
                    className="block"
                    aria-label="Post a new job"
                  >
                    <Button variant="primary" leftIcon={<Plus className="h-[18px] w-[18px]" aria-hidden="true" />}>
                      Post New Job
                    </Button>
                  </Link>
                </div>
              </section>

              {/* Modern Grid Layout - Inspired by Aura.build */}
              <div className="space-y-6">
                {/* Top Row: KPI Cards - Modern Grid */}
                <section aria-label="Key Performance Indicators" className="grid grid-cols-12 gap-6">
                  {primaryMetrics.slice(0, 4).map((metric) => (
                    <div key={metric.key} className="col-span-12 sm:col-span-6 xl:col-span-3">
                      <article className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full group relative overflow-hidden">
                        <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
                        <div className="flex flex-col justify-between h-full">
                          <div>
                            <h3 className="text-xs font-[560] text-gray-600 mb-2 uppercase tracking-wider">
                              {metric.label}
                            </h3>
                            <div className="text-3xl font-[640] text-gray-900 mb-1 tracking-tight">
                              {metric.value}
                            </div>
                            {metric.subtitle && (
                              <div className="text-xs font-[460] text-gray-500 mt-1">
                                {metric.subtitle}
                              </div>
                            )}
                          </div>
                          {metric.trend && (
                            <div className={`inline-flex items-center gap-1.5 mt-4 px-2.5 py-1 rounded-lg text-xs font-[560] w-fit ${metric.trend.direction === 'up'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                              }`}>
                              <span aria-hidden="true">{metric.trend.direction === 'up' ? '↑' : '↓'}</span>
                              <span className="sr-only">{metric.trend.direction === 'up' ? 'Increased by' : 'Decreased by'}</span>
                              {metric.trend.value}
                            </div>
                          )}
                        </div>
                      </article>
                    </div>
                  ))}
                </section>

                {/* Second Row: Large Chart & Additional KPIs */}
                <div className="grid grid-cols-12 gap-6">
                  {/* Large Chart - Takes 8 columns */}
                  <div className="col-span-12 xl:col-span-8">
                    <LargeChart
                      title="Revenue Overview"
                      subtitle="Last 6 months"
                      data={[
                        { label: 'Jan', value: totalRevenue * 0.7 },
                        { label: 'Feb', value: totalRevenue * 0.8 },
                        { label: 'Mar', value: totalRevenue * 0.75 },
                        { label: 'Apr', value: totalRevenue * 0.9 },
                        { label: 'May', value: totalRevenue * 0.85 },
                        { label: 'Jun', value: totalRevenue },
                      ]}
                    />
                  </div>

                  {/* Additional KPI Cards - Takes 4 columns */}
                  <section aria-label="Additional Metrics" className="col-span-12 xl:col-span-4 space-y-6">
                    {primaryMetrics.slice(4, 6).map((metric) => (
                      <article key={metric.key} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden">
                        <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
                        <div className="flex flex-col justify-between h-full">
                          <div>
                            <h3 className="text-xs font-[560] text-gray-600 mb-2 uppercase tracking-wider">
                              {metric.label}
                            </h3>
                            <div className="text-3xl font-[640] text-gray-900 mb-1 tracking-tight">
                              {metric.value}
                            </div>
                            {metric.subtitle && (
                              <div className="text-xs font-[460] text-gray-500 mt-1">
                                {metric.subtitle}
                              </div>
                            )}
                          </div>
                          {metric.trend && (
                            <div className={`inline-flex items-center gap-1.5 mt-4 px-2.5 py-1 rounded-lg text-xs font-[560] w-fit ${metric.trend.direction === 'up'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                              }`}>
                              <span aria-hidden="true">{metric.trend.direction === 'up' ? '↑' : '↓'}</span>
                              <span className="sr-only">{metric.trend.direction === 'up' ? 'Increased by' : 'Decreased by'}</span>
                              {metric.trend.value}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </section>
                </div>

                {/* Third Row: Bar Charts & Activity Feed */}
                <div className="grid grid-cols-12 gap-6">
                  {/* Bar Charts - Takes 6 columns */}
                  <div className="col-span-12 xl:col-span-6">
                    <BarChartsSection
                      jobsData={[
                        { label: 'Mon', value: activeJobs.length + 2, color: theme.colors.primary },
                        { label: 'Tue', value: activeJobs.length + 5, color: theme.colors.primary },
                        { label: 'Wed', value: activeJobs.length + 3, color: theme.colors.primary },
                        { label: 'Thu', value: activeJobs.length + 7, color: theme.colors.primary },
                        { label: 'Fri', value: activeJobs.length + 4, color: theme.colors.primary },
                        { label: 'Sat', value: activeJobs.length + 1, color: theme.colors.primary },
                        { label: 'Sun', value: activeJobs.length, color: theme.colors.primary },
                      ]}
                      revenueData={[
                        { label: 'Week 1', value: totalRevenue * 0.2, color: theme.colors.success },
                        { label: 'Week 2', value: totalRevenue * 0.25, color: theme.colors.success },
                        { label: 'Week 3', value: totalRevenue * 0.22, color: theme.colors.success },
                        { label: 'Week 4', value: totalRevenue * 0.3, color: theme.colors.success },
                      ]}
                    />
                  </div>

                  {/* Activity Feed - Takes 6 columns */}
                  <div className="col-span-12 xl:col-span-6">
                    <ActivityFeed activities={recentActivities} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </OnboardingWrapper>
  );
}
