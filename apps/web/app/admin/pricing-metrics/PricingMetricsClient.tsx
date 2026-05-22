'use client';

/**
 * Client body for /admin/pricing-metrics — fetches and renders the
 * observability indicators for the tiered pricing rollout.
 *
 * Loads /api/admin/pricing-metrics?windowDays=N on mount and on
 * window-size change. No charting libs (keeps the page light) — the
 * primary use case is a quick scan during the 2-4 weeks post-merge.
 */

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
import { TIER_LABELS, formatGBP, TierTable, MovementCard } from './components';

interface PricingMetricsResponse {
  windowDays: number;
  asOf: string;
  contractorTierDistribution: { tier: string; count: number }[];
  feeRevenueByTier: {
    tier: string;
    totalFee: number;
    jobCount: number;
  }[];
  activeJobsAtCap: { freeBasicAtCap: number; freeBasicTotal: number };
  homeownerTierDistribution: { tier: string; count: number }[];
  subscriptionMovement: {
    contractor: { created: number; canceled: number; netChange: number };
    homeowner: { created: number; canceled: number; netChange: number };
  };
  supportSla: { tier: string; open: number; breaching: number }[];
  earlyAccessGrants: {
    contractor: number;
    homeowner: number;
    cohortLimit: number;
  };
}

