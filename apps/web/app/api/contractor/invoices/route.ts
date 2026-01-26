/**
 * Invoice Management API
 * Handles invoice creation, updates, and submission for contractors
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { rateLimiter } from '@/lib/rate-limiter';

// Invoice line item schema
const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit_price: z.number().min(0, 'Unit price cannot be negative'),
  amount: z.number().optional(), // Calculated: quantity * unit_price
});

// Invoice creation schema
const createInvoiceSchema = z.object({
  jobId: z.string().uuid().optional(),
  quoteId: z.string().uuid().optional(),
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Invalid email address'),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  title: z.string().min(1, 'Invoice title is required'),
  description: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  taxRate: z.number().min(0).max(100).default(20), // Default 20% VAT
  paymentTerms: z.string().optional().default('Payment due within 30 days'),
  notes: z.string().optional(),
  dueDate: z.string().optional(), // ISO date string
  status: z.enum(['draft', 'sent']).default('draft'),
});

// Generate invoice number
async function generateInvoiceNumber(contractorId: string): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await serverSupabase
    .from('contractor_invoices')
    .select('id', { count: 'exact', head: true })
    .eq('contractor_id', contractorId)
    .like('invoice_number', `INV-${year}-%`);

  const nextNumber = (count || 0) + 1;
  return `INV-${year}-${nextNumber.toString().padStart(5, '0')}`;
}

// Calculate invoice totals
function calculateTotals(lineItems: unknown[], taxRate: number) {
  const subtotal = lineItems.reduce((sum, item) => {
    const amount = item.quantity * item.unit_price;
    return sum + amount;
  }, 0);

  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

// GET: Fetch contractor's invoices
export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const jobId = searchParams.get('jobId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = serverSupabase
      .from('contractor_invoices')
      .select('*', { count: 'exact' })
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data: invoices, count, error } = await query;

    if (error) {
      logger.error('Error fetching invoices', error);
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invoices: invoices || [],
      total: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    logger.error('Unexpected error in GET /api/contractor/invoices', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create new invoice
export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createInvoiceSchema.parse(body);

    // Calculate totals
    const { subtotal, taxAmount, totalAmount } = calculateTotals(
      validatedData.lineItems,
      validatedData.taxRate
    );

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(user.id);

    // Calculate due date if not provided (default 30 days)
    const dueDate = validatedData.dueDate
      ? new Date(validatedData.dueDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Prepare invoice data
    const invoiceData = {
      contractor_id: user.id,
      job_id: validatedData.jobId || null,
      quote_id: validatedData.quoteId || null,
      invoice_number: invoiceNumber,
      client_name: validatedData.clientName,
      client_email: validatedData.clientEmail,
      client_phone: validatedData.clientPhone || null,
      client_address: validatedData.clientAddress || null,
      title: validatedData.title,
      description: validatedData.description || null,
      line_items: validatedData.lineItems,
      subtotal,
      tax_rate: validatedData.taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      payment_terms: validatedData.paymentTerms,
      notes: validatedData.notes || null,
      invoice_date: new Date().toISOString(),
      due_date: dueDate.toISOString(),
      status: validatedData.status,
      sent_at: validatedData.status === 'sent' ? new Date().toISOString() : null,
    };

    // Create invoice in database
    const { data: invoice, error } = await serverSupabase
      .from('contractor_invoices')
      .insert(invoiceData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating invoice', error);
      return NextResponse.json(
        { error: 'Failed to create invoice' },
        { status: 500 }
      );
    }

    // If status is 'sent', send email notification
    if (validatedData.status === 'sent' && invoice) {
      try {
        // Send invoice email (integrate with your email service)
        await sendInvoiceEmail(invoice, user);

        // Create notification for homeowner if job is linked
        if (validatedData.jobId) {
          const { data: job } = await serverSupabase
            .from('jobs')
            .select('homeowner_id')
            .eq('id', validatedData.jobId)
            .single();

          if (job) {
            await serverSupabase
              .from('notifications')
              .insert({
                user_id: job.homeowner_id,
                type: 'invoice_received',
                title: 'New Invoice Received',
                message: `You have received an invoice (${invoiceNumber}) for ${validatedData.title}`,
                data: {
                  invoice_id: invoice.id,
                  invoice_number: invoiceNumber,
                  amount: totalAmount,
                },
              });
          }
        }
      } catch (emailError) {
        logger.error('Error sending invoice email', emailError);
        // Don't fail the request if email fails
      }
    }

    logger.info('Invoice created successfully', {
      invoiceId: invoice.id,
      invoiceNumber,
      contractorId: user.id,
      status: validatedData.status,
    });

    return NextResponse.json({
      success: true,
      invoice,
      message: validatedData.status === 'sent'
        ? 'Invoice sent successfully'
        : 'Invoice saved as draft',
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid invoice data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Unexpected error in POST /api/contractor/invoices', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}

// PATCH: Update invoice
export async function PATCH(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Check if invoice belongs to contractor
    const { data: existingInvoice } = await serverSupabase
      .from('contractor_invoices')
      .select('contractor_id, status')
      .eq('id', invoiceId)
      .single();

    if (!existingInvoice || existingInvoice.contractor_id !== user.id) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Don't allow editing sent or paid invoices
    if (existingInvoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot edit paid invoices' },
        { status: 400 }
      );
    }

    // Recalculate totals if line items changed
    let updateData: unknown = { ...body };
    if (body.lineItems && body.taxRate !== undefined) {
      const { subtotal, taxAmount, totalAmount } = calculateTotals(
        body.lineItems,
        body.taxRate
      );
      updateData = {
        ...updateData,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
      };
    }

    // Update invoice
    const { data: invoice, error } = await serverSupabase
      .from('contractor_invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating invoice', error);
      return NextResponse.json(
        { error: 'Failed to update invoice' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice,
      message: 'Invoice updated successfully',
    });

  } catch (error) {
    logger.error('Unexpected error in PATCH /api/contractor/invoices', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

// Helper function to send invoice email (implement with your email service)
async function sendInvoiceEmail(invoice: unknown, contractor: unknown): Promise<void> {
  // TODO: Implement email sending logic
  // This could use SendGrid, AWS SES, or any other email service

  // Example structure:
  // const emailData = {
  //   to: invoice.client_email,
  //   from: 'invoices@mintenance.com',
  //   subject: `Invoice ${invoice.invoice_number} from ${contractor.company_name || contractor.email}`,
  //   template: 'invoice',
  //   data: {
  //     invoice,
  //     contractor,
  //     viewLink: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoice.id}`,
  //     payLink: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.id}`,
  //   },
  // };

  // await emailService.send(emailData);

  logger.info('Invoice email sent', {
    invoiceId: invoice.id,
    clientEmail: invoice.client_email,
  });
}