import { supabase } from '../../config/supabase';
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

export async function getQuotes(
  contractorId: string,
  filters?: QuoteFilters,
  _limit: number = 50,
  _offset: number = 0
): Promise<ContractorQuote[]> {
  try {
    let query = supabase
      .from('contractor_quotes')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching quotes', error.message, {
        service: 'quote-builder',
      });
      throw new Error(error.message);
    }

    return (data ?? []) as unknown as ContractorQuote[];
  } catch (error) {
    logger.error('Error fetching quotes', error, { service: 'quote-builder' });
    throw new Error('Failed to fetch quotes');
  }
}

export async function getQuote(
  quoteId: string
): Promise<ContractorQuote | null> {
  try {
    const { data, error } = await supabase
      .from('contractor_quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error('Error fetching quote', error.message, {
        service: 'quote-builder',
      });
      throw new Error(error.message);
    }

    return (data as unknown as ContractorQuote) ?? null;
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === 'PGRST116') return null;
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
