import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bidId: string }> }
) {
  try {
    const { bidId } = await params;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to view quote');
    }

    // Fetch bid with quote_id
    const { data: bid, error: bidError } = await serverSupabase
      .from('bids')
      .select(`
        id,
        job_id,
        contractor_id,
        amount,
        description,
        status,
        quote_id,
        jobs (
          id,
          title,
          homeowner_id
        )
      `)
      .eq('id', bidId)
      .single();

    if (bidError || !bid) {
      logger.warn('Quote fetch failed - bid not found', {
        service: 'bids',
        bidId,
        error: bidError?.message,
      });
      throw new NotFoundError('Bid not found');
    }

    // Verify user has access to this bid
    const job = Array.isArray(bid.jobs) ? bid.jobs[0] : bid.jobs;
    const isContractor = user.id === bid.contractor_id;
    const isHomeowner = user.id === job?.homeowner_id;

    if (!isContractor && !isHomeowner) {
      throw new ForbiddenError('Not authorized to view this quote');
    }

    // If no quote_id, return basic bid info
    if (!bid.quote_id) {
      return NextResponse.json({
        bidId: bid.id,
        jobId: bid.job_id,
        amount: bid.amount,
        description: bid.description,
        status: bid.status,
        hasQuote: false,
      });
    }

    // Fetch quote details
    const { data: quote, error: quoteError } = await serverSupabase
      .from('contractor_quotes')
      .select('*')
      .eq('id', bid.quote_id)
      .single();

    if (quoteError || !quote) {
      logger.warn('Quote fetch failed - quote not found', {
        service: 'bids',
        bidId,
        quoteId: bid.quote_id,
        error: quoteError?.message,
      });
      throw new NotFoundError('Quote not found');
    }

    return NextResponse.json({
      bidId: bid.id,
      jobId: bid.job_id,
      jobTitle: job?.title,
      quote: {
        id: quote.id,
        title: quote.title,
        description: quote.description,
        clientName: quote.client_name,
        clientEmail: quote.client_email,
        subtotal: parseFloat(quote.subtotal?.toString() || '0'),
        taxRate: parseFloat(quote.tax_rate?.toString() || '0'),
        taxAmount: parseFloat(quote.tax_amount?.toString() || '0'),
        totalAmount: parseFloat(quote.total_amount?.toString() || '0'),
        lineItems: quote.line_items || [],
        terms: quote.terms,
        notes: quote.notes,
        quoteDate: quote.quote_date,
        validUntil: quote.valid_until,
        status: quote.status,
        createdAt: quote.created_at,
        updatedAt: quote.updated_at,
      },
      hasQuote: true,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

