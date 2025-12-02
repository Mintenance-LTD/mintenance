'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Download,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { AreaChart, DonutChart, BarChart } from '@tremor/react';
import { MotionDiv } from '@/components/ui/MotionDiv';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export default function AnalyticsDetailPage2025() {
  const router = useRouter();

  const [dateRange, setDateRange] = useState('30days');
  const [activeMetric, setActiveMetric] = useState<'users' | 'revenue' | 'jobs' | 'engagement'>('users');

  // User Growth Data
  const userGrowthData = [
    { month: 'Jul', homeowners: 1234, contractors: 456, total: 1690 },
    { month: 'Aug', homeowners: 1456, contractors: 523, total: 1979 },
    { month: 'Sep', homeowners: 1678, contractors: 598, total: 2276 },
    { month: 'Oct', homeowners: 1923, contractors: 667, total: 2590 },
    { month: 'Nov', homeowners: 2145, contractors: 734, total: 2879 },
    { month: 'Dec', homeowners: 2398, contractors: 812, total: 3210 },
    { month: 'Jan', homeowners: 2654, contractors: 889, total: 3543 },
  ];

  // Revenue Data
  const revenueData = [
    { month: 'Jul', revenue: 45600, fees: 6840, subscriptions: 2280 },
    { month: 'Aug', revenue: 52300, fees: 7845, subscriptions: 2610 },
    { month: 'Sep', revenue: 59800, fees: 8970, subscriptions: 2990 },
    { month: 'Oct', revenue: 68200, fees: 10230, subscriptions: 3410 },
    { month: 'Nov', revenue: 76500, fees: 11475, subscriptions: 3825 },
    { month: 'Dec', revenue: 85900, fees: 12885, subscriptions: 4295 },
    { month: 'Jan', revenue: 94200, fees: 14130, subscriptions: 4710 },
  ];

  // Job Categories
  const jobCategoryData = [
    { category: 'Kitchen', count: 342, value: 25.4 },
    { category: 'Bathroom', count: 289, value: 21.5 },
    { category: 'Electrical', count: 234, value: 17.4 },
    { category: 'Plumbing', count: 198, value: 14.7 },
    { category: 'Painting', count: 156, value: 11.6 },
    { category: 'Other', count: 125, value: 9.4 },
  ];

  // Regional Performance
  const regionalData = [
    { region: 'London', jobs: 456, revenue: 32400 },
    { region: 'Manchester', jobs: 234, revenue: 18900 },
    { region: 'Birmingham', jobs: 198, revenue: 15600 },
    { region: 'Leeds', jobs: 167, revenue: 13200 },
    { region: 'Glasgow', jobs: 145, revenue: 11800 },
    { region: 'Bristol', jobs: 132, revenue: 10500 },
  ];

  // Platform Metrics
  const platformMetrics = [
    {
      label: 'Total Users',
      value: '3,543',
      change: '+10.3%',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Monthly Revenue',
      value: '£94,200',
      change: '+9.6%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Active Jobs',
      value: '1,344',
      change: '+12.8%',
      trend: 'up',
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      label: 'Avg Job Value',
      value: '£2,850',
      change: '-2.1%',
      trend: 'down',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
  ];

  const handleExport = () => {
    // Export logic here
    alert('Exporting analytics data...');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Advanced Analytics</h1>
              <p className="text-purple-100">
                Detailed insights into platform performance and user behavior
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="1year">Last Year</option>
              </select>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium"
              >
                <Download className="w-5 h-5" />
                Export
              </button>
            </div>
          </div>
        </div>
      </MotionDiv>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {platformMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <MotionDiv
                key={index}
                variants={staggerItem}
                className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 ${metric.bgColor} rounded-lg`}>
                    <Icon className={`w-6 h-6 ${metric.color}`} />
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.trend === 'up' ? (
                      <ArrowUp className="w-4 h-4" />
                    ) : (
                      <ArrowDown className="w-4 h-4" />
                    )}
                    {metric.change}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              </MotionDiv>
            );
          })}
        </MotionDiv>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth */}
          <MotionDiv
            variants={fadeIn}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              User Growth Trend
            </h3>
            <AreaChart
              data={userGrowthData}
              index="month"
              categories={['homeowners', 'contractors']}
              colors={['purple', 'indigo']}
              valueFormatter={(value) => value.toLocaleString()}
              className="h-72"
            />
          </MotionDiv>

          {/* Revenue Breakdown */}
          <MotionDiv
            variants={fadeIn}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Revenue Breakdown
            </h3>
            <AreaChart
              data={revenueData}
              index="month"
              categories={['revenue', 'fees', 'subscriptions']}
              colors={['green', 'emerald', 'teal']}
              valueFormatter={(value) => `£${value.toLocaleString()}`}
              className="h-72"
            />
          </MotionDiv>

          {/* Job Categories */}
          <MotionDiv
            variants={fadeIn}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              Job Distribution by Category
            </h3>
            <DonutChart
              data={jobCategoryData}
              category="count"
              index="category"
              valueFormatter={(value) => `${value} jobs`}
              colors={['purple', 'indigo', 'blue', 'cyan', 'teal', 'gray']}
              className="h-72"
            />
          </MotionDiv>

          {/* Regional Performance */}
          <MotionDiv
            variants={fadeIn}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Regional Performance
            </h3>
            <BarChart
              data={regionalData}
              index="region"
              categories={['jobs']}
              colors={['purple']}
              valueFormatter={(value) => `${value} jobs`}
              className="h-72"
            />
          </MotionDiv>
        </div>

        {/* Detailed Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Contractors */}
          <MotionDiv
            variants={fadeIn}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Contractors</h3>
            <div className="space-y-3">
              {[
                { name: 'John Smith', jobs: 42, rating: 4.9, revenue: '£42,300' },
                { name: 'Emma Wilson', jobs: 38, rating: 4.8, revenue: '£38,900' },
                { name: 'Michael Brown', jobs: 35, rating: 4.7, revenue: '£35,600' },
                { name: 'Sarah Davis', jobs: 32, rating: 4.9, revenue: '£32,100' },
                { name: 'James Taylor', jobs: 29, rating: 4.6, revenue: '£29,800' },
              ].map((contractor, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{contractor.name}</p>
                      <p className="text-sm text-gray-600">
                        {contractor.jobs} jobs • ⭐ {contractor.rating}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">{contractor.revenue}</p>
                </div>
              ))}
            </div>
          </MotionDiv>

          {/* Recent Activity */}
          <MotionDiv
            variants={fadeIn}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Activity</h3>
            <div className="space-y-3">
              {[
                { action: 'New job posted', user: 'Sarah J.', time: '2 minutes ago', type: 'job' },
                { action: 'Contractor verified', user: 'Mike B.', time: '15 minutes ago', type: 'verification' },
                { action: 'Payment completed', user: 'Emma W.', time: '32 minutes ago', type: 'payment' },
                { action: 'Review submitted', user: 'John S.', time: '1 hour ago', type: 'review' },
                { action: 'New user signup', user: 'David L.', time: '2 hours ago', type: 'signup' },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'job' ? 'bg-blue-100' :
                    activity.type === 'verification' ? 'bg-green-100' :
                    activity.type === 'payment' ? 'bg-purple-100' :
                    activity.type === 'review' ? 'bg-yellow-100' :
                    'bg-gray-100'
                  }`}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-600">{activity.user} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </MotionDiv>
        </div>
      </div>
    </div>
  );
}
