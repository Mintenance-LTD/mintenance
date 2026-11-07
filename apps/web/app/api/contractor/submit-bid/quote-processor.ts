/**
 * Quote Processing Logic
 *
 * Handles quote creation and updates linked to bids.
 * Extracted from route.ts to improve maintainability.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import type { SubmitBidInput } from './validation';

interface QuotePayload {
  contractor_id: string;
  job_id: string;
  client_name: string;
  client_email: string;
  title: string;
  description: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  line_items: Array<{
    description: string;
    type?: 'labor' | 'material' | 'equipment';
    quantity: number;
    unitPrice: number;
    total: number;
    // 2026-05-23 audit-14: optional room-scoped pricing fields. Mobile
    // contractors using detailed bids set `unit='sqm'` + `room_id` when
    // they price by room area; legacy bids without rooms continue to
    // omit both fields. contractor_quotes.line_items is jsonb so the
    // extra keys persist without a schema migration.
    unit?: 'item' | 'sqm';
    room_id?: string | null;
  }>;
  terms: string | null;
  status: 'sent';
  quote_date: string;
  updated_at: string;
}

/**
 * Prepare quote data from bid submission
 */
export function prepareQuoteData(
  validatedData: SubmitBidInput,
  contractorId: string,
  jobTitle: string,
  homeownerName: string,
  homeownerEmail: string
): QuotePayload {
  const quoteSubtotal = validatedData.subtotal ?? validatedData.bidAmount;
  const quoteTaxRate = validatedData.taxRate ?? 0;
  const quoteTaxAmount =
    validatedData.taxAmount ?? (quoteSubtotal * quoteTaxRate) / 100;
  const quoteTotalAmount = validatedData.totalAmount ?? validatedData.bidAmount;
  const quoteLineItems =
    validatedData.lineItems && validatedData.lineItems.length > 0
      ? validatedData.lineItems
      : [];

  return {
    contractor_id: contractorId,
    job_id: validatedData.jobId,
    client_name: homeownerName,
    client_email: homeownerEmail,
    title: `Quote for ${jobTitle}`,
    description: validatedData.proposalText.trim(),
    subtotal: quoteSubtotal,
    tax_rate: quoteTaxRate,
    tax_amount: quoteTaxAmount,
    total_amount: quoteTotalAmount,
    line_items: quoteLineItems,
    terms: validatedData.terms?.trim() || null,
    status: 'sent',
    quote_date: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString(),
  };
}

/**
 * Check if quote already exists for a bid
 */
async function checkExistingQuote(
  quoteId: string,
  quotePayload: QuotePayload
): Promise<{ id: string; status: string; updated_at: string | null } | null> {
  const { data: existingQuote, error } = await serverSupabase
    .from('contractor_quotes')
    .select('id, status, updated_at')
    .eq('id', quoteId)
    .eq('contractor_id', quotePayload.contractor_id)
    .eq('job_id', quotePayload.job_id)
    .single();

  if (error) return null;
  return existingQuote;
}

/**
 * Create a new quote
 */
async function createQuote(
  quotePayload: QuotePayload
): Promise<{ quote: unknown; error: unknown }> {
  const { data: newQuote, error: quoteInsertError } = await serverSupabase
    .from('contractor_quotes')
    .insert({
      ...quotePayload,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  return { quote: newQuote, error: quoteInsertError };
}

/**
 * Update an existing quote
 */
async function updateQuote(
  existing: { id: string; status: string; updated_at: string | null },
  quotePayload: QuotePayload
): Promise<{ quote: unknown; error: unknown }> {
  let query = serverSupabase
    .from('contractor_quotes')
    .update(quotePayload)
    .eq('id', existing.id)
    .eq('contractor_id', quotePayload.contractor_id)
    .eq('job_id', quotePayload.job_id)
    .eq('status', existing.status);
  query =
    existing.updated_at === null
      ? query.is('updated_at', null)
      : query.eq('updated_at', existing.updated_at);
  const { data: updatedQuote, error: quoteUpdateError } = await query
    .select()
    .single();

  return { quote: updatedQuote, error: quoteUpdateError };
}

/**
 * Link quote to bid
 */
async function linkQuoteToBid(
  bidId: string,
  quoteId: string,
  payload: QuotePayload
): Promise<boolean> {
  const { data: linkedBid, error: linkError } = await serverSupabase
    .from('bids')
    .update({ quote_id: quoteId })
    .eq('id', bidId)
    .eq('contractor_id', payload.contractor_id)
    .eq('job_id', payload.job_id)
    .eq('status', 'pending')
    .is('quote_id', null)
    .select('id')
    .maybeSingle();

  if (linkError || !linkedBid) {
    logger.error('Failed to link quote to bid', {
      service: 'contractor',
      bidId,
      quoteId,
      error:
        linkError?.message || 'Bid changed before the quote could be linked',
    });
    return false;
  }
  return true;
}

/**
 * Process quote creation or update
 */
export async function processQuote(
  quotePayload: QuotePayload,
  existingQuoteId: string | null | undefined,
  bidId: string
): Promise<unknown> {
  if (existingQuoteId) {
    const existingQuote = await checkExistingQuote(
      existingQuoteId,
      quotePayload
    );
    // A missing/foreign/accepted quote must never become an unlinked replacement.
    if (
      !existingQuote ||
      !['draft', 'sent', 'viewed'].includes(existingQuote.status)
    ) {
      logger.warn('Linked quote cannot be revised through bid submission', {
        service: 'contractor',
        quoteId: existingQuoteId,
      });
      return null;
    }
    // Update existing quote
    const { quote, error: quoteUpdateError } = await updateQuote(
      existingQuote,
      quotePayload
    );

    if (quoteUpdateError) {
      logger.error('Failed to update quote', {
        service: 'contractor',
        contractorId: quotePayload.contractor_id,
        jobId: quotePayload.job_id,
        quoteId: existingQuote.id,
        error:
          quoteUpdateError instanceof Error
            ? quoteUpdateError.message
            : 'Unknown error',
      });
      // Don't fail the bid if quote update fails, but log it
      return null;
    }

    return quote;
  } else {
    // Create new quote
    const { quote, error: quoteInsertError } = await createQuote(quotePayload);

    if (quoteInsertError) {
      logger.error('Failed to create quote', {
        service: 'contractor',
        contractorId: quotePayload.contractor_id,
        jobId: quotePayload.job_id,
        error:
          quoteInsertError instanceof Error
            ? quoteInsertError.message
            : 'Unknown error',
      });
      // Don't fail the bid if quote creation fails, but log it
      return null;
    }

    // Link quote to bid
    if (quote && typeof quote === 'object' && 'id' in quote) {
      if (!(await linkQuoteToBid(bidId, quote.id as string, quotePayload)))
        return null;
    }

    return quote;
  }
}
