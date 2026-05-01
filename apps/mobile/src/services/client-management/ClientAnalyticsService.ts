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
 */
import type { Client, ClientAnalytics } from './types';

const NOT_IMPLEMENTED =
  'ClientAnalyticsService methods are stubs — the `client_analytics` table does not exist in production. Build /api/contractor/clients/analytics before re-enabling.';

export class ClientAnalyticsService {
  async initializeClientAnalytics(_clientId: string): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async updateClientAnalytics(_clientId: string): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async generateAnalytics(
    _contractorId: string,
    _clients: Client[]
  ): Promise<ClientAnalytics> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getAtRiskClients(_contractorId: string): Promise<Client[]> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getClientOpportunities(_contractorId: string): Promise<Client[]> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async deleteClientAnalytics(_clientId: string): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getClientSatisfactionTrend(
    _contractorId: string
  ): Promise<Array<{ date: string; score: number }>> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
