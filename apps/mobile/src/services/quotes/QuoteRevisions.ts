import { mobileApiClient } from '../../utils/mobileApiClient';
import type { QuoteRevision } from './types';

/** Recorded history only. Missing service/migration access must surface as an error. */
export async function getQuoteRevisions(
  quoteId: string
): Promise<QuoteRevision[]> {
  const revisions: QuoteRevision[] = [];
  let before: number | null = null;
  do {
    const page: { revisions: QuoteRevision[]; next_before: number | null } =
      await mobileApiClient.get(
        `/api/contractor/quotes/${encodeURIComponent(quoteId)}/revisions${before ? `?before=${before}` : ''}`
      );
    if (
      !Array.isArray(page.revisions) ||
      (page.next_before !== null &&
        (!Number.isSafeInteger(page.next_before) ||
          page.next_before < 1 ||
          (before !== null && page.next_before >= before)))
    ) {
      throw new Error('Could not read quote history. Try again.');
    }
    revisions.push(...page.revisions);
    before = page.next_before;
  } while (before !== null);
  return revisions;
}

/** @deprecated Arbitrary old/new totals cannot create an authoritative revision. */
export async function createQuoteRevision(
  _quoteId: string,
  _changesSummary: string,
  _previousTotal: number,
  _newTotal: number,
  _revisedBy: string
): Promise<QuoteRevision> {
  throw new Error(
    'Use the web quote history to prepare a versioned amendment proposal with a complete pricing breakdown. No revision was saved.'
  );
}
