'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  AlertTriangle,
  Key,
  CheckCircle,
  XCircle,
  TrendingDown,
  Search,
  Loader2,
  Activity,
  UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { ChartSkeleton } from '@/components/ui/ChartSkeleton';
import { SecurityEventsList } from './components/SecurityEventsList';
import type { SecurityEvent } from './components/SecurityEventsList';

// Dynamic imports for Tremor charts - lazy load heavy charting library
const AreaChart = dynamic(
  () => import('@tremor/react').then((mod) => ({ default: mod.AreaChart })),
  {
    loading: () => <ChartSkeleton height='256px' />,
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

interface SecurityDashboardData {
  metrics: {
    totalEvents: number;
    criticalAlerts: number;
    activeThreats: number;
    blockedIps: number;
    securityScore: number;
    twoFactorEnabled: number;
  };
  recentEvents: SecurityEvent[];
  eventsByDay: Array<{
    day: string;
    total: number;
    threats: number;
    blocked: number;
  }>;
  threatsByType: Array<{ type: string; count: number }>;
}

async function fetchSecurityDashboard(): Promise<SecurityDashboardData> {
  const response = await fetch('/api/admin/security-dashboard');
  if (!response.ok) {
    throw new Error('Failed to fetch security dashboard data');
  }
  return response.json();
}

async function postSecurityAction(payload: {
  action: 'block_ip' | 'unblock_ip' | 'resolve_event';
  ip?: string;
  eventId?: string;
}): Promise<{ success: boolean }> {
  const csrfHeaders = await getCsrfHeaders();
  const response = await fetch('/api/admin/security-dashboard', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to perform security action');
  }
  return response.json();
}

export default function AdminSecurityDashboard2025() {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['admin', 'security-dashboard'],
    queryFn: fetchSecurityDashboard,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });

  const error =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? 'Failed to load security data'
        : null;

  const actionMutation = useMutation({
    mutationFn: postSecurityAction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'security-dashboard'],
      });
    },
  });

  // Extract data with defaults
  const securityStats = {
    totalEvents: data?.metrics?.totalEvents ?? 0,
    criticalAlerts: data?.metrics?.criticalAlerts ?? 0,
    activeThreats: data?.metrics?.activeThreats ?? 0,
    blockedIps: data?.metrics?.blockedIps ?? 0,
    securityScore: data?.metrics?.securityScore ?? 0,
    twoFactorEnabled: data?.metrics?.twoFactorEnabled ?? 0,
  };

  const eventsByDay = data?.eventsByDay ?? [];
  const threatsByType = data?.threatsByType ?? [];
  const securityEvents: SecurityEvent[] = data?.recentEvents ?? [];

  const filteredEvents = useMemo(() => {
    return securityEvents.filter((event) => {
      const matchesSeverity =
        selectedSeverity === 'all' || event.severity === selectedSeverity;
      const matchesType = selectedType === 'all' || event.type === selectedType;
      const matchesSearch =
        searchQuery === '' ||
        event.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.ipAddress.includes(searchQuery) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSeverity && matchesType && matchesSearch;
    });
  }, [securityEvents, selectedSeverity, selectedType, searchQuery]);

  const handleInvestigate = (id: string) => {
    toast.success(`Opening investigation for ${id}`);
  };

  const handleResolve = (id: string) => {
    actionMutation.mutate(
      { action: 'resolve_event', eventId: id },
      {
        onSuccess: () => {
          toast.success(`Event ${id} marked as resolved`);
        },
        onError: () => {
          toast.error(`Failed to resolve event ${id}`);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className='min-h-screen bg-slate-50'>
        {/* Match hero header dimensions to prevent CLS */}
        <div className='bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='bg-white/20 backdrop-blur-sm p-3 rounded-xl'>
                    <Shield className='w-8 h-8' aria-hidden='true' />
                  </div>
                  <h1 className='text-4xl font-bold'>Security Dashboard</h1>
                </div>
                <p className='text-slate-300 text-lg'>
                  Real-time security monitoring and threat detection
                </p>
              </div>
              <div className='w-24 h-24 rounded-full bg-white/10 animate-pulse' />
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mt-8'>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className='bg-white/10 rounded-xl p-4 min-h-[88px] animate-pulse' />
              ))}
            </div>
          </div>
        </div>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='w-8 h-8 text-emerald-600 animate-spin' />
          </div>
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
                  <Shield className='w-8 h-8' aria-hidden='true' />
                </div>
                <h1 className='text-4xl font-bold'>Security Dashboard</h1>
              </div>
              <p className='text-slate-300 text-lg'>
                Real-time security monitoring and threat detection
              </p>
            </div>

            <div className='text-right'>
              <p className='text-sm text-slate-400 mb-2'>Security Score</p>
              <div className='flex items-center gap-3'>
                <div className='w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center'>
                  <div className='text-center'>
                    <p className='text-3xl font-bold'>
                      {securityStats.securityScore}
                    </p>
                    <p className='text-xs text-slate-400'>/ 100</p>
                  </div>
                </div>
                <div className='flex flex-col gap-1'>
                  <div className='flex items-center gap-2'>
                    <CheckCircle
                      className='w-4 h-4 text-green-300'
                      aria-hidden='true'
                    />
                    <span className='text-sm'>Excellent</span>
                  </div>
                  <p className='text-xs text-slate-400'>Last updated: Now</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <MotionDiv
            variants={staggerContainer}
            initial='hidden'
            animate='visible'
            className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mt-8'
            aria-live='polite'
            aria-label='Security statistics'
          >
            <MotionDiv
              variants={staggerItem}
              className='bg-white/20 backdrop-blur-sm rounded-xl p-4 min-h-[88px]'
            >
              <div className='flex items-center gap-2 mb-2'>
                <Activity
                  className='w-5 h-5 text-slate-400'
                  aria-hidden='true'
                />
                <p className='text-slate-300 text-sm'>Total Events</p>
              </div>
              <p className='text-3xl font-bold'>
                {securityStats.totalEvents.toLocaleString()}
              </p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className='bg-white/20 backdrop-blur-sm rounded-xl p-4 border-2 border-red-400'
            >
              <div className='flex items-center gap-2 mb-2'>
                <XCircle className='w-5 h-5 text-red-200' aria-hidden='true' />
                <p className='text-slate-300 text-sm'>Critical</p>
              </div>
              <p className='text-3xl font-bold text-red-200'>
                {securityStats.criticalAlerts}
              </p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className='bg-white/20 backdrop-blur-sm rounded-xl p-4 border-2 border-emerald-400'
            >
              <div className='flex items-center gap-2 mb-2'>
                <AlertTriangle
                  className='w-5 h-5 text-emerald-200'
                  aria-hidden='true'
                />
                <p className='text-slate-300 text-sm'>Active Threats</p>
              </div>
              <p className='text-3xl font-bold text-emerald-200'>
                {securityStats.activeThreats}
              </p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className='bg-white/20 backdrop-blur-sm rounded-xl p-4 min-h-[88px]'
            >
              <div className='flex items-center gap-2 mb-2'>
                <UserX className='w-5 h-5 text-green-200' aria-hidden='true' />
                <p className='text-slate-300 text-sm'>Blocked</p>
              </div>
              <p className='text-3xl font-bold'>{securityStats.blockedIps}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className='bg-white/20 backdrop-blur-sm rounded-xl p-4 min-h-[88px]'
            >
              <div className='flex items-center gap-2 mb-2'>
                <Key className='w-5 h-5 text-slate-400' aria-hidden='true' />
                <p className='text-slate-300 text-sm'>2FA Enabled</p>
              </div>
              <p className='text-3xl font-bold'>
                {securityStats.twoFactorEnabled}%
              </p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className='bg-white/20 backdrop-blur-sm rounded-xl p-4 min-h-[88px]'
            >
              <div className='flex items-center gap-2 mb-2'>
                <TrendingDown
                  className='w-5 h-5 text-green-200'
                  aria-hidden='true'
                />
                <p className='text-slate-300 text-sm'>Trend</p>
              </div>
              <p className='text-3xl font-bold text-green-200'>-12%</p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Charts Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'>
          {/* Events Timeline */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
          >
            <h2 className='text-xl font-semibold text-gray-900 mb-4'>
              Security Events (7 Days)
            </h2>
            <AreaChart
              data={eventsByDay}
              index='day'
              categories={['total', 'threats', 'blocked']}
              colors={['emerald', 'red', 'blue']}
              valueFormatter={(value) => value.toString()}
              showAnimation={true}
              showLegend={true}
              showGridLines={true}
              className='h-64'
            />
          </MotionDiv>

          {/* Threats by Type */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
          >
            <h2 className='text-xl font-semibold text-gray-900 mb-4'>
              Threats by Type
            </h2>
            <BarChart
              data={threatsByType}
              index='type'
              categories={['count']}
              colors={['red']}
              valueFormatter={(value) => value.toString()}
              showAnimation={true}
              showLegend={false}
              showGridLines={true}
              layout='horizontal'
              className='h-64'
            />
          </MotionDiv>
        </div>

        {/* Filters */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className='bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8'
        >
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <div className='relative'>
              <Search
                className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5'
                aria-hidden='true'
              />
              <input
                type='text'
                id='security-search'
                aria-label='Search security events'
                placeholder='Search events...'
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
                className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
              />
            </div>

            <select
              id='severity-filter'
              aria-label='Filter by severity'
              value={selectedSeverity}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSelectedSeverity(e.target.value)
              }
              className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
            >
              <option value='all'>All Severities</option>
              <option value='critical'>Critical</option>
              <option value='high'>High</option>
              <option value='medium'>Medium</option>
              <option value='low'>Low</option>
            </select>

            <select
              id='type-filter'
              aria-label='Filter by event type'
              value={selectedType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSelectedType(e.target.value)
              }
              className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
            >
              <option value='all'>All Types</option>
              <option value='login_attempt'>Login Attempts</option>
              <option value='password_reset'>Password Resets</option>
              <option value='suspicious_activity'>Suspicious Activity</option>
              <option value='account_locked'>Account Locked</option>
              <option value='data_export'>Data Exports</option>
            </select>

            <button
              aria-label='Export security report'
              className='px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors'
            >
              Export Report
            </button>
          </div>
        </MotionDiv>

        {/* Security Events List */}
        <SecurityEventsList
          filteredEvents={filteredEvents}
          onInvestigate={handleInvestigate}
          onResolve={handleResolve}
          isActionPending={actionMutation.isPending}
        />
      </div>
    </div>
  );
}
