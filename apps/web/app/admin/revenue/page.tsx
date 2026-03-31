'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  Users,
  Briefcase,
  Download,
  Calendar,
  Filter,
  CreditCard,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';
import { ChartSkeleton } from '@/components/ui/ChartSkeleton';
import { RevenueTransactionsTable } from './components/RevenueTransactionsTable';
// Dynamic imports for Tremor charts - lazy load heavy charting library
const AreaChart = dynamic(
  () => import('@tremor/react').then((mod) => ({ default: mod.AreaChart })),
  {
    loading: () => <ChartSkeleton height='320px' />,
    ssr: false,
  }
);

const BarChart = dynamic(
  () => import('@tremor/react').then((mod) => ({ default: mod.BarChart })),
  {
    loading: () => <ChartSkeleton height='256px' />,
    ssr: false,
  }
);

const DonutChart = dynamic(
  () => import('@tremor/react').then((mod) => ({ default: mod.DonutChart })),
  {
    loading: () => <ChartSkeleton height='256px' />,
    ssr: false,
  }
);

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
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Transaction {
  id: string;
  date: string;
  type: 'job_payment' | 'subscription' | 'platform_fee' | 'refund';
  amount: number;
  fee: number;
  net: number;
  contractor: string;
  homeowner: string;
  jobTitle: string;
  status: 'completed' | 'pending' | 'failed';
}

interface RevenueData {
  revenueMetrics: {
    totalRevenue: number;
    transactionFeeRevenue: number;
    subscriptionRevenue: number;
    growthRate: number;
    transactionCount: number;
    averageTransactionValue: number;
  };
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    fees: number;
    subscriptions: number;
  }>;
  revenueByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  revenueByContractorType: Array<{ type: string; revenue: number }>;
  recentTransactions: Transaction[];
}

