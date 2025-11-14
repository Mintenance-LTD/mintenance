'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import styles from '../admin.module.css';
import { AdminCharts } from './AdminCharts';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { ModelVersionHealthCard } from '@/components/admin/ModelVersionHealthCard';
import { SafetyExperimentHealthSection } from '@/components/admin/SafetyExperimentHealthSection';

interface ChartDataPoint {
  date: string;
  users?: number;
  jobs?: number;
  cumulative?: number;
}

interface DashboardMetrics {
  totalUsers: number;
  totalContractors: number;
  totalJobs: number;
  activeSubscriptions: number;
  mrr: number;
  pendingVerifications: number;
  charts?: {
    userGrowth: ChartDataPoint[];
    jobGrowth: ChartDataPoint[];
  };
}

export function DashboardClient({ initialMetrics }: { initialMetrics: DashboardMetrics }) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Set mounted state after client-side hydration
  useEffect(() => {
    setMounted(true);
    setLastUpdated(new Date());
  }, []);

  // Real-time polling (every 30 seconds)
  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/dashboard/metrics');
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
          setLastUpdated(new Date());
        }
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics(); // Initial fetch
    const interval = setInterval(fetchMetrics, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 md:p-10 max-w-[1440px] mx-auto bg-slate-50 min-h-screen">
      <AdminPageHeader
        title="Admin Dashboard"
        subtitle="Manage platform operations, revenue, and user activity"
        variant="gradient"
        quickStats={[
          {
            label: 'users',
            value: metrics.totalUsers.toLocaleString(),
            icon: 'users',
            color: '#4CC38A',
          },
          {
            label: 'pending',
            value: metrics.pendingVerifications,
            icon: 'clock',
            color: '#F59E0B',
          },
        ]}
        actions={
          <div className="flex items-center gap-3">
            {loading && <Icon name="loader" size={20} className="animate-spin" color={theme.colors.white} />}
            {mounted && lastUpdated && (
              <span className="text-xs text-white/70 font-medium">
                Updated {lastUpdated.toLocaleTimeString('en-GB')}
              </span>
            )}
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 mt-10">
        <AdminMetricCard
          label="Total Users"
          value={metrics.totalUsers.toLocaleString()}
          icon="users"
          iconColor="#4A67FF"
          onClick={() => window.location.href = '/admin/users'}
        />
        <AdminMetricCard
          label="Contractors"
          value={metrics.totalContractors.toLocaleString()}
          icon="briefcase"
          iconColor="#4A67FF"
        />
        <AdminMetricCard
          label="Total Jobs"
          value={metrics.totalJobs.toLocaleString()}
          icon="fileText"
          iconColor="#4CC38A"
        />
        <AdminMetricCard
          label="Active Subscriptions"
          value={metrics.activeSubscriptions.toLocaleString()}
          icon="creditCard"
          iconColor="#4A67FF"
        />
        <AdminMetricCard
          label="Monthly Recurring Revenue"
          value={`£${metrics.mrr.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon="currencyPound"
          iconColor="#4CC38A"
          onClick={() => window.location.href = '/admin/revenue'}
        />
        <AdminMetricCard
          label="Pending Verifications"
          value={metrics.pendingVerifications.toLocaleString()}
          icon="clock"
          iconColor="#F59E0B"
          onClick={() => window.location.href = '/admin/users?verified=pending'}
        />
      </div>

      {/* Action Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
        <Link
          href="/admin/revenue"
          className={cn(styles.adminCardLink, 'group')}
        >
          <div className={cn(
            'rounded-[16px] border border-slate-200 bg-white p-5 cursor-pointer transition-all duration-300',
            'shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]',
            'hover:-translate-y-1 active:translate-y-0',
            styles.adminCard
          )}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Icon name="trendingUp" size={22} color="#4A67FF" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Revenue Analytics
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              View subscription revenue, MRR, conversion rates, and payment tracking
            </p>
          </div>
        </Link>

        <Link
          href="/admin/users"
          className={cn(styles.adminCardLink, 'group')}
        >
          <div className={cn(
            'rounded-[16px] border border-slate-200 bg-white p-5 cursor-pointer transition-all duration-300 relative',
            'shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]',
            'hover:-translate-y-1 active:translate-y-0',
            styles.adminCard
          )}>
            {metrics.pendingVerifications > 0 && (
              <div className="absolute top-3 right-3 bg-amber-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-lg">
                {metrics.pendingVerifications > 9 ? '9+' : metrics.pendingVerifications}
              </div>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Icon name="users" size={22} color="#4A67FF" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                User Management
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Manage users, verify contractors{metrics.pendingVerifications > 0 ? ` (${metrics.pendingVerifications} pending)` : ''}
            </p>
          </div>
        </Link>

        <Link
          href="/admin/security"
          className={cn(styles.adminCardLink, 'group')}
        >
          <div className={cn(
            'rounded-[16px] border border-slate-200 bg-white p-5 cursor-pointer transition-all duration-300',
            'shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]',
            'hover:-translate-y-1 active:translate-y-0',
            styles.adminCard
          )}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                <Icon name="shield" size={22} color="#64748B" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Security Dashboard
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Monitor security events, threats, and system health
            </p>
          </div>
        </Link>

        {/* Model Version Health Card */}
        <ModelVersionHealthCard />
      </div>

      {/* Safety & Experiment Health Section */}
      <SafetyExperimentHealthSection />

      {/* Charts Section */}
      {metrics.charts && (
        <AdminCharts 
          userGrowth={metrics.charts.userGrowth} 
          jobGrowth={metrics.charts.jobGrowth} 
        />
      )}
    </div>
  );
}

