/**
 * TrustStats — live four-number grid for the /trust page.
 *
 * Server component. Fetches /api/stats/trust with Next.js revalidate so
 * the numbers update hourly without re-deploying.
 */

interface TrustStatsData {
  public_tables: number;
  rls_enabled: number;
  rls_coverage_pct: number;
  policies: number;
  migrations: number;
}

async function loadTrustStats(): Promise<TrustStatsData> {
  const url = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/stats/trust`
    : '/api/stats/trust';

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return (await res.json()) as TrustStatsData;
  } catch {
    // Fallback to the audit-verified static snapshot — never blank render.
    return {
      public_tables: 324,
      rls_enabled: 323,
      rls_coverage_pct: 99.7,
      policies: 819,
      migrations: 154,
    };
  }
}

export async function TrustStats() {
  const s = await loadTrustStats();

  const cells = [
    {
      value: s.public_tables.toLocaleString(),
      label: 'Public tables',
      tone: 'neutral' as const,
    },
    {
      value: `${s.rls_coverage_pct.toFixed(1)}%`,
      label: 'Row-Level Security coverage',
      tone: 'good' as const,
    },
    {
      value: s.policies.toLocaleString(),
      label: 'Security policies enforced',
      tone: 'neutral' as const,
    },
    {
      value: s.migrations.toLocaleString(),
      label: 'Applied migrations',
      tone: 'neutral' as const,
    },
  ];

  return (
    <section className='py-12 bg-white'>
      <div className='max-w-5xl mx-auto px-6'>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          {cells.map((c) => (
            <div
              key={c.label}
              className={`rounded-2xl border p-6 text-center ${
                c.tone === 'good'
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div
                className={`text-3xl font-bold mb-1 ${
                  c.tone === 'good' ? 'text-emerald-700' : 'text-gray-900'
                }`}
              >
                {c.value}
              </div>
              <div className='text-xs uppercase tracking-wide text-gray-500 font-semibold'>
                {c.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustStats;
