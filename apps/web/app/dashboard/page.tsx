import { headers } from 'next/headers';
import { getCurrentUserFromHeaders, getCurrentUserFromCookies } from '@/lib/auth';
import UnauthenticatedCard from '@/components/UnauthenticatedCard';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper';
import { PrimaryMetricCard2025 } from './components/PrimaryMetricCard2025';
import { WelcomeHero2025 } from './components/WelcomeHero2025';
import { RevenueChart2025 } from './components/RevenueChart2025';
import { ActiveJobsWidget2025 } from './components/ActiveJobsWidget2025';
import {
  KpiCard,
  QuickActionsCard,
  ActivityTimeline,
  StatsCard,
  EmptyStateCard,
} from '@/components/dashboard';
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
import {
  Briefcase,
  DollarSign,
  CheckCircle2,
  BookmarkCheck,
  PlusCircle,
  Search,
  MessageSquare,
  Calendar,
  Home,
  Clock,
  Users,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard | Mintenance',
  description: 'Manage your Mintenance account and projects',
};

export default async function DashboardPage2025() {
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
  const allBids = combineBidsAndQuotes(bids, quotes);

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

  // Prepare timeline events from recent activity
  const timelineEvents = [
    ...jobs.slice(0, 5).map((job) => ({
      id: `job-${job.id}`,
      type: 'job_posted' as const,
      title: 'Job Posted',
      description: job.title || 'Untitled Job',
      timestamp: job.created_at,
      href: `/jobs/${job.id}`,
      metadata: {
        jobTitle: job.title,
      },
    })),
    ...allBids.slice(0, 5).map((bid) => ({
      id: `bid-${bid.id}`,
      type: 'bid_received' as const,
      title: 'New Bid Received',
      description: `Received a bid for ${bid.job_title || 'your job'}`,
      timestamp: bid.created_at,
      href: `/jobs/${bid.job_id}`,
      metadata: {
        amount: bid.bid_amount || bid.total_amount,
        contractorName: bid.contractor_name,
      },
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  // Quick actions for homeowners
  const quickActions = [
    {
      label: 'Post New Job',
      href: '/jobs/create',
      icon: PlusCircle,
      variant: 'primary' as const,
    },
    {
      label: 'Browse Contractors',
      href: '/contractors',
      icon: Search,
      variant: 'secondary' as const,
    },
    {
      label: 'View Messages',
      href: '/messages',
      icon: MessageSquare,
      badge: 0,
    },
    {
      label: 'Schedule Meeting',
      href: '/scheduling/meetings',
      icon: Calendar,
    },
  ];

  // Recent contractors (saved or contacted)
  const recentContractors = allBids
    .filter((bid) => bid.contractor_name)
    .slice(0, 6)
    .map((bid) => ({
      id: bid.contractor_id || bid.id,
      name: bid.contractor_name || 'Unknown',
      rating: 4.8,
      skills: ['Plumbing', 'Electrical'],
    }));

  return (
    <OnboardingWrapper
      userRole="homeowner"
      onboardingCompleted={onboardingStatus.completed}
    >
      <div className="flex min-h-screen bg-gradient-subtle">
        {/* Unified Sidebar */}
        <UnifiedSidebar
          userRole="homeowner"
          userInfo={{
            name: homeownerProfile
              ? `${homeownerProfile.first_name} ${homeownerProfile.last_name}`.trim()
              : undefined,
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
              {/* Welcome Hero Section */}
              <WelcomeHero2025
                userName={userDisplayName}
                activeJobsCount={activeJobs.length}
                propertiesCount={properties.length}
              />

              {/* KPI Cards Row - 4 metrics */}
              <section
                aria-label="Key Performance Indicators"
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
              >
                <KpiCard
                  title="Active Jobs"
                  value={activeJobs.length}
                  subtitle={`${awaitingBids.length} awaiting bids`}
                  icon={Briefcase}
                  trend={{
                    value: '12%',
                    direction: activeJobs.length > 0 ? 'up' : 'neutral',
                  }}
                  href="/jobs"
                  color="blue"
                />
                <KpiCard
                  title="Total Spent"
                  value={`$${kpiData.jobsData.totalRevenue.toLocaleString()}`}
                  subtitle="This year"
                  icon={DollarSign}
                  trend={{
                    value: '8%',
                    direction: 'up',
                  }}
                  color="emerald"
                />
                <KpiCard
                  title="Completed Jobs"
                  value={completedJobs.length}
                  subtitle="All time"
                  icon={CheckCircle2}
                  trend={{
                    value: '5%',
                    direction: completedJobs.length > 0 ? 'up' : 'neutral',
                  }}
                  href="/jobs"
                  color="teal"
                />
                <KpiCard
                  title="Saved Contractors"
                  value={recentContractors.length}
                  subtitle="Recently contacted"
                  icon={BookmarkCheck}
                  color="purple"
                />
              </section>

              {/* Active Jobs + Quick Actions Row */}
              <div className="grid grid-cols-12 gap-6">
                {/* Left Column: Active Jobs Widget (2/3) */}
                <div className="col-span-12 lg:col-span-8">
                  <ActiveJobsWidget2025
                    jobs={activeJobs
                      .filter((job) => job.title)
                      .map((job) => ({
                        id: job.id,
                        title: job.title || 'Untitled Job',
                        status: job.status,
                        budget: job.budget,
                        scheduled_date: typeof job.scheduled_date === 'string' ? job.scheduled_date : undefined,
                        contractor_name: typeof job.contractor_name === 'string' ? job.contractor_name : undefined,
                      }))}
                  />
                </div>

                {/* Right Column: Quick Actions (1/3) */}
                <div className="col-span-12 lg:col-span-4">
                  <QuickActionsCard
                    title="Quick Actions"
                    subtitle="Get things done faster"
                    actions={quickActions}
                  />
                </div>
              </div>

              {/* Recent Activity Timeline */}
              <ActivityTimeline
                events={timelineEvents}
                title="Recent Activity"
                subtitle="Your latest updates and events"
                emptyMessage="No recent activity to show"
                maxItems={10}
              />

              {/* Upcoming Appointments + Recent Contractors Row */}
              <div className="grid grid-cols-12 gap-6">
                {/* Left Column: Upcoming Appointments (1/2) */}
                <div className="col-span-12 lg:col-span-6">
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">Upcoming Appointments</h2>
                        <p className="text-sm text-gray-500 mt-1">Scheduled meetings and calls</p>
                      </div>
                      <Calendar className="w-6 h-6 text-teal-600" />
                    </div>
                    {scheduledJobs.length === 0 ? (
                      <EmptyStateCard
                        title="No upcoming appointments"
                        description="Schedule meetings with contractors to discuss your projects"
                        icon={Calendar}
                        actionLabel="Schedule Meeting"
                        actionHref="/scheduling/meetings"
                        variant="minimal"
                      />
                    ) : (
                      <div className="space-y-3">
                        {scheduledJobs.slice(0, 4).map((job) => (
                          <div
                            key={job.id}
                            className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all cursor-pointer"
                          >
                            <div className="w-12 h-12 bg-teal-50 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                              <div className="text-xs font-semibold text-teal-600">
                                {new Date(job.scheduled_date).toLocaleDateString('en-US', { month: 'short' })}
                              </div>
                              <div className="text-lg font-bold text-teal-700">
                                {new Date(job.scheduled_date).getDate()}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
                                {job.title}
                              </h3>
                              <p className="text-xs text-gray-600">
                                {new Date(job.scheduled_date).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Recent Contractors (1/2) */}
                <div className="col-span-12 lg:col-span-6">
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">Recent Contractors</h2>
                        <p className="text-sm text-gray-500 mt-1">Saved and contacted</p>
                      </div>
                      <Users className="w-6 h-6 text-teal-600" />
                    </div>
                    {recentContractors.length === 0 ? (
                      <EmptyStateCard
                        title="No contractors yet"
                        description="Browse contractors and start connecting with professionals"
                        icon={Users}
                        actionLabel="Browse Contractors"
                        actionHref="/contractors"
                        variant="minimal"
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {recentContractors.map((contractor) => (
                          <div
                            key={contractor.id}
                            className="p-3 rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600">
                                {contractor.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm text-gray-900 truncate">
                                  {contractor.name}
                                </h3>
                                <div className="flex items-center gap-1 text-xs text-amber-600">
                                  <span>★</span>
                                  <span>{contractor.rating}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {contractor.skills.slice(0, 2).map((skill) => (
                                <span
                                  key={skill}
                                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Properties Overview - Only show if multiple properties */}
              {properties.length > 1 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Your Properties</h2>
                      <p className="text-sm text-gray-500 mt-1">Manage {properties.length} properties</p>
                    </div>
                    <Home className="w-6 h-6 text-teal-600" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {properties.slice(0, 6).map((property) => {
                      const propertyJobs = jobs.filter((job) => job.property_id === property.id);
                      const activePropertyJobs = propertyJobs.filter((job) =>
                        job.status === 'in_progress' || job.status === 'assigned'
                      );

                      return (
                        <div
                          key={property.id}
                          className="p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Home className="w-6 h-6 text-teal-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
                                {property.address}
                              </h3>
                              <p className="text-xs text-gray-500 mb-2">
                                {property.city}, {property.state || property.country}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-teal-700">
                                  {activePropertyJobs.length} active {activePropertyJobs.length === 1 ? 'job' : 'jobs'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </OnboardingWrapper>
  );
}
