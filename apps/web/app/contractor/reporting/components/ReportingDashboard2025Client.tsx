'use client';

import React, { useState } from 'react';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { formatMoney } from '@/lib/utils/currency';
import {
  DynamicAreaChart,
  DynamicBarChart,
  DynamicPieChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Pie,
  Cell
} from '@/components/charts/DynamicCharts';
import {
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  BarChart3,
  PoundSterling,
  Briefcase,
  Star,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  Target,
  Award,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ReportingDashboard2025ClientProps {
  analytics: {
    totalJobs: number;
    completedJobs: number;
    activeJobs: number;
    pendingJobs: number;
    cancelledJobs: number;
    totalRevenue: number;
    totalClients: number;
    activeClients: number;
    averageJobValue: number;
    customerSatisfaction: number;
    jobsByCategory: Array<{ category: string; count: number; revenue: number }>;
    revenueByMonth: Array<{ month: string; revenue: number; jobs: number }>;
    topClients: Array<{ name: string; revenue: number; jobs: number }>;
    totalBids: number;
    acceptedBids: number;
    winRate: number;
    dailyRevenue: Array<{ date: string; revenue: number; jobs: number }>;
    revenueChange: number;
    jobsChange: number;
    avgValueChange: number;
    satisfactionChange: number;
  };
}

type DateRange = '7days' | '30days' | '3months' | '6months' | 'year' | 'custom';

interface KPICardProps {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowUpRight className="w-4 h-4" />;
    if (trend === 'down') return <ArrowDownRight className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600 bg-green-50';
    if (trend === 'down') return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-teal-600">
            {icon}
          </div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTrendColor()}`}>
          {getTrendIcon()}
          <span>{change > 0 ? '+' : ''}{change}%</span>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-3xl font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{changeLabel}</p>
      </div>
    </div>
  );
};

interface MetricCardProps {
  label: string;
  value: number;
  max: number;
  color: string;
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, max, color, icon }) => {
  const percentage = (value / max) * 100;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`${color}`}>
            {icon}
          </div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-lg font-semibold text-gray-900">{value}%</span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${color.replace('text-', 'bg-')} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export function ReportingDashboard2025Client({ analytics }: ReportingDashboard2025ClientProps) {
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
    .map(cat => ({
      service: cat.category,
      revenue: cat.revenue,
      jobs: cat.count
    }));

  const monthlyComparisonData = analytics.revenueByMonth.slice(-6).map(item => ({
    month: item.month,
    revenue: item.revenue,
    jobs: item.jobs
  }));

  const dateRanges = [
    { value: '7days' as const, label: 'Last 7 Days' },
    { value: '30days' as const, label: 'Last 30 Days' },
    { value: '3months' as const, label: 'Last 3 Months' },
    { value: '6months' as const, label: 'Last 6 Months' },
    { value: 'year' as const, label: 'This Year' },
    { value: 'custom' as const, label: 'Custom Range' },
  ];

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
    <div className="min-h-0 bg-gray-50">
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Business Analytics</h1>
              <p className="text-gray-600 mt-1">
                Track performance, revenue trends, and business insights
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                disabled={isLoading}
              >
                <Printer className="w-5 h-5" />
                Print
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                disabled={isLoading}
              >
                <FileText className="w-5 h-5" />
                CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
                disabled={isLoading}
              >
                <Download className="w-5 h-5" />
                Export PDF
              </button>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-5 h-5" />
              <span className="text-sm font-medium">Time Period:</span>
            </div>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              {dateRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setSelectedPeriod(range.value)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    selectedPeriod === range.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Revenue"
              value={formatMoney(analytics.totalRevenue, 'GBP')}
              change={Math.round(analytics.revenueChange * 10) / 10}
              changeLabel="vs last period"
              icon={<PoundSterling className="w-5 h-5" />}
              trend={analytics.revenueChange > 0 ? 'up' : analytics.revenueChange < 0 ? 'down' : 'neutral'}
            />
            <KPICard
              title="Jobs Completed"
              value={analytics.completedJobs}
              change={Math.round(analytics.jobsChange * 10) / 10}
              changeLabel="vs last period"
              icon={<Briefcase className="w-5 h-5" />}
              trend={analytics.jobsChange > 0 ? 'up' : analytics.jobsChange < 0 ? 'down' : 'neutral'}
            />
            <KPICard
              title="Average Job Value"
              value={formatMoney(analytics.averageJobValue, 'GBP')}
              change={Math.round(analytics.avgValueChange * 10) / 10}
              changeLabel="vs last period"
              icon={<Target className="w-5 h-5" />}
              trend={analytics.avgValueChange > 0 ? 'up' : analytics.avgValueChange < 0 ? 'down' : 'neutral'}
            />
            <KPICard
              title="Customer Satisfaction"
              value={`${analytics.customerSatisfaction.toFixed(1)}/5.0`}
              change={Math.round(analytics.satisfactionChange * 10) / 10}
              changeLabel="rating average"
              icon={<Star className="w-5 h-5" />}
              trend={analytics.satisfactionChange > 0 ? 'up' : analytics.satisfactionChange < 0 ? 'down' : 'neutral'}
            />
          </div>

          {/* Revenue Over Time - Full Width Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Revenue Over Time</h2>
                <p className="text-sm text-gray-500">Daily revenue performance for the selected period</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 rounded-lg">
                <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                <span className="text-sm font-medium text-teal-700">Revenue (£)</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={350}>
              <DynamicAreaChart data={dailyRevenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  stroke="#6B7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                />
                <YAxis
                  stroke="#6B7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                  tickFormatter={(value) => `£${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                  formatter={(value: unknown) => [`£${value}`, 'Revenue']}
                  labelStyle={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#14B8A6"
                  strokeWidth={3}
                  fill="url(#colorRevenue)"
                  animationDuration={1000}
                />
              </DynamicAreaChart>
            </ResponsiveContainer>
          </div>

          {/* Charts Row - Jobs Status & Top Services */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Jobs by Status - Donut Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Jobs by Status</h2>
                <p className="text-sm text-gray-500">Distribution of job statuses</p>
              </div>

              <ResponsiveContainer width="100%" height={320}>
                <DynamicPieChart>
                  <Pie
                    data={jobStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                    animationDuration={1000}
                  >
                    {jobStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: '12px'
                    }}
                    formatter={(value: unknown, name: unknown, props: unknown) => [
                      `${value} jobs`,
                      props.payload.status
                    ]}
                  />
                </DynamicPieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {jobStatusData.map((item) => (
                  <div key={item.status} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600">{item.status}</span>
                    <span className="text-sm font-semibold text-gray-900 ml-auto">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Services - Bar Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Top Services by Revenue</h2>
                <p className="text-sm text-gray-500">Most profitable service categories</p>
              </div>

              <ResponsiveContainer width="100%" height={320}>
                <DynamicBarChart
                  data={topServicesData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#6B7280"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickFormatter={(value) => `£${value}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="service"
                    stroke="#6B7280"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: '12px'
                    }}
                    formatter={(value: unknown) => [`£${value}`, 'Revenue']}
                    labelStyle={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#14B8A6"
                    radius={[0, 8, 8, 0]}
                    animationDuration={1000}
                  />
                </DynamicBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Comparison - Column Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Monthly Performance</h2>
                <p className="text-sm text-gray-500">Revenue and job completion trends by month</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-600">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-900 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-600">Jobs</span>
                </div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <DynamicBarChart data={monthlyComparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  stroke="#6B7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#6B7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                  tickFormatter={(value) => `£${value}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#6B7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                  formatter={(value: unknown, name: string) => [
                    name === 'revenue' ? `£${value}` : value,
                    name === 'revenue' ? 'Revenue' : 'Jobs'
                  ]}
                  labelStyle={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  fill="#14B8A6"
                  radius={[8, 8, 0, 0]}
                  animationDuration={1000}
                />
                <Bar
                  yAxisId="right"
                  dataKey="jobs"
                  fill="#1F2937"
                  radius={[8, 8, 0, 0]}
                  animationDuration={1000}
                />
              </DynamicBarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Metrics */}
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Performance Metrics</h2>
              <p className="text-sm text-gray-500">Key business performance indicators</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Quote Acceptance Rate"
                value={Math.round((analytics.acceptedBids / analytics.totalBids) * 100)}
                max={100}
                color="text-teal-500"
                icon={<CheckCircle className="w-5 h-5" />}
              />
              <MetricCard
                label="Job Completion Rate"
                value={Math.round((analytics.completedJobs / analytics.totalJobs) * 100)}
                max={100}
                color="text-green-500"
                icon={<Target className="w-5 h-5" />}
              />
              <MetricCard
                label="Customer Retention"
                value={Math.round((analytics.activeClients / analytics.totalClients) * 100)}
                max={100}
                color="text-blue-500"
                icon={<Users className="w-5 h-5" />}
              />
              <MetricCard
                label="Response Time Score"
                value={92}
                max={100}
                color="text-purple-500"
                icon={<Clock className="w-5 h-5" />}
              />
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Detailed Category Breakdown</h2>
              <p className="text-sm text-gray-500">Complete performance data by service category</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-sm text-gray-700">Category</th>
                    <th className="text-right py-4 px-6 font-semibold text-sm text-gray-700">Total Jobs</th>
                    <th className="text-right py-4 px-6 font-semibold text-sm text-gray-700">Total Revenue</th>
                    <th className="text-right py-4 px-6 font-semibold text-sm text-gray-700">Avg Job Value</th>
                    <th className="text-right py-4 px-6 font-semibold text-sm text-gray-700">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analytics.jobsByCategory
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((category, index) => {
                      const percentage = (category.revenue / analytics.totalRevenue) * 100;
                      const avgValue = category.count > 0 ? category.revenue / category.count : 0;

                      return (
                        <tr key={category.category} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                index === 0 ? 'bg-teal-500' :
                                index === 1 ? 'bg-green-500' :
                                index === 2 ? 'bg-blue-500' :
                                'bg-gray-400'
                              }`} />
                              <span className="font-medium text-gray-900">{category.category}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right text-gray-700 font-medium">{category.count}</td>
                          <td className="py-4 px-6 text-right font-semibold text-teal-600">
                            {formatMoney(category.revenue, 'GBP')}
                          </td>
                          <td className="py-4 px-6 text-right text-gray-700">
                            {formatMoney(avgValue, 'GBP')}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700">
                              {percentage.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Clients Table */}
          {analytics.topClients && analytics.topClients.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Top Clients</h2>
                <p className="text-sm text-gray-500">Your highest value clients by total revenue</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-sm text-gray-700">Client Name</th>
                      <th className="text-right py-4 px-6 font-semibold text-sm text-gray-700">Total Jobs</th>
                      <th className="text-right py-4 px-6 font-semibold text-sm text-gray-700">Total Revenue</th>
                      <th className="text-right py-4 px-6 font-semibold text-sm text-gray-700">Average Job Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analytics.topClients.map((client, index) => {
                      const avgValue = client.jobs > 0 ? client.revenue / client.jobs : 0;
                      return (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-gray-600" />
                              </div>
                              <span className="font-medium text-gray-900">{client.name || 'Unknown Client'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right text-gray-700 font-medium">{client.jobs}</td>
                          <td className="py-4 px-6 text-right font-semibold text-teal-600">
                            {formatMoney(client.revenue, 'GBP')}
                          </td>
                          <td className="py-4 px-6 text-right text-gray-700">
                            {formatMoney(avgValue, 'GBP')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Clock className="w-5 h-5" />
                <span>Last updated: {new Date().toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-medium text-gray-700">
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
