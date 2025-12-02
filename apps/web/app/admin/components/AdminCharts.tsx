'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface ChartDataPoint {
  date: string;
  users?: number;
  jobs?: number;
  cumulative?: number;
}

interface AdminChartsProps {
  userGrowth: ChartDataPoint[];
  jobGrowth: ChartDataPoint[];
}

// Legend Dots Component
function LegendDots({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="flex items-center gap-4 text-xs text-slate-500">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminCharts(props: AdminChartsProps) {
  return (
    <ErrorBoundary componentName="AdminCharts">
      <AdminChartsContent {...props} />
    </ErrorBoundary>
  );
}

function AdminChartsContent({ userGrowth, jobGrowth }: AdminChartsProps) {
  // Calculate stats for header
  const userStats = useMemo(() => {
    const total = userGrowth.reduce((sum, item) => sum + (item.users || 0), 0);
    const last7Days = userGrowth.slice(-7).reduce((sum, item) => sum + (item.users || 0), 0);
    const prev7Days = userGrowth.slice(-14, -7).reduce((sum, item) => sum + (item.users || 0), 0);
    const change = prev7Days > 0 
      ? ((last7Days - prev7Days) / prev7Days * 100).toFixed(1)
      : last7Days > 0 ? '100' : '0';
    return { total, change };
  }, [userGrowth]);

  const jobStats = useMemo(() => {
    const total = jobGrowth.reduce((sum, item) => sum + (item.jobs || 0), 0);
    const last7Days = jobGrowth.slice(-7).reduce((sum, item) => sum + (item.jobs || 0), 0);
    const prev7Days = jobGrowth.slice(-14, -7).reduce((sum, item) => sum + (item.jobs || 0), 0);
    const change = prev7Days > 0
      ? ((last7Days - prev7Days) / prev7Days * 100).toFixed(1)
      : last7Days > 0 ? '100' : '0';
    return { total, change };
  }, [jobGrowth]);

  const combinedData = useMemo(() => {
    return userGrowth.map((item, index) => ({
      date: item.date,
      users: item.users || 0,
      jobs: jobGrowth[index]?.jobs || 0,
    }));
  }, [userGrowth, jobGrowth]);

  const axisStyle = {
    stroke: '#E2E8F0',
    tick: { fontSize: 11, fill: '#64748B' },
    axisLine: false,
    tickLine: false,
    tickMargin: 8,
  };

  const tooltipStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    fontSize: '12px',
    padding: '10px 14px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
  } as const;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1 mb-4">
          <h3 className="text-sm font-semibold text-slate-900">User Growth (30 days)</h3>
          <p className="text-xs text-slate-400">
            Cumulative new users • +{userStats.total} • {userStats.change}% vs last month
          </p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={userGrowth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="date" {...axisStyle} />
            <YAxis {...axisStyle} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ stroke: '#0ea5e9', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Area type="monotone" dataKey="cumulative" stroke="#0ea5e9" strokeWidth={2} fill="url(#colorUsers)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1 mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Job Creation (30 days)</h3>
          <p className="text-xs text-slate-400">
            Daily jobs created • +{jobStats.total} • {jobStats.change}% vs last month
          </p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={jobGrowth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="date" {...axisStyle} />
            <YAxis {...axisStyle} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }} />
            <Bar dataKey="jobs" fill="url(#colorJobs)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:col-span-2">
        <div className="flex flex-col gap-1 mb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Daily Activity Comparison</h3>
            <p className="text-xs text-slate-400">New users vs jobs created</p>
          </div>
          <LegendDots
            items={[
              { label: 'New users', color: '#0ea5e9' },
              { label: 'New jobs', color: '#10b981' },
            ]}
          />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={combinedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="date" {...axisStyle} />
            <YAxis {...axisStyle} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ stroke: '#CBD5F5', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Line type="monotone" dataKey="users" stroke="#0ea5e9" strokeWidth={2} dot={false} name="New users" />
            <Line type="monotone" dataKey="jobs" stroke="#10b981" strokeWidth={2} dot={false} name="New jobs" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


