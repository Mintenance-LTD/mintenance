import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type {
  QuoteAnalytics,
  QuoteInteraction,
  QuoteSummaryStats,
} from './types';

export async function trackQuoteInteraction(
  quoteId: string,
  interactionType: QuoteInteraction['interaction_type'],
  details?: unknown
): Promise<void> {
  try {
    await mobileApiClient.post(`/api/contractor/quotes/${quoteId}/analytics`, {
      interaction_type: interactionType,
      metadata: details || undefined,
    });
  } catch (error) {
    logger.error('Error tracking quote interaction', error, {
      service: 'quote-builder',
    });
  }
}

/**
 * 2026-05-01 audit follow-up: `quote_analytics` was never created in
 * production. Per-quote analytics is exposed as
 * `GET /api/contractor/quotes/[id]/analytics` instead — call that
 * directly. Stubbed here so the type-import surface stays intact for
 * any caller that still references the old function.
 */
export async function getQuoteAnalytics(
  _quoteId: string
): Promise<QuoteAnalytics | null> {
  throw new Error(
    'getQuoteAnalytics is a stub — query /api/contractor/quotes/[id]/analytics directly.'
  );
}

export async function getQuoteSummaryStats(
  _contractorId: string
): Promise<QuoteSummaryStats> {
  // 2026-05-01 audit follow-up: previous implementation queried
  // `contractor_quotes` directly. Routed through GET /api/contractor/
  // quotes which already aggregates the same stats server-side and
  // returns a `stats` object. Map the API shape onto the legacy
  // `QuoteSummaryStats` consumers expect.
  try {
    const response = await mobileApiClient.get<{
      stats: {
        total: number;
        draft: number;
        sent: number;
        accepted: number;
        declined: number;
        totalRevenue: number;
      };
      quotes?: Array<{ amount: number }>;
    }>('/api/contractor/quotes');

    const s = response.stats;
    const totalValue = (response.quotes ?? []).reduce(
      (sum, q) => sum + (q.amount || 0),
      0
    );
    return {
      total_quotes: s.total,
      draft_quotes: s.draft,
      sent_quotes: s.sent,
      accepted_quotes: s.accepted,
      rejected_quotes: s.declined,
      total_value: totalValue,
      accepted_value: s.totalRevenue,
      average_quote_value: s.total > 0 ? totalValue / s.total : 0,
      acceptance_rate: s.sent > 0 ? (s.accepted / s.sent) * 100 : 0,
      conversion_rate: s.total > 0 ? (s.accepted / s.total) * 100 : 0,
    };
  } catch (error) {
    logger.error('Error fetching quote summary stats', error, {
      service: 'quote-builder',
    });
    throw new Error('Failed to fetch quote summary stats');
  }
}
