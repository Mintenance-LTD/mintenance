import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
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

    const { data: quote, error: quoteError } = await supabase
      .from('contractor_quotes')
      .insert({
        contractor_id: contractorId,
        job_id: quoteData.job_id,
        client_name: quoteData.client_name,
        client_email: quoteData.client_email,
        client_phone: quoteData.client_phone,
        project_title: quoteData.project_title,
        project_description: quoteData.project_description,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        markup_percentage: quoteData.markup_percentage,
        discount_percentage: quoteData.discount_percentage,
        tax_rate: taxRate,
        currency: 'GBP',
        status: 'draft',
        valid_until: quoteData.valid_until,
        terms_and_conditions: quoteData.terms_and_conditions,
        notes: quoteData.notes,
        template_id: quoteData.template_id,
      })
      .select()
      .single();

    if (quoteError) throw quoteError;

    const quoteLineItems = lineItems.map((item, index) => ({
      quote_id: quote.id,
      item_name: item.item_name,
      item_description: item.item_description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit: item.unit,
      subtotal: item.subtotal,
      category: item.category,
      is_taxable: item.is_taxable,
      sort_order: index + 1,
    }));

    const { error: lineItemsError } = await supabase
      .from('quote_line_items')
      .insert(quoteLineItems);

    if (lineItemsError) throw lineItemsError;

    if (quoteData.template_id) {
      await supabase
        .from('quote_templates')
        .update({ usage_count: supabase.raw('usage_count + 1') })
        .eq('id', quoteData.template_id);
    }

    const { error: analyticsError } = await supabase.from('quote_analytics').insert({
      contractor_id: contractorId,
      quote_id: quote.id,
      view_count: 0,
      download_count: 0,
      share_count: 0,
      client_engagement_score: 0,
    });

    if (analyticsError)
      logger.warn('Failed to create quote analytics', { service: 'quote-builder', error: analyticsError });

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
    const { data, error } = await supabase
      .from('contractor_quotes')
      .update({ ...quoteData, updated_at: new Date().toISOString() })
      .eq('id', quoteId)
      .select()
      .single();

    if (error) throw error;

    if (quoteData.status) {
      await trackQuoteInteraction(quoteId, 'shared', {
        new_status: quoteData.status,
        timestamp: new Date().toISOString(),
      });
    }

    return data;
  } catch (error) {
    logger.error('Error updating quote', error, { service: 'quote-builder' });
    throw new Error('Failed to update quote');
  }
}

export async function sendQuote(quoteId: string): Promise<ContractorQuote> {
  try {
    const { data, error } = await supabase
      .from('contractor_quotes')
      .update({ status: 'sent', sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString() })
      .eq('id', quoteId)
      .select()
      .single();

    if (error) throw error;

    await trackQuoteInteraction(quoteId, 'sent');

    return data;
  } catch (error) {
    logger.error('Error sending quote', error, { service: 'quote-builder' });
    throw new Error('Failed to send quote');
  }
}

