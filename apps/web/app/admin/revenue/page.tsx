'use client';

import React, { useState, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Users,
  Briefcase,
  Download,
  Calendar,
  Filter,
  CreditCard,
  PieChart,
  ArrowUpRight,
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
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4' />
          <p className='text-gray-600'>Loading revenue data...</p>
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
    <div className='min-h-screen bg-slate-50'>
      {/* Hero Header */}
      <MotionDiv
        initial='hidden'
        animate='visible'
        variants={fadeIn}
        className='bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white'
      >
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='flex items-center gap-3 mb-4'>
                <div className='bg-white/20 backdrop-blur-sm p-3 rounded-xl'>
                  <DollarSign className='w-8 h-8' />
                </div>
                <h1 className='text-4xl font-bold'>Revenue Dashboard</h1>
              </div>
              <p className='text-slate-300 text-lg'>
                Track platform revenue, fees, and transaction analytics
              </p>
            </div>

            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExport}
              className='bg-white text-emerald-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2'
            >
              <Download className='w-5 h-5' />
              Export Report
            </MotionButton>
          </div>

          {/* Key Metrics Grid */}
          <MotionDiv
            variants={staggerContainer}
            initial='hidden'
            animate='visible'
            className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mt-8'
          >
            <MotionDiv
              variants={staggerItem}
              className='bg-white/20 backdrop-blur-sm rounded-xl p-4'
            >
              <div className='flex items-center gap-2 mb-2'>
                <DollarSign className='w-5 h-5 text-slate-400' />
                <p className='text-slate-300 text-sm'>Total Revenue</p>
              </div>
              <p className='text-3xl font-bold'>
                £{revenueMetrics.totalRevenue.toLocaleString()}
              </p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className='bg-white/20 backdrop-blur-sm rounded-xl p-4'
            >
              <div className='flex items-center gap-2 mb-2'>
                <CreditCard className='w-5 h-5 text-slate-400' />
                <p className='text-slate-300 text-sm'>Platform Fees</p>
              </div>
              <p className='text-3xl font-bold'>
                £{revenueMetrics.platformFees.toLocaleString()}
              </p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className='bg-white/20 backdrop-blur-sm rounded-xl p-4'
            >
              <div className='flex items-center gap-2 mb-2'>
                <Users className='w-5 h-5 text-slate-400' />
                <p className='text-slate-300 text-sm'>Subscriptions</p>
              </div>
              <p className='text-3xl font-bold'>
                £{revenueMetrics.subscriptionRevenue.toLocaleString()}
              </p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className='bg-white/20 backdrop-blur-sm rounded-xl p-4'
            >
              <div className='flex items-center gap-2 mb-2'>
                <TrendingUp className='w-5 h-5 text-slate-400' />
                <p className='text-slate-300 text-sm'>Growth Rate</p>
              </div>
              <div className='flex items-center gap-2'>
                <p className='text-3xl font-bold'>
                  {revenueMetrics.growthRate}%
                </p>
                <ArrowUpRight className='w-6 h-6 text-green-300' />
              </div>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className='bg-white/20 backdrop-blur-sm rounded-xl p-4'
            >
              <div className='flex items-center gap-2 mb-2'>
                <Briefcase className='w-5 h-5 text-slate-400' />
                <p className='text-slate-300 text-sm'>Transactions</p>
              </div>
              <p className='text-3xl font-bold'>
                {revenueMetrics.transactionCount.toLocaleString()}
              </p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className='bg-white/20 backdrop-blur-sm rounded-xl p-4'
            >
              <div className='flex items-center gap-2 mb-2'>
                <PieChart className='w-5 h-5 text-slate-400' />
                <p className='text-slate-300 text-sm'>Avg Transaction</p>
              </div>
              <p className='text-3xl font-bold'>
                £{revenueMetrics.averageTransactionValue}
              </p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
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
