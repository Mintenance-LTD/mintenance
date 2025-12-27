import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { handleAPIError, UnauthorizedError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor authentication required');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build query
    let query = serverSupabase
      .from('contractor_quotes')
      .select('*')
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: quotes, error } = await query;

    if (error) {
      logger.error('Error fetching quotes', error);
      throw new InternalServerError('Failed to fetch quotes');
    }

    // Transform data to match client interface
    const transformedQuotes = quotes?.map((quote) => ({
      id: quote.id,
      jobTitle: quote.title,
      customerName: quote.client_name,
      customerEmail: quote.client_email,
      status: quote.status,
      amount: parseFloat(quote.total_amount || '0'),
      createdDate: quote.quote_date || quote.created_at,
      sentDate: quote.sent_at,
      expiryDate: quote.valid_until,
      items: Array.isArray(quote.line_items) ? quote.line_items.length : 0,
      quoteNumber: quote.quote_number,
      templateUsed: quote.template_id,
    })) || [];

    // Calculate stats
    const stats = {
      total: quotes?.length || 0,
      draft: quotes?.filter((q) => q.status === 'draft').length || 0,
      sent: quotes?.filter((q) => q.status === 'sent').length || 0,
      accepted: quotes?.filter((q) => q.status === 'accepted').length || 0,
      declined: quotes?.filter((q) => q.status === 'declined' || q.status === 'rejected').length || 0,
      totalRevenue: quotes
        ?.filter((q) => q.status === 'accepted')
        .reduce((sum, q) => sum + parseFloat(q.total_amount || '0'), 0) || 0,
    };

    return NextResponse.json({ quotes: transformedQuotes, stats });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor authentication required');
    }

    const body = await request.json();
    const {
      title,
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      validUntil,
      terms,
      notes,
    } = body;

    // Validate required fields
    if (!title || !clientName || !totalAmount) {
      throw new BadRequestError('Missing required fields');
    }

    // Generate quote number using Supabase function
    const { data: quoteNumber, error: numberError } = await serverSupabase
      .rpc('generate_quote_number');

    if (numberError) {
      logger.error('Error generating quote number', numberError);
    }

    // Create quote
    const { data: newQuote, error } = await serverSupabase
      .from('contractor_quotes')
      .insert({
        contractor_id: user.id,
        title,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        client_address: clientAddress,
        line_items: lineItems || [],
        subtotal: subtotal || 0,
        tax_rate: taxRate || 0,
        tax_amount: taxAmount || 0,
        total_amount: totalAmount,
        valid_until: validUntil,
        terms,
        notes,
        quote_number: quoteNumber || `Q-${Date.now()}`,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating quote', error);
      throw new InternalServerError('Failed to create quote');
    }

    return NextResponse.json({ quote: newQuote }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
