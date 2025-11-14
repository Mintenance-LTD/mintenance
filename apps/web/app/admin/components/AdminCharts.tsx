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
  Legend,
} from 'recharts';

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
    <div className="flex items-center gap-5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5">
          <div
            className="w-3 h-3 rounded-full shadow-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs font-semibold text-slate-600">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminCharts({ userGrowth, jobGrowth }: AdminChartsProps) {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
      {/* User Growth Chart */}
      <div className="rounded-[16px] border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              User Growth (30 Days)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Cumulative user growth over the past month
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-[#4A67FF]">
              +{userStats.total}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              new users
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={userGrowth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4A67FF" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#4A67FF" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 2" stroke="#DCE3F0" vertical={false} strokeWidth={1} />
            <XAxis 
              dataKey="date" 
              stroke="#94A3B8"
              tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis 
              stroke="#94A3B8"
              tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                fontSize: '12px',
                padding: '10px 14px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              }}
              cursor={{ stroke: '#4A67FF', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#4A67FF"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorUsers)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Job Growth Chart */}
      <div className="rounded-[16px] border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Job Creation (30 Days)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              New jobs created daily
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-[#4CC38A]">
              +{jobStats.total}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              new jobs
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={jobGrowth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4CC38A" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#4CC38A" stopOpacity={0.3}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 2" stroke="#DCE3F0" vertical={false} strokeWidth={1} />
            <XAxis 
              dataKey="date" 
              stroke="#94A3B8"
              tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis 
              stroke="#94A3B8"
              tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                fontSize: '12px',
                padding: '10px 14px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              }}
              cursor={{ fill: 'rgba(76, 195, 138, 0.1)' }}
            />
            <Bar 
              dataKey="jobs" 
              fill="url(#colorJobs)"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Activity Comparison */}
      <div className="rounded-[16px] border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)] lg:col-span-2">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Daily Activity Comparison
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Users vs Jobs created daily
            </p>
          </div>
          <LegendDots
            items={[
              { label: 'New Users', color: '#4A67FF' },
              { label: 'New Jobs', color: '#4CC38A' },
            ]}
          />
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={combinedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#DCE3F0" vertical={false} strokeWidth={1} />
            <XAxis 
              dataKey="date" 
              stroke="#94A3B8"
              tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis 
              stroke="#94A3B8"
              tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                fontSize: '12px',
                padding: '10px 14px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              }}
              cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Line 
              type="monotone" 
              dataKey="users" 
              stroke="#4A67FF" 
              strokeWidth={3}
              dot={false}
              name="New Users"
              activeDot={{ r: 6, fill: '#4A67FF', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="jobs" 
              stroke="#4CC38A" 
              strokeWidth={3}
              dot={false}
              name="New Jobs"
              activeDot={{ r: 6, fill: '#4CC38A', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

