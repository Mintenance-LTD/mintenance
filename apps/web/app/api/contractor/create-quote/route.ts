import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';

// Line item schema
const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

// Validation schema
const createQuoteSchema = z.object({
  clientName: z.string().min(1).max(255),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  taxRate: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().nonnegative(),
  terms: z.string().optional(),
  notes: z.string().optional(),
  quoteDate: z.string().optional(),
  validUntil: z.string().optional(),
  status: z.enum(['draft', 'sent']).default('draft'),
}).refine((data) => {
  // Validate line items sum matches subtotal
  const lineItemsSum = data.lineItems.reduce((sum, item) => sum + item.total, 0);
  const subtotalMatch = Math.abs(lineItemsSum - data.subtotal) < 0.01; // Allow 1 cent rounding difference
  if (!subtotalMatch) {
    return false;
  }

  // Validate tax calculation if tax rate is provided
  if (data.taxRate !== undefined && data.taxAmount !== undefined) {
    const expectedTax = data.subtotal * (data.taxRate / 100);
    const taxMatch = Math.abs(expectedTax - data.taxAmount) < 0.01;
    if (!taxMatch) {
      return false;
    }
  }

  // Validate total amount
  const expectedTotal = data.subtotal + (data.taxAmount || 0);
  const totalMatch = Math.abs(expectedTotal - data.totalAmount) < 0.01;
  return totalMatch;
}, {
  message: 'Quote math validation failed: line items sum, tax calculation, or total amount does not match',
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUserFromCookies();

    if (!user) {
      logger.warn('Unauthorized quote creation attempt', { service: 'contractor' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a contractor
    if (user.role !== 'contractor') {
      logger.warn('Non-contractor attempted to create quote', {
        service: 'contractor',
        userId: user.id,
        role: user.role
      });
      return NextResponse.json({ error: 'Only contractors can create quotes' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createQuoteSchema.parse(body);

    // Generate quote number
    const { data: quoteNumber, error: quoteNumError } = await serverSupabase
      .rpc('generate_quote_number');

    if (quoteNumError) {
      logger.error('Failed to generate quote number', quoteNumError, { service: 'contractor' });
      return NextResponse.json({ error: 'Failed to generate quote number' }, { status: 500 });
    }

    // Create the quote
    const { data: quote, error: quoteError } = await serverSupabase
      .from('contractor_quotes')
      .insert({
        contractor_id: user.id,
        client_name: validatedData.clientName,
        client_email: validatedData.clientEmail,
        client_phone: validatedData.clientPhone,
        client_address: validatedData.clientAddress,
        title: validatedData.title,
        description: validatedData.description,
        quote_number: quoteNumber,
        line_items: validatedData.lineItems,
        subtotal: validatedData.subtotal,
        tax_rate: validatedData.taxRate || 0,
        tax_amount: validatedData.taxAmount || 0,
        total_amount: validatedData.totalAmount,
        terms: validatedData.terms,
        notes: validatedData.notes,
        quote_date: validatedData.quoteDate || new Date().toISOString().split('T')[0],
        valid_until: validatedData.validUntil,
        status: validatedData.status,
        sent_at: validatedData.status === 'sent' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (quoteError) {
      logger.error('Failed to create quote', quoteError, {
        service: 'contractor',
        contractorId: user.id
      });
      return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
    }

    logger.info('Quote created successfully', {
      service: 'contractor',
      quoteId: quote.id,
      quoteNumber: quote.quote_number,
      contractorId: user.id,
      totalAmount: validatedData.totalAmount
    });

    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        quoteNumber: quote.quote_number,
        clientName: quote.client_name,
        totalAmount: quote.total_amount,
        status: quote.status,
        createdAt: quote.created_at
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid quote creation data', {
        service: 'contractor',
        errors: error.issues
      });
      return NextResponse.json({
        error: 'Invalid quote data',
        details: error.issues
      }, { status: 400 });
    }

    logger.error('Unexpected error in create-quote', error, { service: 'contractor' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
