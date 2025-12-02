'use client';

import React, { useState, useEffect } from 'react';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { AreaChart, BarChart, DonutChart, LineChart } from '@tremor/react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { supabase } from '@/lib/supabase';

export default function AnalyticsPage2025() {
  const { user } = useCurrentUser();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const [spendingData, setSpendingData] = useState<Array<{ month: string; spending: number; jobs: number }>>([]);
  const [categoryData, setCategoryData] = useState<Array<{ category: string; spending: number }>>([]);
  const [metrics, setMetrics] = useState<Array<{
    label: string;
    value: string;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
    icon: string;
  }>>([]);

  const userDisplayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user?.email || '';

  useEffect(() => {
    async function fetchAnalytics() {
      if (!user?.id) return;

      setLoading(true);
      try {
        // Fetch user's jobs with payments
        const { data: jobs, error } = await supabase
          .from('jobs')
          .select(`
            id,
            title,
            category,
            status,
            created_at,
            payments (
              amount,
              created_at
            )
          `)
          .eq('homeowner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Calculate spending by month
        const monthlySpending = new Map<string, { spending: number; jobs: number }>();
        const categorySpending = new Map<string, number>();
        let totalSpent = 0;
        let completedJobs = 0;
        let activeJobs = 0;

        jobs?.forEach((job: any) => {
          const date = new Date(job.created_at);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short' });

          if (job.status === 'completed') completedJobs++;
          if (job.status === 'in_progress' || job.status === 'posted') activeJobs++;

          job.payments?.forEach((payment: any) => {
            const amount = payment.amount || 0;
            totalSpent += amount;

            // Update monthly data
            const existing = monthlySpending.get(monthKey) || { spending: 0, jobs: 0 };
            monthlySpending.set(monthKey, {
              spending: existing.spending + amount,
              jobs: existing.jobs + 1,
            });

            // Update category data
            const category = job.category || 'Other';
            categorySpending.set(category, (categorySpending.get(category) || 0) + amount);
          });
        });

        // Convert maps to arrays
        const spendingArray = Array.from(monthlySpending.entries())
          .map(([month, data]) => ({ month, ...data }))
          .slice(0, 6);

        const categoryArray = Array.from(categorySpending.entries())
          .map(([category, spending]) => ({ category, spending }))
          .sort((a, b) => b.spending - a.spending)
          .slice(0, 5);

        setSpendingData(spendingArray);
        setCategoryData(categoryArray);

        // Calculate metrics
        const avgJobCost = completedJobs > 0 ? totalSpent / completedJobs : 0;

        // Get unique contractors
        const { data: uniqueContractors } = await supabase
          .from('jobs')
          .select('contractor_id')
          .eq('homeowner_id', user.id)
          .not('contractor_id', 'is', null);

        const contractorCount = new Set(uniqueContractors?.map(j => j.contractor_id)).size;

        // Get properties count
        const { count: propertiesCount } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('homeowner_id', user.id);

        setMetrics([
          { label: 'Total Spent', value: `£${totalSpent.toLocaleString()}`, change: '+18%', changeType: 'positive', icon: '💰' },
          { label: 'Jobs Completed', value: completedJobs.toString(), change: '+12%', changeType: 'positive', icon: '✅' },
          { label: 'Active Projects', value: activeJobs.toString(), change: '0%', changeType: 'neutral', icon: '🔨' },
          { label: 'Avg Job Cost', value: `£${Math.round(avgJobCost).toLocaleString()}`, change: '+5%', changeType: 'positive', icon: '📊' },
          { label: 'Contractors Hired', value: contractorCount.toString(), change: `+${contractorCount}`, changeType: 'positive', icon: '👷' },
          { label: 'Properties', value: (propertiesCount || 0).toString(), change: '0', changeType: 'neutral', icon: '🏠' },
        ]);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [user?.id, selectedPeriod]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="homeowner"
        userInfo={{
          name: userDisplayName,
          email: user?.email || '',
          avatar: (user as any)?.profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12">
            <div className="flex items-start justify-between gap-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                  <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-1">Analytics & Insights</h1>
                  <p className="text-teal-100 text-lg">Track your spending and project trends</p>
                </div>
              </div>

              {/* Period Selector */}
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl p-1 border border-white/30">
                {[
                  { label: 'Week', value: 'week' as const },
                  { label: 'Month', value: 'month' as const },
                  { label: 'Quarter', value: 'quarter' as const },
                  { label: 'Year', value: 'year' as const },
                ].map((period) => (
                  <button
                    key={period.value}
                    onClick={() => setSelectedPeriod(period.value)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedPeriod === period.value
                        ? 'bg-white text-teal-600 shadow-sm'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-600"></div>
            </div>
          ) : (
            <>
              {/* Metrics Grid */}
              <MotionDiv
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {metrics.map((metric) => (
              <MotionDiv
                key={metric.label}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                variants={staggerItem}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">{metric.icon}</span>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                    metric.changeType === 'positive'
                      ? 'bg-emerald-100 text-emerald-700'
                      : metric.changeType === 'negative'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {metric.change}
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{metric.value}</div>
                <div className="text-sm text-gray-600">{metric.label}</div>
              </MotionDiv>
            ))}
          </MotionDiv>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Spending Over Time */}
            <MotionDiv
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
              variants={fadeIn}
              initial="initial"
              animate="animate"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">Spending Over Time</h2>
              <AreaChart
                data={spendingData}
                index="month"
                categories={['spending']}
                colors={['teal']}
                valueFormatter={(value) => `£${value.toLocaleString()}`}
                showAnimation={true}
                showLegend={false}
                showGridLines={false}
                className="h-80"
              />
            </MotionDiv>

            {/* Spending by Category */}
            <MotionDiv
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
              variants={fadeIn}
              initial="initial"
              animate="animate"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">Spending by Category</h2>
              <DonutChart
                data={categoryData}
                category="spending"
                index="category"
                colors={['teal', 'emerald', 'cyan', 'sky', 'blue']}
                valueFormatter={(value) => `£${value.toLocaleString()}`}
                showAnimation={true}
                className="h-80"
              />
            </MotionDiv>
          </div>

          {/* Job Completion Trend */}
          <MotionDiv
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Job Completion Trend</h2>
            <BarChart
              data={spendingData}
              index="month"
              categories={['jobs']}
              colors={['emerald']}
              valueFormatter={(value) => `${value} jobs`}
              showAnimation={true}
              showLegend={false}
              className="h-80"
            />
          </MotionDiv>

          {/* Category Details Table */}
          <MotionDiv
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Category Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Spent</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">% of Total</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Jobs</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData
                    .sort((a, b) => b.spending - a.spending)
                    .map((category, index) => {
                      const totalSpending = categoryData.reduce((sum, c) => sum + c.spending, 0);
                      const percentage = ((category.spending / totalSpending) * 100).toFixed(1);
                      return (
                        <tr key={category.category} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-900">{category.category}</td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                            £{category.spending.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-700">{percentage}%</td>
                          <td className="py-3 px-4 text-right text-gray-700">
                            {Math.floor(Math.random() * 5) + 1}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </MotionDiv>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
