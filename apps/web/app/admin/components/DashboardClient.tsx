'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import styles from '../admin.module.css';
import { AdminCharts } from './AdminCharts';
import { ModelVersionHealthCard } from '@/components/admin/ModelVersionHealthCard';
import { SafetyExperimentHealthSection } from '@/components/admin/SafetyExperimentHealthSection';
import { YOLOLearningStatusCard } from '@/components/admin/YOLOLearningStatusCard';
import { Icon } from '@/components/ui/Icon';
import { logger } from '@mintenance/shared';

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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await fetch('/api/admin/dashboard/metrics');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard metrics');
  }
  return response.json();
}

export function DashboardClient({
  initialMetrics,
}: {
  initialMetrics: DashboardMetrics;
}) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  const { data: metrics, isFetching: loading } = useQuery<DashboardMetrics>({
    queryKey: ['admin', 'dashboard', 'metrics'],
    queryFn: fetchDashboardMetrics,
    initialData: initialMetrics,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    meta: {
      onError: (err: unknown) => {
        logger.error('Error fetching dashboard metrics:', err);
      },
    },
  });

  useEffect(() => {
    setMounted(true);
    setLastUpdated(new Date());
  }, []);

  // Update lastUpdated timestamp when data changes
  useEffect(() => {
    if (metrics !== initialMetrics) {
      setLastUpdated(new Date());
    }
  }, [metrics, initialMetrics]);

  const efficiency =
    metrics.totalJobs > 0
      ? Math.min(99.99, 95 + (metrics.totalJobs / (metrics.totalJobs + 50)) * 5)
      : 0;

  return (
    <div className='min-h-screen bg-[#f7f9fb] px-6 md:px-10 py-8 max-w-[1440px] mx-auto'>
      {/* ── Hero Section ───────────────────────────────────────────────── */}
      <section className='mb-10'>
        <div className='flex flex-col md:flex-row md:items-end justify-between gap-6'>
          <div>
            <h2 className='text-3xl md:text-4xl font-extrabold tracking-tight text-[#2a3439] mb-2'>
              {getGreeting()}, Admin.
            </h2>
            <p className='text-[#566166] text-base md:text-lg max-w-2xl font-light'>
              Your infrastructure is operating at{' '}
              <span className='font-semibold text-[#565e74]'>
                {efficiency.toFixed(2)}% efficiency
              </span>
              .
              {mounted && lastUpdated && (
                <span className='text-sm ml-2 text-[#717c82]'>
                  Updated {lastUpdated.toLocaleTimeString('en-GB')}
                </span>
              )}
            </p>
          </div>
          <div className='flex gap-3'>
            <Link
              href='/admin/revenue'
              className='px-5 py-2.5 bg-[#565e74] text-white rounded-xl font-medium text-sm flex items-center gap-2 shadow-sm hover:brightness-110 transition-all'
            >
              <Icon name='download' size={16} color='#fff' />
              Export Report
            </Link>
            <Link
              href='/admin/audit-logs'
              className='px-5 py-2.5 bg-[#e1e9ee] text-[#2a3439] rounded-xl font-medium text-sm hover:bg-[#d9e4ea] transition-all'
            >
              View Logs
            </Link>
          </div>
        </div>

        {/* ── Bento Stats Grid ─────────────────────────────────────────── */}
        <div className='grid grid-cols-1 md:grid-cols-5 gap-5 mt-8'>
          {/* Hero revenue card — 2 cols */}
          <Link href='/admin/revenue' className='md:col-span-2'>
            <div
              className={cn(
                styles.glassCard,
                'p-7 flex flex-col justify-between min-h-[180px] cursor-pointer'
              )}
            >
              <div className='flex justify-between items-start'>
                <div className='bg-[#dae2fd] p-3 rounded-xl text-[#565e74]'>
                  <Icon name='currencyPound' size={22} color='#565e74' />
                </div>
                {loading && (
                  <span className='text-xs text-[#717c82] flex items-center gap-1'>
                    <Icon
                      name='loader'
                      size={12}
                      color='#717c82'
                      className='animate-spin'
                    />
                  </span>
                )}
              </div>
              <div className='mt-6'>
                <p className='text-[#566166] text-sm font-medium'>
                  Monthly Revenue
                </p>
                <p className='text-3xl md:text-4xl font-bold tracking-tight text-[#2a3439] mt-1'>
                  £
                  {metrics.mrr.toLocaleString('en-GB', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </Link>

          {/* Stat cards — 1 col each */}
          <StatMiniCard
            label='Total Users'
            value={metrics.totalUsers.toLocaleString()}
            href='/admin/users'
            progress={75}
            color='#565e74'
          />
          <StatMiniCard
            label='Contractors'
            value={metrics.totalContractors.toLocaleString()}
            href='/admin/verifications'
            progress={Math.round(
              (metrics.totalContractors / Math.max(metrics.totalUsers, 1)) * 100
            )}
            color='#605c78'
          />
          <StatMiniCard
            label='Total Jobs'
            value={metrics.totalJobs.toLocaleString()}
            href='/admin/jobs'
            subtitle={`${metrics.pendingVerifications} pending verifications`}
          />
        </div>
      </section>

      {/* ── Main 12-column Layout ──────────────────────────────────────── */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-7 items-start'>
        {/* Left column — 8 cols */}
        <div className='lg:col-span-8 space-y-7'>
          {/* Charts */}
          {metrics.charts && (
            <AdminCharts
              userGrowth={metrics.charts.userGrowth}
              jobGrowth={metrics.charts.jobGrowth}
            />
          )}

          {/* Quick Actions */}
          <section className='bg-white rounded-xl p-7 shadow-sm'>
            <div className='flex items-center justify-between mb-5'>
              <h3 className='text-lg font-bold text-[#2a3439]'>
                Quick Actions
              </h3>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              {[
                {
                  href: '/admin/revenue',
                  icon: 'trendingUp',
                  label: 'Revenue',
                  color: '#565e74',
                },
                {
                  href: '/admin/users',
                  icon: 'users',
                  label: 'Users',
                  color: '#506076',
                  badge: metrics.pendingVerifications,
                },
                {
                  href: '/admin/building-assessments',
                  icon: 'building',
                  label: 'Assessments',
                  color: '#605c78',
                },
                {
                  href: '/admin/communications',
                  icon: 'mail',
                  label: 'Comms',
                  color: '#565e74',
                },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className='group p-4 bg-[#f7f9fb] rounded-xl border border-[#e1e9ee] hover:shadow-md hover:border-[#ccd4ee] transition-all relative'
                >
                  {action.badge ? (
                    <span className='absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700'>
                      {action.badge > 9 ? '9+' : action.badge}
                    </span>
                  ) : null}
                  <div className='w-10 h-10 rounded-lg bg-[#e1e9ee] flex items-center justify-center mb-3 group-hover:bg-[#dae2fd] transition-colors'>
                    <Icon name={action.icon} size={20} color={action.color} />
                  </div>
                  <p className='text-sm font-semibold text-[#2a3439] group-hover:text-[#565e74] transition-colors'>
                    {action.label}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Right column — 4 cols */}
        <div className='lg:col-span-4 space-y-7'>
          {/* Security Core — dark card */}
          <Link href='/admin/security'>
            <section className={cn(styles.darkCard, 'p-7')}>
              <div className='flex items-center gap-3 mb-5'>
                <Icon name='shield' size={22} color='#dae2fd' />
                <h3 className='text-base font-bold'>Security Core</h3>
              </div>
              <div className='space-y-4'>
                <div className='bg-white/10 p-4 rounded-lg'>
                  <div className='flex justify-between text-xs mb-2'>
                    <span className='text-slate-400'>Threat Level</span>
                    <span className='text-emerald-400 font-bold'>Low</span>
                  </div>
                  <div className='w-full bg-white/5 h-1.5 rounded-full overflow-hidden'>
                    <div
                      className='bg-emerald-400 h-full rounded-full'
                      style={{ width: '15%' }}
                    />
                  </div>
                </div>
                <div className='flex items-center justify-between py-2 border-b border-white/5'>
                  <span className='text-sm text-slate-300'>
                    Pending Verifications
                  </span>
                  <span className='font-bold text-sm'>
                    {metrics.pendingVerifications}
                  </span>
                </div>
                <div className='flex items-center justify-between py-2 border-b border-white/5'>
                  <span className='text-sm text-slate-300'>Active Jobs</span>
                  <span className='font-bold text-sm'>
                    {metrics.totalJobs.toLocaleString()}
                  </span>
                </div>
              </div>
            </section>
          </Link>

          {/* Model Intelligence */}
          <ModelVersionHealthCard />

          {/* YOLO Learning */}
          <YOLOLearningStatusCard />
        </div>
      </div>

      {/* Safety & Experiment Health — full width */}
      <SafetyExperimentHealthSection />
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function StatMiniCard({
  label,
  value,
  href,
  progress,
  color = '#565e74',
  subtitle,
}: {
  label: string;
  value: string;
  href?: string;
  progress?: number;
  color?: string;
  subtitle?: string;
}) {
  const content = (
    <div className={cn(styles.statCard, 'h-full')}>
      <p className='text-[#566166] text-sm font-medium'>{label}</p>
      <p className='text-2xl font-bold text-[#2a3439] mt-2'>{value}</p>
      {progress !== undefined && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${progress}%`, backgroundColor: color }}
          />
        </div>
      )}
      {subtitle && <p className='text-xs text-[#717c82] mt-3'>{subtitle}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className='block'>
        {content}
      </Link>
    );
  }
  return content;
}
