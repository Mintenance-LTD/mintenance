import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { QuoteAnalytics, QuoteInteraction, QuoteSummaryStats } from './types';

export async function trackQuoteInteraction(
  quoteId: string,
  interactionType: QuoteInteraction['interaction_type'],
  details?: unknown
): Promise<void> {
  try {
    await mobileApiClient.post(
      `/api/contractor/quotes/${quoteId}/analytics`,
      {
        interaction_type: interactionType,
        metadata: details || undefined,
      }
    );
  } catch (error) {
    logger.error('Error tracking quote interaction', error, { service: 'quote-builder' });
  }
}

export async function getQuoteAnalytics(quoteId: string): Promise<QuoteAnalytics | null> {
  try {
    const { data, error } = await supabase
      .from('quote_analytics')
      .select('*')
      .eq('quote_id', quoteId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    logger.error('Error fetching quote analytics', error, { service: 'quote-builder' });
    throw new Error('Failed to fetch quote analytics');
  }
}

export async function getQuoteSummaryStats(contractorId: string): Promise<QuoteSummaryStats> {
  try {
    const { data, error } = await supabase
      .from('contractor_quotes')
      .select('status, total_amount')
      .eq('contractor_id', contractorId);

    if (error) throw error;

    const quotes = data || [];
    const totalQuotes = quotes.length;
    const draftQuotes    = quotes.filter((q: { status: string }) => q.status === 'draft').length;
    const sentQuotes     = quotes.filter((q: { status: string }) => q.status === 'sent').length;
    const acceptedQuotes = quotes.filter((q: { status: string }) => q.status === 'accepted').length;
    const rejectedQuotes = quotes.filter((q: { status: string }) => q.status === 'rejected').length;

    const totalValue = quotes.reduce(
      (sum: number, q: { total_amount?: number }) => sum + (q.total_amount || 0), 0
    );
    const acceptedValue = quotes
      .filter((q: { status: string }) => q.status === 'accepted')
      .reduce((sum: number, q: { total_amount?: number }) => sum + (q.total_amount || 0), 0);

    return {
      total_quotes: totalQuotes,
      draft_quotes: draftQuotes,
      sent_quotes: sentQuotes,
      accepted_quotes: acceptedQuotes,
      rejected_quotes: rejectedQuotes,
      total_value: totalValue,
      accepted_value: acceptedValue,
      average_quote_value: totalQuotes > 0 ? totalValue / totalQuotes : 0,
      acceptance_rate: sentQuotes > 0 ? (acceptedQuotes / sentQuotes) * 100 : 0,
      conversion_rate: totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0,
    };
  } catch (error) {
    logger.error('Error fetching quote summary stats', error, { service: 'quote-builder' });
    throw new Error('Failed to fetch quote summary stats');
  }
}
