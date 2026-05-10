/**
 * Quote revisions — DEFERRED FEATURE (no-op stub).
 *
 * 2026-05-01 audit: every method previously hit
 * `supabase.from('quote_revisions').*` directly. Live DB confirms the
 * `quote_revisions` table NEVER EXISTED in production (only
 * `contractor_quotes` is real).
 *
 * 2026-05-10 (AUDIT_PUNCH_LIST P2 #52): converted from
 * `throw new Error('NOT_IMPLEMENTED')` to safe-empty returns so future
 * call sites don't crash on first integration. Methods log a warning
 * once per process so wiring this up is visible in QA/Sentry, then
 * resolve with empty/null. Zero external callers exist today
 * (verified via grep across `apps/`); this file is pure scaffold.
 *
 * Re-enable by:
 *   1. Building the `quote_revisions` table + RLS migration.
 *   2. Adding `/api/contractor/quotes/[id]/revisions` (GET, POST).
 *   3. Replacing each method body below with `mobileApiClient.<verb>(...)`.
 */
import { logger } from '../../utils/logger';
import type { QuoteRevision } from './types';

let _warned = false;
function warnDeferred(method: string): void {
  if (_warned) return;
  _warned = true;
  logger.warn(
    'QuoteRevisions: deferred feature called — `quote_revisions` table does not exist; returning empty data. Build /api/contractor/quotes/[id]/revisions before relying on this.',
    { service: 'quotes', method }
  );
}

export async function getQuoteRevisions(
  _quoteId: string
): Promise<QuoteRevision[]> {
  warnDeferred('getQuoteRevisions');
  return [];
}

export async function createQuoteRevision(
  quoteId: string,
  changesSummary: string,
  previousTotal: number,
  newTotal: number,
  revisedBy: string
): Promise<QuoteRevision> {
  warnDeferred('createQuoteRevision');
  // Returning a partial shape rather than throwing — caller sees an
  // obviously-bogus revision (id 'deferred', timestamps zeroed) so a
  // "feature not wired" UX is recoverable instead of a hard crash.
  return {
    id: 'deferred',
    quote_id: quoteId,
    changes_summary: changesSummary,
    previous_total: previousTotal,
    new_total: newTotal,
    revised_by: revisedBy,
    created_at: new Date(0).toISOString(),
  } as QuoteRevision;
}
