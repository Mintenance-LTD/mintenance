/**
 * ClientAnalyticsService — STUB
 *
 * 2026-05-01 audit follow-up: every method previously hit
 * `supabase.from('client_analytics').*` directly. Live DB confirms
 * the `client_analytics` table NEVER EXISTED in production. The
 * audited callers therefore always failed at runtime; treating this
 * file as the placeholder it is keeps the type imports working
 * without pretending the feature is wired.
 *
 * Re-enable by:
 *   1. Building the `client_analytics` table + RLS migration.
 *   2. Adding `/api/contractor/clients/analytics` (GET).
 *   3. Replacing each method body below with `mobileApiClient.<verb>(...)`.
 *
 * 2026-05-23 audit-22 P2: previously these methods threw a hard
 * error, which made every BusinessDashboard render burn 3 React Query
 * retries before the hook gave up. The dashboard consumes
 * `clientAnalytics?.trends?.satisfactionTrend.slice(-3) || []` so a
 * benign empty shape is functionally equivalent without the retries
 * and the noisy Sentry warnings. Methods that callers actually
 * consume now return empty data; write-side methods stay no-op so
 * an accidental call doesn't pretend to persist.
 */
import type { Client, ClientAnalytics } from './types';

function emptyAnalytics(contractorId: string): ClientAnalytics {
  const now = new Date().toISOString();
  return {
    contractorId,
    period: { start: now, end: now },
    summary: {
      totalClients: 0,
      activeClients: 0,
      newClients: 0,
      churnedClients: 0,
      avgClientValue: 0,
      totalRevenue: 0,
      avgSatisfactionScore: 0,
    },
    lifecycle: {
      leads: 0,
      prospects: 0,
      customers: 0,
      repeatCustomers: 0,
      advocates: 0,
    },
    trends: {
      clientGrowth: [],
      revenueByClient: [],
      satisfactionTrend: [],
      churnRate: [],
    },
    topPerformers: [],
    atRiskClients: [],
    opportunities: [],
    lastCalculated: now,
  };
}

export class ClientAnalyticsService {
  async initializeClientAnalytics(_clientId: string): Promise<void> {
    // Write-side stub — silently no-op rather than throw so accidental
    // calls from upstream hooks (e.g. retry / refetch) don't surface
    // as user-visible errors.
  }

  async updateClientAnalytics(_clientId: string): Promise<void> {
    // See initializeClientAnalytics note.
  }

  async generateAnalytics(
    contractorId: string,
    _clients: Client[]
  ): Promise<ClientAnalytics> {
    return emptyAnalytics(contractorId);
  }

  async getAtRiskClients(_contractorId: string): Promise<Client[]> {
    return [];
  }

  async getClientOpportunities(_contractorId: string): Promise<Client[]> {
    return [];
  }

  async deleteClientAnalytics(_clientId: string): Promise<void> {
    // See initializeClientAnalytics note.
  }

  async getClientSatisfactionTrend(
    _contractorId: string
  ): Promise<Array<{ date: string; score: number }>> {
    return [];
  }
}
