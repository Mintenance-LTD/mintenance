/**
 * ClientCommunicationService — STUB
 *
 * 2026-05-01 audit follow-up: every method previously hit
 * `supabase.from('client_communications').*` and
 * `supabase.from('client_communication_templates').*` directly. Live DB
 * confirms NEITHER table exists in production. The audited callers
 * therefore always failed at runtime; treating this file as the
 * placeholder it is keeps the type imports working without pretending
 * the feature is wired.
 *
 * Re-enable by:
 *   1. Building the `client_communications` + `client_communication_templates`
 *      tables + RLS migration.
 *   2. Adding `/api/contractor/clients/[id]/communications` (CRUD)
 *      and `/api/contractor/clients/communication-templates` (CRUD).
 *   3. Replacing each method body below with `mobileApiClient.<verb>(...)`.
 */
import type { Client, ClientCommunicationTemplate } from './types';

const NOT_IMPLEMENTED =
  'ClientCommunicationService methods are stubs — `client_communications` + `client_communication_templates` tables do not exist in production. Build the API before re-enabling.';

export class ClientCommunicationService {
  async sendWelcomeMessage(_client: Client): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async sendLifecycleUpdateNotification(
    _client: Client,
    _newStage: string
  ): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getCommunicationTemplates(
    _contractorId: string
  ): Promise<ClientCommunicationTemplate[]> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async createCommunicationTemplate(
    _contractorId: string,
    _template: Partial<ClientCommunicationTemplate>
  ): Promise<ClientCommunicationTemplate> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async sendBulkCommunication(
    _segmentId: string,
    _templateId: string,
    _customizations?: Record<string, unknown>
  ): Promise<{ sent: number; failed: number }> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getClientCommunicationHistory(
    _clientId: string
  ): Promise<Record<string, unknown>[]> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async cleanupClientCommunications(_clientId: string): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
