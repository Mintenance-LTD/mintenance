import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { trackQuoteInteraction } from './QuoteAnalytics';
import type { ContractorQuote, QuoteLineItem, CreateQuoteData, UpdateQuoteData, QuoteFilters } from './types';

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
        { interaction_type: 'created', metadata: { contractor_id: contractorId } }
      );
    } catch (analyticsError) {
      logger.warn('Failed to create quote analytics', { service: 'quote-builder', error: analyticsError });
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
  limit: number = 50,
  offset: number = 0
): Promise<ContractorQuote[]> {
  try {
    let query = supabase
      .from('contractor_quotes')
      .select('*')
      .eq('contractor_id', contractorId);

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters?.template_id) {
      query = query.eq('template_id', filters.template_id);
    }
    if (filters?.date_range) {
      query = query
        .gte('created_at', filters.date_range.start)
        .lte('created_at', filters.date_range.end);
    }
    if (filters?.amount_range) {
      query = query
        .gte('total_amount', filters.amount_range.min)
        .lte('total_amount', filters.amount_range.max);
    }
    if (filters?.client_search) {
      query = query.ilike('client_name', `%${filters.client_search}%`);
    }
    if (filters?.project_search) {
      query = query.ilike('project_title', `%${filters.project_search}%`);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error fetching quotes', error, { service: 'quote-builder' });
    throw new Error('Failed to fetch quotes');
  }
}

export async function getQuote(quoteId: string): Promise<ContractorQuote | null> {
  try {
    const { data, error } = await supabase
      .from('contractor_quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    logger.error('Error fetching quote', error, { service: 'quote-builder' });
    throw new Error('Failed to fetch quote');
  }
}

export async function getQuoteLineItems(quoteId: string): Promise<QuoteLineItem[]> {
  try {
    const { data, error } = await supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('sort_order');

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error fetching quote line items', error, { service: 'quote-builder' });
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

