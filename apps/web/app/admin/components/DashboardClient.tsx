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
import { YOLOLearningStatusCard } from '@/components/admin/YOLOLearningStatusCard';
import { AdminCard } from '@/components/admin/AdminCard';

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

interface QuickActionCardProps {
  href: string;
  icon: string;
  title: string;
  description: string;
  badgeContent?: React.ReactNode;
  iconColor?: string;
}

function QuickActionCard({ href, icon, title, description, badgeContent, iconColor = '#0F172A' }: QuickActionCardProps) {
  return (
    <Link href={href} className={cn(styles.adminCardLink, 'group h-full')}>
      <AdminCard className="h-full relative" hover padding="lg">
        {badgeContent && <div className="absolute top-4 right-4">{badgeContent}</div>}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <Icon name={icon} size={20} color={iconColor} className="text-slate-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      </AdminCard>
    </Link>
  );
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
    <div className="p-8 md:p-10 max-w-[1440px] mx-auto bg-slate-50 min-h-screen space-y-8">
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
      <section className="mt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
      </section>

      {/* Action Cards Row */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            href="/admin/revenue"
            icon="trendingUp"
            title="Revenue Analytics"
            description="View subscription revenue, MRR, conversion rates, and payment tracking."
            iconColor="#2563EB"
          />
          <QuickActionCard
            href="/admin/users"
            icon="users"
            title="User Management"
            description={`Manage users and verify contractors${metrics.pendingVerifications > 0 ? ` (${metrics.pendingVerifications} pending)` : ''}.`}
            iconColor="#2563EB"
            badgeContent={
              metrics.pendingVerifications > 0 ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 font-semibold">
                  {metrics.pendingVerifications > 9 ? '9+' : metrics.pendingVerifications} pending
                </span>
              ) : null
            }
          />
          <QuickActionCard
            href="/admin/security"
            icon="shield"
            title="Security Dashboard"
            description="Monitor security events, threats, and system health."
            iconColor="#0F172A"
          />
          <div className="h-full">
            <ModelVersionHealthCard />
          </div>
        </div>
      </section>

      {/* YOLO Learning Status */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <YOLOLearningStatusCard />
        </div>
      </section>

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


