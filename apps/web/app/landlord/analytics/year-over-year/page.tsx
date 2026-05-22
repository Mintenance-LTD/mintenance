'use client';

/**
 * /landlord/analytics/year-over-year
 *
 * Agency-tier feature: compare portfolio spend, job activity, and
 * compliance metrics across two calendar years. Page is rendered for
 * everyone but the underlying API gate (HOMEOWNER_YOY_COMPARISON) will
 * 402 for non-Agency users, which we surface as an upgrade prompt.
 *
 * Built 2026-05-22 as the last unbuilt Agency landing-page promise.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Briefcase,
  Banknote,
  ShieldCheck,
  CalendarClock,
  Tag,
} from 'lucide-react';

interface YearMetrics {
  year: number;
  spend: number;
  jobsTotal: number;
  jobsCompleted: number;
  propertiesActive: number;
  avgJobValue: number;
  topCategory: { name: string; spend: number } | null;
  complianceCertsCreated: number;
  recurringSchedulesActive: number;
}

interface YoyResponse {
  current: YearMetrics;
  previous: YearMetrics;
  deltas: {
    spendPct: number | null;
    jobsCompletedPct: number | null;
    avgJobValuePct: number | null;
  };
}

function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPct(pct: number | null): string {
  if (pct === null) return '—';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

type IconComponent = React.ComponentType<
  React.SVGProps<SVGSVGElement> & { className?: string }
>;

function deltaTone(
  pct: number | null,
  higherIsBetter = true
): {
  color: string;
  Icon: IconComponent;
} {
  if (pct === null || pct === 0) {
    return { color: 'var(--me-ink-3)', Icon: Minus };
  }
  const positive = higherIsBetter ? pct > 0 : pct < 0;
  return positive
    ? { color: 'var(--me-ok-fg)', Icon: TrendingUp }
    : { color: 'var(--me-err-fg)', Icon: TrendingDown };
}

interface MetricCardProps {
  label: string;
  current: string;
  previous: string;
  pctChange: number | null;
  Icon: IconComponent;
  higherIsBetter?: boolean;
}

function MetricCard({
  label,
  current,
  previous,
  pctChange,
  Icon,
  higherIsBetter = true,
}: MetricCardProps) {
  const { color, Icon: DeltaIcon } = deltaTone(pctChange, higherIsBetter);
  return (
    <div className='card card-pad' style={{ minHeight: 132 }}>
      <div className='between' style={{ marginBottom: 8 }}>
        <span className='t-eyebrow'>{label}</span>
        <Icon className='w-4 h-4' style={{ color: 'var(--me-ink-3)' }} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--me-ink)' }}>
        {current}
      </div>
      <div
        className='row'
        style={{ marginTop: 8, gap: 8, fontSize: 13, color }}
      >
        <DeltaIcon className='w-3.5 h-3.5' />
        <span style={{ fontWeight: 600 }}>{formatPct(pctChange)}</span>
        <span style={{ color: 'var(--me-ink-3)' }}>vs {previous}</span>
      </div>
    </div>
  );
}

export default function YoyAnalyticsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [compareYear, setCompareYear] = useState<number>(currentYear - 1);
  const [data, setData] = useState<YoyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRequiresUpgrade(false);
    try {
      const params = new URLSearchParams({
        year: String(year),
        compareYear: String(compareYear),
      });
      const res = await fetch(`/api/agency/analytics/yoy?${params}`);
      if (res.status === 402) {
        setRequiresUpgrade(true);
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to load analytics (HTTP ${res.status})`);
      }
      const json = (await res.json()) as YoyResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [year, compareYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div
        className='between'
        style={{ marginBottom: 22, gap: 16, flexWrap: 'wrap' }}
      >
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Year-over-year</h1>
          <p className='t-body'>
            Compare portfolio spend, job activity, and compliance metrics across
            calendar years. Agency plan only.
          </p>
        </div>
        <div className='row' style={{ gap: 8, flexWrap: 'wrap' }}>
          <select
            className='field'
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label='Current year'
            style={{ width: 130 }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <span style={{ alignSelf: 'center', color: 'var(--me-ink-3)' }}>
            vs
          </span>
          <select
            className='field'
            value={compareYear}
            onChange={(e) => setCompareYear(Number(e.target.value))}
            aria-label='Comparison year'
            style={{ width: 130 }}
          >
            {years
              .filter((y) => y !== year)
              .map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
          </select>
        </div>
      </div>

      {requiresUpgrade ? (
        <div
          className='card card-pad'
          style={{ textAlign: 'center', padding: 48 }}
        >
          <TrendingUp
            className='w-10 h-10'
            style={{ color: 'var(--me-ink)', margin: '0 auto 16px' }}
          />
          <h2 className='t-h2' style={{ marginBottom: 8 }}>
            Year-over-year is an Agency feature
          </h2>
          <p
            className='t-body'
            style={{ marginBottom: 20, color: 'var(--me-ink-2)' }}
          >
            Upgrade to Agency (£49.99/mo) to compare your portfolio spend, job
            activity, and compliance metrics across years.
          </p>
          <a href='/pricing' className='btn btn-primary'>
            View pricing
          </a>
        </div>
      ) : error ? (
        <div className='card card-pad' style={{ color: 'var(--me-err-fg)' }}>
          {error}
        </div>
      ) : loading ? (
        <div
          className='card card-pad'
          style={{ textAlign: 'center', padding: 64 }}
        >
          <div
            className='animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600'
            style={{ margin: '0 auto' }}
          />
        </div>
      ) : data ? (
        <>
          <div
            className='grid'
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <MetricCard
              label='Total spend'
              current={formatGBP(data.current.spend)}
              previous={formatGBP(data.previous.spend)}
              pctChange={data.deltas.spendPct}
              Icon={Banknote}
              higherIsBetter={false}
            />
            <MetricCard
              label='Jobs completed'
              current={String(data.current.jobsCompleted)}
              previous={String(data.previous.jobsCompleted)}
              pctChange={data.deltas.jobsCompletedPct}
              Icon={Briefcase}
            />
            <MetricCard
              label='Avg job value'
              current={formatGBP(data.current.avgJobValue)}
              previous={formatGBP(data.previous.avgJobValue)}
              pctChange={data.deltas.avgJobValuePct}
              Icon={Tag}
              higherIsBetter={false}
            />
            <MetricCard
              label='Compliance certs created'
              current={String(data.current.complianceCertsCreated)}
              previous={String(data.previous.complianceCertsCreated)}
              pctChange={null}
              Icon={ShieldCheck}
            />
          </div>

          <div className='card card-pad' style={{ marginBottom: 16 }}>
            <h3 className='t-h3' style={{ marginBottom: 12 }}>
              At a glance
            </h3>
            <table className='w-full' style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--me-line)' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px 0',
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'var(--me-ink-3)',
                    }}
                  >
                    Metric
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px 0',
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'var(--me-ink-3)',
                    }}
                  >
                    {data.current.year}
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px 0',
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'var(--me-ink-3)',
                    }}
                  >
                    {data.previous.year}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--me-line-2)' }}>
                  <td style={{ padding: '10px 0', fontSize: 14 }}>
                    Properties tracked
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 0' }}>
                    {data.current.propertiesActive}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 0' }}>
                    {data.previous.propertiesActive}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--me-line-2)' }}>
                  <td style={{ padding: '10px 0', fontSize: 14 }}>
                    Total jobs posted
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 0' }}>
                    {data.current.jobsTotal}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 0' }}>
                    {data.previous.jobsTotal}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--me-line-2)' }}>
                  <td style={{ padding: '10px 0', fontSize: 14 }}>
                    Recurring schedules active
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 0' }}>
                    {data.current.recurringSchedulesActive}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 0' }}>
                    {data.previous.recurringSchedulesActive}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', fontSize: 14 }}>
                    Top category by spend
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '10px 0',
                      fontSize: 14,
                    }}
                  >
                    {data.current.topCategory
                      ? `${data.current.topCategory.name} (${formatGBP(data.current.topCategory.spend)})`
                      : '—'}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '10px 0',
                      fontSize: 14,
                    }}
                  >
                    {data.previous.topCategory
                      ? `${data.previous.topCategory.name} (${formatGBP(data.previous.topCategory.spend)})`
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            className='row'
            style={{ gap: 6, color: 'var(--me-ink-3)', fontSize: 12 }}
          >
            <CalendarClock className='w-3.5 h-3.5' />
            <span>
              Spend totals reflect completed escrow releases for properties you
              own. Lower spend year-over-year is an improvement when compliance
              and job activity are stable.
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
