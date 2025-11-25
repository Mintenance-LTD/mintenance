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
    quantity: number;
    unitPrice: number;
    total: number;
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
  const quoteTaxAmount = validatedData.taxAmount ?? (quoteSubtotal * quoteTaxRate) / 100;
  const quoteTotalAmount = validatedData.totalAmount ?? validatedData.bidAmount;
  const quoteLineItems = validatedData.lineItems && validatedData.lineItems.length > 0
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
export async function checkExistingQuote(quoteId: string | null | undefined): Promise<{ id: string } | null> {
  if (!quoteId) {
    return null;
  }

  const { data: existingQuote } = await serverSupabase
    .from('contractor_quotes')
    .select('id')
    .eq('id', quoteId)
    .single();

  return existingQuote;
}

/**
 * Create a new quote
 */
export async function createQuote(
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
export async function updateQuote(
  quoteId: string,
  quotePayload: QuotePayload
): Promise<{ quote: unknown; error: unknown }> {
  const { data: updatedQuote, error: quoteUpdateError } = await serverSupabase
    .from('contractor_quotes')
    .update(quotePayload)
    .eq('id', quoteId)
    .select()
    .single();

  return { quote: updatedQuote, error: quoteUpdateError };
}

/**
 * Link quote to bid
 */
export async function linkQuoteToBid(
  bidId: string,
  quoteId: string
): Promise<void> {
  const { error: linkError } = await serverSupabase
    .from('bids')
    .update({ quote_id: quoteId })
    .eq('id', bidId);

  if (linkError) {
    logger.error('Failed to link quote to bid', {
      service: 'contractor',
      bidId,
      quoteId,
      error: linkError.message,
    });
    // Don't throw - quote creation succeeded, linking is secondary
  }
}

/**
 * Process quote creation or update
 */
export async function processQuote(
  quotePayload: QuotePayload,
  existingQuoteId: string | null | undefined,
  bidId: string
): Promise<unknown> {
  const existingQuote = await checkExistingQuote(existingQuoteId);

  if (existingQuote?.id) {
    // Update existing quote
    const { quote, error: quoteUpdateError } = await updateQuote(existingQuote.id, quotePayload);

    if (quoteUpdateError) {
      logger.error('Failed to update quote', {
        service: 'contractor',
        contractorId: quotePayload.contractor_id,
        jobId: quotePayload.job_id,
        quoteId: existingQuote.id,
        error: quoteUpdateError instanceof Error ? quoteUpdateError.message : 'Unknown error',
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
        error: quoteInsertError instanceof Error ? quoteInsertError.message : 'Unknown error',
      });
      // Don't fail the bid if quote creation fails, but log it
      return null;
    }

    // Link quote to bid
    if (quote && typeof quote === 'object' && 'id' in quote) {
      await linkQuoteToBid(bidId, quote.id as string);
    }

    return quote;
  }
}

