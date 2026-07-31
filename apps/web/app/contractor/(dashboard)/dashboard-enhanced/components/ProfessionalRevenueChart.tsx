'use client';

import { formatMoney } from '@/lib/utils/currency';

interface ChartItem {
  month: string;
  jobs: number;
  completed: number;
  revenue: number;
}

interface ProfessionalRevenueChartProps {
  chartData: ChartItem[];
  metrics: { totalRevenue: number; completedJobs: number };
  selectedPeriod: 'week' | 'month' | 'quarter';
  periodSubtitle: string;
  onPeriodChange: (period: 'week' | 'month' | 'quarter') => void;
}

export function ProfessionalRevenueChart({
  chartData,
  metrics,
  selectedPeriod,
  periodSubtitle,
  onPeriodChange,
}: ProfessionalRevenueChartProps) {
  return (
    <section className='bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden'>
      <div className='p-6 border-b border-slate-200'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-bold text-slate-900 mb-1'>
              Revenue Overview
            </h2>
            <p className='text-sm text-slate-600'>{periodSubtitle}</p>
          </div>
          <div className='flex items-center gap-2'>
            {(['week', 'month', 'quarter'] as const).map((period) => (
              <button
                key={period}
                onClick={() => onPeriodChange(period)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  selectedPeriod === period
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className='p-6'>
        <div className='space-y-5'>
          {chartData.map((item) => {
            const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);
            const percentage = (item.revenue / maxRevenue) * 100;
            return (
              <div key={item.month}>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-3'>
                    <span className='text-sm font-bold text-slate-700 w-16'>
                      {item.month}
                    </span>
                    <span className='text-xs text-slate-500'>
                      {item.jobs} {item.jobs === 1 ? 'job' : 'jobs'}
                    </span>
                  </div>
                  <span className='text-sm font-bold text-slate-900'>
                    £{item.revenue.toLocaleString()}
                  </span>
                </div>
                <div className='w-full bg-slate-100 rounded-full h-3 overflow-hidden'>
                  <div
                    className='bg-gradient-to-r from-teal-500 to-teal-600 h-3 rounded-full transition-all duration-1000 ease-out relative'
                    style={{ width: `${percentage}%` }}
                  >
                    <div className='absolute inset-0 bg-gradient-to-t from-white/20 to-transparent' />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className='grid grid-cols-3 gap-6 mt-8 pt-6 border-t border-slate-200'>
          <div>
            <div className='text-2xl font-bold text-slate-900 mb-1'>
              {formatMoney(metrics.totalRevenue, 'GBP')}
            </div>
            <div className='text-xs font-medium text-slate-600 uppercase tracking-wide'>
              Total Revenue
            </div>
          </div>
          <div>
            <div className='text-2xl font-bold text-slate-900 mb-1'>
              {metrics.completedJobs}
            </div>
            <div className='text-xs font-medium text-slate-600 uppercase tracking-wide'>
              Completed Jobs
            </div>
          </div>
          <div>
            <div className='text-2xl font-bold text-slate-900 mb-1'>
              {formatMoney(
                metrics.totalRevenue / (metrics.completedJobs || 1),
                'GBP'
              )}
            </div>
            <div className='text-xs font-medium text-slate-600 uppercase tracking-wide'>
              Avg Job Value
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