export function PricingMetricsClient() {
  const [windowDays, setWindowDays] = useState(30);
  const [data, setData] = useState<PricingMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/pricing-metrics?windowDays=${windowDays}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as PricingMetricsResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [windowDays]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div
        className='between'
        style={{ marginBottom: 22, gap: 16, flexWrap: 'wrap' }}
      >
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Pricing rollout metrics</h1>
          <p className='t-body'>
            Post-merge observability for the tiered pricing model. Watch during
            the 2–4 weeks after rolling out feat/tiered-pricing.
          </p>
        </div>
        <div className='row' style={{ gap: 8 }}>
          <select
            className='field'
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            aria-label='Window size'
            style={{ width: 140 }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button
            className='btn btn-ghost btn-sm'
            onClick={load}
            disabled={loading}
            aria-label='Refresh'
          >
            <RefreshCw className='w-4 h-4' />
          </button>
        </div>
      </div>

      {error ? (
        <div className='card card-pad' style={{ color: 'var(--me-err-fg)' }}>
          {error}
        </div>
      ) : loading && !data ? (
        <div
          className='card card-pad'
          style={{ textAlign: 'center', padding: 64 }}
        >
          Loading…
        </div>
      ) : data ? (
        <div className='col' style={{ gap: 24 }}>
          {/* Early access banner */}
          <div
            className='card card-pad'
            style={{
              background: 'var(--me-brand-soft)',
              borderColor: 'var(--me-brand)',
            }}
          >
            <div className='row' style={{ gap: 12 }}>
              <Sparkles
                className='w-5 h-5'
                style={{ color: 'var(--me-brand)', marginTop: 2 }}
              />
              <div className='col' style={{ gap: 4 }}>
                <strong>Early-access founders</strong>
                <p style={{ margin: 0, fontSize: 13 }}>
                  {data.earlyAccessGrants.contractor} contractor +{' '}
                  {data.earlyAccessGrants.homeowner} homeowner grants used (of{' '}
                  {data.earlyAccessGrants.cohortLimit}/
                  {data.earlyAccessGrants.cohortLimit} cohort). All
                  automatically resolve to enterprise/agency tier.
                </p>
              </div>
            </div>
          </div>

          {/* Tier distribution */}
          <section className='card card-pad'>
            <h2 className='t-h3' style={{ marginBottom: 12 }}>
              Tier distribution
            </h2>
            <div
              className='grid'
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 16,
              }}
            >
              <TierTable
                title='Contractors (active subs)'
                rows={data.contractorTierDistribution}
              />
              <TierTable
                title='Homeowners (active subs)'
                rows={data.homeownerTierDistribution}
              />
            </div>
          </section>

          {/* Fee revenue by tier */}
          <section className='card card-pad'>
            <h2 className='t-h3' style={{ marginBottom: 4 }}>
              Platform fee revenue by tier
            </h2>
            <p className='t-body' style={{ marginBottom: 12, fontSize: 13 }}>
              Last {data.windowDays} days. Completed/released escrow only.
              Contractors without an active sub bucket as 'basic'.
            </p>
            {data.feeRevenueByTier.length === 0 ? (
              <p style={{ color: 'var(--me-ink-3)', fontSize: 13 }}>
                No completed escrow in this window.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--me-line)' }}>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '8px 0',
                        fontSize: 12,
                        textTransform: 'uppercase',
                        color: 'var(--me-ink-3)',
                      }}
                    >
                      Tier
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '8px 0',
                        fontSize: 12,
                        textTransform: 'uppercase',
                        color: 'var(--me-ink-3)',
                      }}
                    >
                      Total fees
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '8px 0',
                        fontSize: 12,
                        textTransform: 'uppercase',
                        color: 'var(--me-ink-3)',
                      }}
                    >
                      Jobs
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '8px 0',
                        fontSize: 12,
                        textTransform: 'uppercase',
                        color: 'var(--me-ink-3)',
                      }}
                    >
                      Avg/job
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.feeRevenueByTier.map((b) => (
                    <tr
                      key={b.tier}
                      style={{
                        borderBottom: '1px solid var(--me-line-2)',
                      }}
                    >
                      <td style={{ padding: '10px 0', fontSize: 14 }}>
                        {TIER_LABELS[b.tier] ?? b.tier}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          padding: '10px 0',
                          fontWeight: 600,
                        }}
                      >
                        {formatGBP(b.totalFee)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px 0' }}>
                        {b.jobCount}
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px 0' }}>
                        {formatGBP(
                          b.jobCount > 0 ? b.totalFee / b.jobCount : 0
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Active-jobs cap pressure */}
          <section className='card card-pad'>
            <div className='between' style={{ marginBottom: 8 }}>
              <h2 className='t-h3'>Free/Basic at active-jobs cap</h2>
              <TrendingUp
                className='w-4 h-4'
                style={{ color: 'var(--me-ink-3)' }}
              />
            </div>
            <p style={{ fontSize: 13, color: 'var(--me-ink-2)' }}>
              These contractors are the upgrade-pressure cohort — already at 3
              concurrent jobs. A healthy rollout should see this number tick
              upward, then individual rows convert to Pro/Business.
            </p>
            <div
              className='row'
              style={{
                marginTop: 12,
                gap: 32,
                alignItems: 'baseline',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                    color:
                      data.activeJobsAtCap.freeBasicAtCap > 0
                        ? 'var(--me-warn-fg)'
                        : 'var(--me-ink-3)',
                  }}
                >
                  {data.activeJobsAtCap.freeBasicAtCap}
                </div>
                <div style={{ fontSize: 12, color: 'var(--me-ink-3)' }}>
                  at cap
                </div>
              </div>
              <div style={{ color: 'var(--me-ink-3)' }}>
                of {data.activeJobsAtCap.freeBasicTotal} total Free/Basic
                contractors
              </div>
            </div>
          </section>

          {/* Subscription movement */}
          <section className='card card-pad'>
            <h2 className='t-h3' style={{ marginBottom: 12 }}>
              Subscription movement (last {data.windowDays}d)
            </h2>
            <div
              className='grid'
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              <MovementCard
                title='Contractor'
                created={data.subscriptionMovement.contractor.created}
                canceled={data.subscriptionMovement.contractor.canceled}
                net={data.subscriptionMovement.contractor.netChange}
              />
              <MovementCard
                title='Homeowner'
                created={data.subscriptionMovement.homeowner.created}
                canceled={data.subscriptionMovement.homeowner.canceled}
                net={data.subscriptionMovement.homeowner.netChange}
              />
            </div>
          </section>

          {/* SLA performance */}
          <section className='card card-pad'>
            <div className='between' style={{ marginBottom: 8 }}>
              <h2 className='t-h3'>Support SLA performance</h2>
              <AlertTriangle
                className='w-4 h-4'
                style={{ color: 'var(--me-ink-3)' }}
              />
            </div>
            <p style={{ fontSize: 13, color: 'var(--me-ink-2)' }}>
              Open tickets past their tier-promised response window. 48h
              Basic/Free · 24h Pro/Landlord · 4h Business/Agency.
            </p>
            {data.supportSla.length === 0 ? (
              <p
                style={{
                  marginTop: 12,
                  color: 'var(--me-ink-3)',
                  fontSize: 13,
                }}
              >
                No open tickets.
              </p>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginTop: 12,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--me-line)' }}>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '8px 0',
                        fontSize: 12,
                        textTransform: 'uppercase',
                        color: 'var(--me-ink-3)',
                      }}
                    >
                      Tier
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '8px 0',
                        fontSize: 12,
                        textTransform: 'uppercase',
                        color: 'var(--me-ink-3)',
                      }}
                    >
                      Open
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '8px 0',
                        fontSize: 12,
                        textTransform: 'uppercase',
                        color: 'var(--me-ink-3)',
                      }}
                    >
                      Breaching SLA
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.supportSla.map((r) => (
                    <tr
                      key={r.tier}
                      style={{ borderBottom: '1px solid var(--me-line-2)' }}
                    >
                      <td style={{ padding: '10px 0', fontSize: 14 }}>
                        {TIER_LABELS[r.tier] ?? r.tier}
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px 0' }}>
                        {r.open}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          padding: '10px 0',
                          fontWeight: r.breaching > 0 ? 700 : 400,
                          color:
                            r.breaching > 0
                              ? 'var(--me-err-fg)'
                              : 'var(--me-ink)',
                        }}
                      >
                        {r.breaching}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <p style={{ fontSize: 12, color: 'var(--me-ink-3)' }}>
            As of {new Date(data.asOf).toLocaleString('en-GB')}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
