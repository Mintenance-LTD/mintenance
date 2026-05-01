/**
 * Quote operations — duplicate / delete / generate-PDF.
 *
 * 2026-05-01 audit follow-up: was hitting `supabase.from('contractor_quotes').delete()`
 * + `supabase.from('quote_line_items').delete()` directly. The line-
 * items table never existed in production (line items live as a JSONB
 * column on contractor_quotes), so the previous flow always 404'd on
 * the first delete and the quote row was never removed. Both paths
 * now go through `DELETE /api/contractor/quotes/[id]` which handles
 * the single-row delete server-side with ownership check.
 *
 * `duplicateQuote` reuses the API-routed `getQuote` + `createQuote`
 * path; line items are read from the JSONB column on the source row
 * via `getQuoteLineItems` (which is itself just a JSON projection
 * over `getQuote`).
 */
import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';
import { createQuote, getQuote, getQuoteLineItems } from './QuoteCRUD';
import { trackQuoteInteraction } from './QuoteAnalytics';
import type { ContractorQuote, CreateQuoteData } from './types';

export async function duplicateQuote(
  quoteId: string
): Promise<ContractorQuote> {
  try {
    const originalQuote = await getQuote(quoteId);
    if (!originalQuote) throw new Error('Quote not found');

    const lineItems = await getQuoteLineItems(quoteId);

    const duplicateData: CreateQuoteData = {
      client_name: `${originalQuote.client_name} (Copy)`,
      client_email: originalQuote.client_email,
      client_phone: originalQuote.client_phone,
      project_title: `${originalQuote.project_title} (Copy)`,
      project_description: originalQuote.project_description,
      job_id: originalQuote.job_id,
      template_id: originalQuote.template_id,
      markup_percentage: originalQuote.markup_percentage,
      discount_percentage: originalQuote.discount_percentage,
      tax_rate: originalQuote.tax_rate,
      terms_and_conditions: originalQuote.terms_and_conditions,
      notes: originalQuote.notes,
      line_items: lineItems.map((item) => ({
        item_name: item.item_name,
        item_description: item.item_description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit: item.unit,
        category: item.category,
        is_taxable: item.is_taxable,
        sort_order: item.sort_order,
      })),
    };

    return await createQuote(originalQuote.contractor_id, duplicateData);
  } catch (error) {
    logger.error('Error duplicating quote', error, {
      service: 'quote-builder',
    });
    throw new Error('Failed to duplicate quote');
  }
}

export async function deleteQuote(quoteId: string): Promise<void> {
  try {
    await mobileApiClient.delete(`/api/contractor/quotes/${quoteId}`);
  } catch (error) {
    logger.error('Error deleting quote', error, { service: 'quote-builder' });
    throw new Error('Failed to delete quote');
  }
}

export async function generateQuotePDF(quoteId: string): Promise<string> {
  try {
    const quote = await getQuote(quoteId);
    if (!quote) throw new Error('Quote not found');

    await getQuoteLineItems(quoteId);
    await trackQuoteInteraction(quoteId, 'downloaded');

    return `Generated PDF for quote ${quote.quote_number}`;
  } catch (error) {
    logger.error('Error generating quote PDF', error, {
      service: 'quote-builder',
    });
    throw new Error('Failed to generate quote PDF');
  }
}
