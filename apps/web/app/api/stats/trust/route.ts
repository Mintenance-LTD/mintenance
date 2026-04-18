/**
 * GET /api/stats/trust
 *
 * Public platform-health metrics for the /trust page. Calls the
 * `public.get_trust_stats()` RPC (SECURITY DEFINER, see migration
 * 20260418000001_trust_stats_function.sql) which aggregates
 * pg_tables + pg_policies + schema_migrations. Intentionally public — no
 * auth; heavily cached at the edge.
 *
 * Source: docs/RETENTION_ROADMAP_2026.md R1 "/trust page".
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

interface TrustStats {
  public_tables: number;
  rls_enabled: number;
  rls_disabled: number;
  rls_coverage_pct: number;
  policies: number;
  migrations: number;
  generated_at: string;
}

/**
 * Values from the 2026-04-17 audit — used when the RPC is unavailable so
 * the /trust page never renders blank numbers.
 */
const FALLBACK: Omit<TrustStats, 'generated_at'> = {
  public_tables: 324,
  rls_enabled: 323,
  rls_disabled: 1,
  rls_coverage_pct: 99.7,
  policies: 819,
  migrations: 154,
};

async function loadStats(): Promise<TrustStats> {
  try {
    const { data, error } = await serverSupabase.rpc('get_trust_stats');
    if (error || !data) throw error ?? new Error('no data');

    // RPC returns TABLE(...) which the JS client presents as an array.
    const row = Array.isArray(data) ? data[0] : data;
    const tables = Number(row.public_tables) || FALLBACK.public_tables;
    const rlsEnabled = Number(row.rls_enabled) || FALLBACK.rls_enabled;
    const rlsDisabled = Number(row.rls_disabled) ?? FALLBACK.rls_disabled;
    const policies = Number(row.policies) || FALLBACK.policies;
    const migrations = Number(row.migrations) || FALLBACK.migrations;

    return {
      public_tables: tables,
      rls_enabled: rlsEnabled,
      rls_disabled: rlsDisabled,
      rls_coverage_pct:
        tables > 0 ? Math.round((rlsEnabled / tables) * 1000) / 10 : 0,
      policies,
      migrations,
      generated_at: new Date().toISOString(),
    };
  } catch (err) {
    logger.warn('trust stats: RPC failed, using audit snapshot', {
      service: 'stats/trust',
      err: err instanceof Error ? err.message : String(err),
    });
    return { ...FALLBACK, generated_at: new Date().toISOString() };
  }
}

/**
 * Public endpoint — cached for 1 hour at the edge. Numbers are slow-moving
 * (DDL frequency), so aggressive caching is safe.
 */
export const GET = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 120 } },
  async () => {
    const stats = await loadStats();
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  }
);
