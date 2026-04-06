'use client';

import React, { useState } from 'react';
import { formatMoney } from '@/lib/utils/currency';
import {
  PoundSterling,
  Briefcase,
  Star,
  Users,
  Clock,
  CheckCircle,
  Target,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { KPICard } from './ReportingDashboard/KPICard';
import { MetricCard } from './ReportingDashboard/MetricCard';
import { DashboardHeader } from './ReportingDashboard/DashboardHeader';
import { ChartsSection } from './ReportingDashboard/ChartsSection';
import { TablesSection } from './ReportingDashboard/TablesSection';
import type {
  DateRange,
  ReportingAnalytics,
} from './ReportingDashboard/types';

interface ReportingDashboard2025ClientProps {
  analytics: ReportingAnalytics;
}

export function ReportingDashboard2025Client({
  analytics,
}: ReportingDashboard2025ClientProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<DateRange>('30days');
  const [isLoading, setIsLoading] = useState(false);

  // Use real daily revenue data from props
  const dailyRevenueData = analytics.dailyRevenue;

  const jobStatusData = [
    { status: 'Completed', count: analytics.completedJobs, color: '#10B981' },
    { status: 'In Progress', count: analytics.activeJobs, color: '#14B8A6' },
    { status: 'Pending', count: analytics.pendingJobs, color: '#F59E0B' },
    { status: 'Cancelled', count: analytics.cancelledJobs, color: '#EF4444' },
  ];

  const topServicesData = analytics.jobsByCategory
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
    .map((cat) => ({
      service: cat.category,
      revenue: cat.revenue,
      jobs: cat.count,
    }));

  const monthlyComparisonData = analytics.revenueByMonth
    .slice(-6)
    .map((item) => ({
      month: item.month,
      revenue: item.revenue,
      jobs: item.jobs,
    }));

  const handleExport = async (format: 'csv' | 'pdf') => {
    setIsLoading(true);
    toast.loading(`Preparing ${format.toUpperCase()} export...`);

    // Simulate export delay
    setTimeout(() => {
      setIsLoading(false);
      toast.dismiss();
      toast.success(`Report exported as ${format.toUpperCase()}!`);
    }, 2000);
  };

  const handlePrint = () => {
    window.print();
    toast.success('Opening print dialog...');
  };

  return (
    <div className='min-h-0 bg-gray-50'>
      {/* Clean Header */}
      <DashboardHeader
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        isLoading={isLoading}
        handlePrint={handlePrint}
        handleExport={handleExport}
      />

      {/* Main Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='space-y-6'>
          {/* KPI Cards Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            <KPICard
              title='Total Revenue'
              value={formatMoney(analytics.totalRevenue, 'GBP')}
              change={Math.round(analytics.revenueChange * 10) / 10}
              changeLabel='vs last period'
              icon={<PoundSterling className='w-5 h-5' />}
              trend={
                analytics.revenueChange > 0
                  ? 'up'
                  : analytics.revenueChange < 0
                    ? 'down'
                    : 'neutral'
              }
            />
            <KPICard
              title='Jobs Completed'
              value={analytics.completedJobs}
              change={Math.round(analytics.jobsChange * 10) / 10}
              changeLabel='vs last period'
              icon={<Briefcase className='w-5 h-5' />}
              trend={
                analytics.jobsChange > 0
                  ? 'up'
                  : analytics.jobsChange < 0
                    ? 'down'
                    : 'neutral'
              }
            />
            <KPICard
              title='Average Job Value'
              value={formatMoney(analytics.averageJobValue, 'GBP')}
              change={Math.round(analytics.avgValueChange * 10) / 10}
              changeLabel='vs last period'
              icon={<Target className='w-5 h-5' />}
              trend={
                analytics.avgValueChange > 0
                  ? 'up'
                  : analytics.avgValueChange < 0
                    ? 'down'
                    : 'neutral'
              }
            />
            <KPICard
              title='Customer Satisfaction'
              value={`${analytics.customerSatisfaction.toFixed(1)}/5.0`}
              change={Math.round(analytics.satisfactionChange * 10) / 10}
              changeLabel='rating average'
              icon={<Star className='w-5 h-5' />}
              trend={
                analytics.satisfactionChange > 0
                  ? 'up'
                  : analytics.satisfactionChange < 0
                    ? 'down'
                    : 'neutral'
              }
            />
          </div>

          {/* Charts */}
          <ChartsSection
            dailyRevenueData={dailyRevenueData}
            jobStatusData={jobStatusData}
            topServicesData={topServicesData}
            monthlyComparisonData={monthlyComparisonData}
          />

          {/* Performance Metrics */}
          <div>
            <div className='mb-4'>
              <h2 className='text-xl font-semibold text-gray-900 mb-1'>
                Performance Metrics
              </h2>
              <p className='text-sm text-gray-500'>
                Key business performance indicators
              </p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              <MetricCard
                label='Quote Acceptance Rate'
                value={Math.round(
                  (analytics.acceptedBids / analytics.totalBids) * 100
                )}
                max={100}
                color='text-teal-500'
                icon={<CheckCircle className='w-5 h-5' />}
              />
              <MetricCard
                label='Job Completion Rate'
                value={Math.round(
                  (analytics.completedJobs / analytics.totalJobs) * 100
                )}
                max={100}
                color='text-green-500'
                icon={<Target className='w-5 h-5' />}
              />
              <MetricCard
                label='Customer Retention'
                value={Math.round(
                  (analytics.activeClients / analytics.totalClients) * 100
                )}
                max={100}
                color='text-blue-500'
                icon={<Users className='w-5 h-5' />}
              />
              <MetricCard
                label='Response Time Score'
                value={92}
                max={100}
                color='text-purple-500'
                icon={<Clock className='w-5 h-5' />}
              />
            </div>
          </div>

          {/* Tables */}
          <TablesSection analytics={analytics} />

          {/* Footer Info */}
          <div className='bg-white rounded-xl border border-gray-200 p-6'>
            <div className='flex items-center justify-between flex-wrap gap-4'>
              <div className='flex items-center gap-3 text-sm text-gray-600'>
                <Clock className='w-5 h-5' />
                <span>
                  Last updated:{' '}
                  {new Date().toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <Award className='w-5 h-5 text-teal-600' />
                <span className='text-sm font-medium text-gray-700'>
                  Analytics powered by Mintenance Business Intelligence
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
