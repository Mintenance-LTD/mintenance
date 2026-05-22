'use client';

/**
 * Sub-components for /admin/pricing-metrics. Extracted from
 * PricingMetricsClient to keep that file under the 500-line cap.
 */

export const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  professional: 'Professional',
  enterprise: 'Business',
  landlord: 'Landlord',
  agency: 'Agency',
};

export function formatGBP(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);
}

export function TierTable({
  title,
  rows,
}: {
  title: string;
  rows: { tier: string; count: number }[];
}) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
        {title}
      </h3>
      {rows.length === 0 ? (
        <p style={{ color: 'var(--me-ink-3)', fontSize: 13 }}>
          No active subscriptions.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.tier}
                style={{ borderBottom: '1px solid var(--me-line-2)' }}
              >
                <td style={{ padding: '8px 0', fontSize: 14 }}>
                  {TIER_LABELS[r.tier] ?? r.tier}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '8px 0',
                    fontWeight: 600,
                  }}
                >
                  {r.count}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '8px 0',
                    fontSize: 12,
                    color: 'var(--me-ink-3)',
                    width: 60,
                  }}
                >
                  {total > 0 ? `${Math.round((r.count / total) * 100)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function MovementCard({
  title,
  created,
  canceled,
  net,
}: {
  title: string;
  created: number;
  canceled: number;
  net: number;
}) {
  const netColor =
    net > 0
      ? 'var(--me-ok-fg)'
      : net < 0
        ? 'var(--me-err-fg)'
        : 'var(--me-ink-3)';
  return (
    <div
      style={{
        padding: 12,
        border: '1px solid var(--me-line)',
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--me-ink-3)', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: netColor }}>
        {net > 0 ? '+' : ''}
        {net}
      </div>
      <div style={{ fontSize: 12, color: 'var(--me-ink-3)', marginTop: 6 }}>
        +{created} new · −{canceled} canceled
      </div>
    </div>
  );
}
