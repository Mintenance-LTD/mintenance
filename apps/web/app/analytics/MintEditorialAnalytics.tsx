'use client';

/**
 * Mint Editorial /analytics surface — canonical-classes port from
 * the design system. The page-level data path (jobs + payments via
 * supabase) stays in `page.tsx`; this component owns presentation
 * only.
 *
 * Audit note (2026-05-12): the data still flows from the legacy
 * `payments` table which has 0 rows in production. Bridging to
 * `escrow_transactions` (same fix /financials and /dashboard
 * already use) is W4 scope, not this chrome-fit. KPIs will read
 * the right shape once page.tsx is updated.
 */

import React from 'react';
import { AreaChart, BarChart, DonutChart } from '@tremor/react';
import {
  MintEditorialKpiSkeleton,
  MintEditorialListSkeleton,
} from '@/components/mint-editorial/MintEditorialSkeleton';

export interface AnalyticsMetric {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

interface Props {
  loading: boolean;
  selectedPeriod: 'week' | 'month' | 'quarter' | 'year';
  onPeriodChange: (period: 'week' | 'month' | 'quarter' | 'year') => void;
  metrics: AnalyticsMetric[];
  spendingData: Array<{ month: string; spending: number; jobs: number }>;
  categoryData: Array<{ category: string; spending: number }>;
}

const PERIODS: {
  label: string;
  value: 'week' | 'month' | 'quarter' | 'year';
}[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
  { label: 'Year', value: 'year' },
];

export function MintEditorialAnalytics({
  loading,
  selectedPeriod,
  onPeriodChange,
  metrics,
  spendingData,
  categoryData,
}: Props) {
  const totalSpending = categoryData.reduce((sum, c) => sum + c.spending, 0);

  return (
    <>
      {/* Header — canonical `.t-h1` + `.t-body` + chip-style period selector */}
      <div
        className='between'
        style={{ marginBottom: 22, alignItems: 'flex-start' }}
      >
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Analytics & insights</h1>
          <p className='t-body'>
            Track your spending and project trends across your properties.
          </p>
        </div>
        <div className='row' style={{ gap: 6, flexWrap: 'wrap' }}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type='button'
              className={'chip ' + (selectedPeriod === p.value ? 'on' : '')}
              onClick={() => onPeriodChange(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      {loading ? (
        <MintEditorialKpiSkeleton count={3} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 14,
            marginBottom: 22,
          }}
        >
          {metrics.map((metric) => (
            <div key={metric.label} className='kpi'>
              <div className='label'>{metric.label}</div>
              <div className='num'>{metric.value}</div>
              <div className='sub'>
                <span
                  className={
                    metric.changeType === 'positive'
                      ? 'delta-up'
                      : metric.changeType === 'negative'
                        ? 'delta-down'
                        : ''
                  }
                >
                  {metric.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      {loading ? (
        <div style={{ marginBottom: 18 }}>
          <MintEditorialListSkeleton rowCount={4} />
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: 18,
              marginBottom: 18,
            }}
          >
            <div className='card card-pad'>
              <h2 className='t-h3' style={{ marginBottom: 14 }}>
                Spending over time
              </h2>
              <AreaChart
                data={spendingData}
                index='month'
                categories={['spending']}
                colors={['teal']}
                valueFormatter={(value) => `£${value.toLocaleString('en-GB')}`}
                showAnimation
                showLegend={false}
                showGridLines={false}
                className='h-64 sm:h-72'
              />
            </div>
            <div className='card card-pad'>
              <h2 className='t-h3' style={{ marginBottom: 14 }}>
                Spending by category
              </h2>
              <DonutChart
                data={categoryData}
                category='spending'
                index='category'
                colors={['teal', 'emerald', 'cyan', 'sky', 'blue']}
                valueFormatter={(value) => `£${value.toLocaleString('en-GB')}`}
                showAnimation
                className='h-64 sm:h-72'
              />
            </div>
          </div>

          <div className='card card-pad' style={{ marginBottom: 18 }}>
            <h2 className='t-h3' style={{ marginBottom: 14 }}>
              Job completion trend
            </h2>
            <BarChart
              data={spendingData}
              index='month'
              categories={['jobs']}
              colors={['emerald']}
              valueFormatter={(value) => `${value} jobs`}
              showAnimation
              showLegend={false}
              className='h-72'
            />
          </div>

          <div className='card'>
            <div
              className='between'
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--me-line-2)',
              }}
            >
              <h2 className='t-h3'>Category breakdown</h2>
              <span className='t-meta'>
                {categoryData.length}{' '}
                {categoryData.length === 1 ? 'category' : 'categories'}
              </span>
            </div>
            {categoryData.length === 0 ? (
              <div
                style={{
                  padding: '32px 20px',
                  textAlign: 'center',
                  color: 'var(--me-ink-3)',
                  fontSize: 13,
                }}
              >
                No spending recorded yet.
              </div>
            ) : (
              <table
                className='t-num'
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr>
                    {[
                      { label: 'Category', align: 'left' as const },
                      { label: 'Total spent', align: 'right' as const },
                      { label: '% of total', align: 'right' as const },
                    ].map((col, i) => (
                      <th
                        key={col.label}
                        className='t-eyebrow'
                        style={{
                          textAlign: col.align,
                          padding:
                            i === 0
                              ? '14px 20px'
                              : i === 2
                                ? '14px 20px 14px 12px'
                                : '14px 12px',
                          borderBottom: '1px solid var(--me-line-2)',
                          color: 'var(--me-ink-3)',
                          fontWeight: 600,
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...categoryData]
                    .sort((a, b) => b.spending - a.spending)
                    .map((cat, i, arr) => {
                      const pct = totalSpending
                        ? ((cat.spending / totalSpending) * 100).toFixed(1)
                        : '0.0';
                      const isLast = i === arr.length - 1;
                      return (
                        <tr key={cat.category}>
                          <td
                            style={{
                              padding: '14px 20px',
                              borderBottom: isLast
                                ? 'none'
                                : '1px solid var(--me-line-2)',
                              fontWeight: 500,
                              color: 'var(--me-ink)',
                            }}
                          >
                            {cat.category}
                          </td>
                          <td
                            className='me-list-amount'
                            style={{
                              padding: '14px 12px',
                              borderBottom: isLast
                                ? 'none'
                                : '1px solid var(--me-line-2)',
                              textAlign: 'right',
                            }}
                          >
                            £{cat.spending.toLocaleString('en-GB')}
                          </td>
                          <td
                            style={{
                              padding: '14px 20px 14px 12px',
                              borderBottom: isLast
                                ? 'none'
                                : '1px solid var(--me-line-2)',
                              textAlign: 'right',
                              color: 'var(--me-ink-2)',
                            }}
                          >
                            {pct}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}
