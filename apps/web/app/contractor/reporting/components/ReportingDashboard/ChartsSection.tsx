'use client';

import React from 'react';
import {
  DynamicAreaChart,
  DynamicBarChart,
  DynamicPieChart,
} from '@/components/charts/DynamicCharts';
import {
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Pie,
  Cell,
} from 'recharts';

interface ChartsSectionProps {
  dailyRevenueData: Array<{ date: string; revenue: number; jobs: number }>;
  jobStatusData: Array<{ status: string; count: number; color: string }>;
  topServicesData: Array<{ service: string; revenue: number; jobs: number }>;
  monthlyComparisonData: Array<{ month: string; revenue: number; jobs: number }>;
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  dailyRevenueData,
  jobStatusData,
  topServicesData,
  monthlyComparisonData,
}) => {
  return (
    <>
      {/* Revenue Over Time - Full Width Chart */}
      <div className='bg-white rounded-xl border border-gray-200 p-6'>
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h2 className='text-xl font-semibold text-gray-900 mb-1'>
              Revenue Over Time
            </h2>
            <p className='text-sm text-gray-500'>
              Daily revenue performance for the selected period
            </p>
          </div>
          <div className='flex items-center gap-2 px-3 py-1.5 bg-teal-50 rounded-lg'>
            <div className='w-3 h-3 bg-teal-500 rounded-full'></div>
            <span className='text-sm font-medium text-teal-700'>
              Revenue (£)
            </span>
          </div>
        </div>

        <ResponsiveContainer width='100%' height={350}>
          <DynamicAreaChart
            data={dailyRevenueData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id='colorRevenue' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='#14B8A6' stopOpacity={0.3} />
                <stop offset='95%' stopColor='#14B8A6' stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray='3 3' stroke='#E5E7EB' />
            <XAxis
              dataKey='date'
              stroke='#6B7280'
              style={{ fontSize: '12px', fontWeight: 500 }}
            />
            <YAxis
              stroke='#6B7280'
              style={{ fontSize: '12px', fontWeight: 500 }}
              tickFormatter={(value) => `£${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '12px',
              }}
              formatter={(value: unknown) => [`£${value}`, 'Revenue']}
              labelStyle={{
                fontWeight: 600,
                color: '#111827',
                marginBottom: '4px',
              }}
            />
            <Area
              type='monotone'
              dataKey='revenue'
              stroke='#14B8A6'
              strokeWidth={3}
              fill='url(#colorRevenue)'
              animationDuration={1000}
            />
          </DynamicAreaChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Row - Jobs Status & Top Services */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {/* Jobs by Status - Donut Chart */}
        <div className='bg-white rounded-xl border border-gray-200 p-6'>
          <div className='mb-6'>
            <h2 className='text-xl font-semibold text-gray-900 mb-1'>
              Jobs by Status
            </h2>
            <p className='text-sm text-gray-500'>
              Distribution of job statuses
            </p>
          </div>

          <ResponsiveContainer width='100%' height={320}>
            <DynamicPieChart>
              <Pie
                data={jobStatusData}
                cx='50%'
                cy='50%'
                innerRadius={70}
                outerRadius={100}
                paddingAngle={5}
                dataKey='count'
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
                  padding: '12px',
                }}
                formatter={(
                  value: unknown,
                  _name: unknown,
                  entry: { payload?: { status?: string } }
                ) => [`${value} jobs`, entry.payload?.status ?? '']}
              />
            </DynamicPieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className='grid grid-cols-2 gap-3 mt-4'>
            {jobStatusData.map((item) => (
              <div key={item.status} className='flex items-center gap-2'>
                <div
                  className='w-3 h-3 rounded-full'
                  style={{ backgroundColor: item.color }}
                />
                <span className='text-sm text-gray-600'>{item.status}</span>
                <span className='text-sm font-semibold text-gray-900 ml-auto'>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Services - Bar Chart */}
        <div className='bg-white rounded-xl border border-gray-200 p-6'>
          <div className='mb-6'>
            <h2 className='text-xl font-semibold text-gray-900 mb-1'>
              Top Services by Revenue
            </h2>
            <p className='text-sm text-gray-500'>
              Most profitable service categories
            </p>
          </div>

          <ResponsiveContainer width='100%' height={320}>
            <DynamicBarChart
              data={topServicesData}
              layout='vertical'
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray='3 3'
                stroke='#E5E7EB'
                horizontal={false}
              />
              <XAxis
                type='number'
                stroke='#6B7280'
                style={{ fontSize: '12px', fontWeight: 500 }}
                tickFormatter={(value) => `£${value}`}
              />
              <YAxis
                type='category'
                dataKey='service'
                stroke='#6B7280'
                style={{ fontSize: '12px', fontWeight: 500 }}
                width={90}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  padding: '12px',
                }}
                formatter={(value: unknown) => [`£${value}`, 'Revenue']}
                labelStyle={{
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: '4px',
                }}
              />
              <Bar
                dataKey='revenue'
                fill='#14B8A6'
                radius={[0, 8, 8, 0]}
                animationDuration={1000}
              />
            </DynamicBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Comparison - Column Chart */}
      <div className='bg-white rounded-xl border border-gray-200 p-6'>
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h2 className='text-xl font-semibold text-gray-900 mb-1'>
              Monthly Performance
            </h2>
            <p className='text-sm text-gray-500'>
              Revenue and job completion trends by month
            </p>
          </div>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-2'>
              <div className='w-3 h-3 bg-teal-500 rounded-full'></div>
              <span className='text-sm font-medium text-gray-600'>
                Revenue
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-3 h-3 bg-gray-900 rounded-full'></div>
              <span className='text-sm font-medium text-gray-600'>
                Jobs
              </span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width='100%' height={320}>
          <DynamicBarChart
            data={monthlyComparisonData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray='3 3' stroke='#E5E7EB' />
            <XAxis
              dataKey='month'
              stroke='#6B7280'
              style={{ fontSize: '12px', fontWeight: 500 }}
            />
            <YAxis
              yAxisId='left'
              stroke='#6B7280'
              style={{ fontSize: '12px', fontWeight: 500 }}
              tickFormatter={(value) => `£${value}`}
            />
            <YAxis
              yAxisId='right'
              orientation='right'
              stroke='#6B7280'
              style={{ fontSize: '12px', fontWeight: 500 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '12px',
              }}
              formatter={(value: unknown, name: string) => [
                name === 'revenue' ? `£${value}` : String(value),
                name === 'revenue' ? 'Revenue' : 'Jobs',
              ]}
              labelStyle={{
                fontWeight: 600,
                color: '#111827',
                marginBottom: '4px',
              }}
            />
            <Bar
              yAxisId='left'
              dataKey='revenue'
              fill='#14B8A6'
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
            />
            <Bar
              yAxisId='right'
              dataKey='jobs'
              fill='#1F2937'
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
            />
          </DynamicBarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};
