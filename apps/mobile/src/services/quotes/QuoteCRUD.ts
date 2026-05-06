import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { trackQuoteInteraction } from './QuoteAnalytics';
import type {
  ContractorQuote,
  QuoteLineItem,
  CreateQuoteData,
  UpdateQuoteData,
  QuoteFilters,
} from './types';

export async function createQuote(
  contractorId: string,
  quoteData: CreateQuoteData
): Promise<ContractorQuote> {
  try {
    let subtotal = 0;
    const lineItems = quoteData.line_items.map((item) => {
      const itemSubtotal = item.quantity * item.unit_price;
      subtotal += itemSubtotal;
      return { ...item, subtotal: itemSubtotal };
    });

    const markup = (quoteData.markup_percentage || 0) / 100;
    const discount = (quoteData.discount_percentage || 0) / 100;
    const taxRate = quoteData.tax_rate || 0.2;

    const subtotalAfterMarkup = subtotal * (1 + markup);
    const discountAmount = subtotalAfterMarkup * discount;
    const taxableAmount = subtotalAfterMarkup - discountAmount;
    const taxAmount = taxableAmount * taxRate;
    const totalAmount = taxableAmount + taxAmount;

    const response = await mobileApiClient.post<{ quote: ContractorQuote }>(
      '/api/contractor/quotes',
      {
        title: quoteData.project_title,
        clientName: quoteData.client_name,
        clientEmail: quoteData.client_email,
        clientPhone: quoteData.client_phone,
        lineItems: lineItems,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        validUntil: quoteData.valid_until,
        terms: quoteData.terms_and_conditions,
        notes: quoteData.notes,
      }
    );

    const quote = response.quote;

    // Initialize analytics via the analytics endpoint
    try {
      await mobileApiClient.post(
        `/api/contractor/quotes/${quote.id}/analytics`,
        {
          interaction_type: 'created',
          metadata: { contractor_id: contractorId },
        }
      );
    } catch (analyticsError) {
      logger.warn('Failed to create quote analytics', {
        service: 'quote-builder',
        error: analyticsError,
      });
    }

    return quote;
  } catch (error) {
    logger.error('Error creating quote', error, { service: 'quote-builder' });
    throw new Error('Failed to create quote');
  }
}

/**
 * 2026-05-01 audit follow-up: list + get were the last direct
 * supabase reads in this file. Both go through GET /api/contractor/
 * quotes (list, supports `?status=`) and a client-side filter for the
 * single-row case (the API doesn't expose a per-id GET separately, but
 * the list endpoint returns the row we need). Keeps the public surface
 * identical so callers don't change.
 */
export async function getQuotes(
  _contractorId: string,
  filters?: QuoteFilters,
  _limit: number = 50,
  _offset: number = 0
): Promise<ContractorQuote[]> {
  try {
    // The list endpoint accepts a single status filter; if the caller
    // passed multiple, fan out a request per status and merge.
    if (filters?.status && filters.status.length > 1) {
      const responses = await Promise.all(
        filters.status.map((s) =>
          mobileApiClient.get<{ quotes: ContractorQuote[] }>(
            `/api/contractor/quotes?status=${encodeURIComponent(s)}`
          )
        )
      );
      return responses.flatMap((r) => r.quotes ?? []);
    }
    const onlyStatus = filters?.status?.[0];
    const status = onlyStatus
      ? `?status=${encodeURIComponent(onlyStatus)}`
      : '';
    const response = await mobileApiClient.get<{ quotes: ContractorQuote[] }>(
      `/api/contractor/quotes${status}`
    );
    return response.quotes ?? [];
  } catch (error) {
    logger.error('Error fetching quotes', error, { service: 'quote-builder' });
    throw new Error('Failed to fetch quotes');
  }
}

export async function getQuote(
  quoteId: string
): Promise<ContractorQuote | null> {
  try {
    // The list endpoint already returns every quote for the contractor;
    // filter client-side rather than building a second per-id route.
    // For single-row use cases this is one round-trip with the same
    // ownership guarantee as the list path.
    const response = await mobileApiClient.get<{
      quotes: ContractorQuote[];
    }>('/api/contractor/quotes');
    return response.quotes?.find((q) => q.id === quoteId) ?? null;
  } catch (error) {
    logger.error('Error fetching quote', error, { service: 'quote-builder' });
    throw new Error('Failed to fetch quote');
  }
}

export async function getQuoteLineItems(
  quoteId: string
): Promise<QuoteLineItem[]> {
  try {
    // Line items are included in the quote response from the API
    const quote = await getQuote(quoteId);
    return (
      (quote as unknown as { line_items?: QuoteLineItem[] })?.line_items || []
    );
  } catch (error) {
    logger.error('Error fetching quote line items', error, {
      service: 'quote-builder',
    });
    throw new Error('Failed to fetch quote line items');
  }
}

export async function updateQuote(
  quoteId: string,
  quoteData: UpdateQuoteData
): Promise<ContractorQuote> {
  try {
    const response = await mobileApiClient.put<{ quote: ContractorQuote }>(
      `/api/contractor/quotes/${quoteId}`,
      {
        title: quoteData.title,
        client_name: quoteData.client_name,
        total_amount: quoteData.total_amount,
        status: quoteData.status,
        line_items: quoteData.line_items,
        terms: quoteData.terms,
        notes: quoteData.notes,
        valid_until: quoteData.valid_until,
      }
    );

    if (quoteData.status) {
      await trackQuoteInteraction(quoteId, 'shared', {
        new_status: quoteData.status,
        timestamp: new Date().toISOString(),
      });
    }

    return response.quote;
  } catch (error) {
    logger.error('Error updating quote', error, { service: 'quote-builder' });
    throw new Error('Failed to update quote');
  }
}

export async function sendQuote(quoteId: string): Promise<ContractorQuote> {
  try {
    const response = await mobileApiClient.post<{ quote: ContractorQuote }>(
      '/api/contractor/send-quote',
      { quoteId }
    );

    await trackQuoteInteraction(quoteId, 'sent');

    return response.quote;
  } catch (error) {
    logger.error('Error sending quote', error, { service: 'quote-builder' });
    throw new Error('Failed to send quote');
  }
}