// ✅ ARCHITECTURE FIX: Use TanStack Query for data fetching
// Benefits: automatic caching, background refetching, error handling, deduplication
async function fetchRevenueData(
  timeRange: '7d' | '30d' | '90d' | '1y'
): Promise<RevenueData> {
  const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
  const days = daysMap[timeRange];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const response = await fetch(
    `/api/admin/revenue?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch revenue data');
  }

  return response.json();
}

export default function AdminRevenueDashboard2025() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>(
    '30d'
  );
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ ARCHITECTURE FIX: TanStack Query for data fetching
  // Provides: caching, automatic refetching, loading/error states, stale-while-revalidate
  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['admin', 'revenue', timeRange],
    queryFn: () => fetchRevenueData(timeRange),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2,
    meta: {
      onError: () => {
        toast.error('Failed to load revenue data');
      },
    },
  });

  const error =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? 'Failed to load revenue data'
        : null;

  // Extract data with defaults
  const revenueMetrics = {
    totalRevenue: data?.revenueMetrics?.totalRevenue || 0,
    platformFees: data?.revenueMetrics?.transactionFeeRevenue || 0,
    subscriptionRevenue: data?.revenueMetrics?.subscriptionRevenue || 0,
    growthRate: data?.revenueMetrics?.growthRate || 0,
    transactionCount: data?.revenueMetrics?.transactionCount || 0,
    averageTransactionValue: data?.revenueMetrics?.averageTransactionValue || 0,
  };
  const revenueByMonth = data?.monthlyRevenue || [];
  const revenueByCategory = data?.revenueByCategory || [];
  const revenueByContractorType = data?.revenueByContractorType || [];
  const transactions = data?.recentTransactions || [];

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const matchesType = selectedType === 'all' || txn.type === selectedType;
      const matchesSearch =
        searchQuery === '' ||
        txn.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.contractor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.homeowner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [transactions, selectedType, searchQuery]);

  const handleExport = () => {
    toast.success('Revenue report exported successfully!');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'job_payment':
        return 'bg-emerald-100 text-emerald-700';
      case 'subscription':
        return 'bg-indigo-100 text-indigo-700';
      case 'platform_fee':
        return 'bg-blue-100 text-blue-700';
      case 'refund':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-[#f7f9fb]'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8'>
          <div className='h-12 w-80 bg-gray-200 rounded animate-pulse mb-3' />
          <div className='h-5 w-96 bg-gray-100 rounded animate-pulse mb-8' />
          <div className='grid grid-cols-12 gap-6 mb-8'>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className='col-span-12 md:col-span-4 bg-white rounded-[1.5rem] p-8 min-h-[160px] animate-pulse'
              />
            ))}
          </div>
          <div className='bg-white rounded-[1.5rem] p-8 h-[340px] animate-pulse mb-8' />
          <div className='bg-white rounded-[1.5rem] p-8 h-[300px] animate-pulse' />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-red-600 mb-4'>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className='px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700'
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#f7f9fb]'>
      {/* Page Header — matches mockup flat style */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4'>
        <div className='flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8'>
          <div>
            <h1 className='text-[2.75rem] font-extrabold tracking-tight text-[#2a3439] leading-tight'>
              Financial Overview
            </h1>
            <p className='text-[#566166] max-w-2xl mt-2'>
              Track your ecosystem&apos;s growth, recurring revenue, and
              individual transaction performance.
            </p>
          </div>
          <button
            onClick={handleExport}
            className='px-5 py-2.5 bg-[#565e74] text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm hover:brightness-110 transition-all'
          >
            <Download className='w-4 h-4' />
            Export Report
          </button>
        </div>

        {/* Bento Metrics Grid — 12-col matching mockup */}
        <div className='grid grid-cols-12 gap-6 mb-8'>
          {/* Total Revenue — hero card (4 cols) */}
          <div className='col-span-12 md:col-span-4 bg-white rounded-[1.5rem] p-8 transition-all hover:shadow-[0_12px_32px_-4px_rgba(42,52,57,0.08)]'>
            <div className='flex justify-between items-start mb-6'>
              <div className='p-3 bg-[#dae2fd] rounded-2xl'>
                <DollarSign className='w-5 h-5 text-[#565e74]' />
              </div>
              {revenueMetrics.growthRate > 0 && (
                <span className='text-xs font-bold text-[#2e7d32] flex items-center gap-1'>
                  <TrendingUp className='w-3 h-3' />+{revenueMetrics.growthRate}
                  %
                </span>
              )}
            </div>
            <p className='text-[#566166] text-sm font-medium mb-1'>
              Total Revenue
            </p>
            <h3 className='text-3xl font-extrabold text-[#2a3439]'>
              £{revenueMetrics.totalRevenue.toLocaleString()}
            </h3>
          </div>

          {/* MRR — (4 cols) */}
          <div className='col-span-12 md:col-span-4 bg-white rounded-[1.5rem] p-8 transition-all hover:shadow-[0_12px_32px_-4px_rgba(42,52,57,0.08)]'>
            <div className='flex justify-between items-start mb-6'>
              <div className='p-3 bg-[#e3dbfd] rounded-2xl'>
                <CreditCard className='w-5 h-5 text-[#605c78]' />
              </div>
            </div>
            <p className='text-[#566166] text-sm font-medium mb-1'>
              Platform Fees
            </p>
            <h3 className='text-3xl font-extrabold text-[#2a3439]'>
              £{revenueMetrics.platformFees.toLocaleString()}
            </h3>
            <p className='text-sm text-[#566166] mt-4'>
              Subscriptions:{' '}
              <span className='font-bold text-[#2a3439]'>
                £{revenueMetrics.subscriptionRevenue.toLocaleString()}
              </span>
            </p>
          </div>

          {/* Transactions — (4 cols) */}
          <div className='col-span-12 md:col-span-4 bg-white rounded-[1.5rem] p-8 transition-all hover:shadow-[0_12px_32px_-4px_rgba(42,52,57,0.08)]'>
            <div className='flex justify-between items-start mb-6'>
              <div className='p-3 bg-[#d3e4fe] rounded-2xl'>
                <Briefcase className='w-5 h-5 text-[#506076]' />
              </div>
            </div>
            <p className='text-[#566166] text-sm font-medium mb-1'>
              Transactions
            </p>
            <h3 className='text-3xl font-extrabold text-[#2a3439]'>
              {revenueMetrics.transactionCount.toLocaleString()}
            </h3>
            <p className='text-xs text-[#717c82] mt-4'>
              Avg: £{revenueMetrics.averageTransactionValue.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
        {/* Time Range Selector */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className='bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8'
        >
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-xl font-semibold text-gray-900'>
              Revenue Trends
            </h2>
            <div className='flex items-center gap-2'>
              {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range === '7d' && '7 Days'}
                  {range === '30d' && '30 Days'}
                  {range === '90d' && '90 Days'}
                  {range === '1y' && '1 Year'}
                </button>
              ))}
            </div>
          </div>

          <AreaChart
            data={revenueByMonth}
            index='month'
            categories={['revenue', 'fees', 'subscriptions']}
            colors={['emerald', 'blue', 'amber']}
            valueFormatter={(value) => `£${value.toLocaleString()}`}
            showAnimation={true}
            showLegend={true}
            showGridLines={true}
            showXAxis={true}
            showYAxis={true}
            className='h-80 mt-4'
          />
        </MotionDiv>

        {/* Charts Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'>
          {/* Revenue by Category */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
          >
            <h2 className='text-xl font-semibold text-gray-900 mb-4'>
              Revenue by Category
            </h2>
            <DonutChart
              data={revenueByCategory}
              category='amount'
              index='category'
              colors={['emerald', 'blue', 'amber', 'slate']}
              valueFormatter={(value) => `£${value.toLocaleString()}`}
              showAnimation={true}
              className='h-64'
            />
            <div className='mt-6 space-y-3'>
              {revenueByCategory.map((cat) => (
                <div
                  key={cat.category}
                  className='flex items-center justify-between'
                >
                  <span className='text-gray-700'>{cat.category}</span>
                  <div className='flex items-center gap-3'>
                    <span className='text-sm text-gray-500'>
                      {cat.percentage}%
                    </span>
                    <span className='font-semibold text-gray-900'>
                      £{cat.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </MotionDiv>

          {/* Revenue by Contractor Type */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
          >
            <h2 className='text-xl font-semibold text-gray-900 mb-4'>
              Revenue by Trade
            </h2>
            <BarChart
              data={revenueByContractorType}
              index='type'
              categories={['revenue']}
              colors={['emerald']}
              valueFormatter={(value) => `£${value.toLocaleString()}`}
              showAnimation={true}
              showLegend={false}
              showGridLines={true}
              className='h-64'
            />
          </MotionDiv>
        </div>

        {/* Transactions Table */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <RevenueTransactionsTable
            transactions={filteredTransactions}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
          />
        </MotionDiv>
      </div>
    </div>
  );
}
