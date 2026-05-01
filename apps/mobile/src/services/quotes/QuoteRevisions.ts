/**
 * Quote revisions — STUB.
 *
 * 2026-05-01 audit follow-up: every method previously hit
 * `supabase.from('quote_revisions').*` directly. Live DB confirms the
 * `quote_revisions` table NEVER EXISTED in production (only
 * `contractor_quotes` is real). The audited callers therefore always
 * threw at runtime; treating this file as the placeholder it is keeps
 * the type imports working without pretending the feature is wired.
 *
 * Re-enable by:
 *   1. Building the `quote_revisions` table + RLS migration.
 *   2. Adding `/api/contractor/quotes/[id]/revisions` (GET, POST).
 *   3. Replacing each method body below with `mobileApiClient.<verb>(...)`.
 */
import type { QuoteRevision } from './types';

const NOT_IMPLEMENTED =
  'Quote revisions are a placeholder feature — the `quote_revisions` table does not exist in production. Build /api/contractor/quotes/[id]/revisions before enabling.';

export async function getQuoteRevisions(
  _quoteId: string
): Promise<QuoteRevision[]> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function createQuoteRevision(
  _quoteId: string,
  _changesSummary: string,
  _previousTotal: number,
  _newTotal: number,
  _revisedBy: string
): Promise<QuoteRevision> {
  throw new Error(NOT_IMPLEMENTED);
}
