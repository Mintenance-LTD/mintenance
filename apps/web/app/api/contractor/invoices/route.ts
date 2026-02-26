/**
 * Invoice Management API
 * Handles invoice creation, updates, and submission for contractors
 */

import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { validateRequest } from '@/lib/validation/validator';
import { createInvoiceSchema, updateInvoiceSchema } from '@/lib/validation/schemas';
import { BadRequestError, NotFoundError, ForbiddenError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

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
function calculateTotals(lineItems: { quantity: number; unit_price: number }[], taxRate: number) {
  const subtotal = lineItems.reduce((sum: number, item) => {
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

// Helper function to send invoice email (implement with your email service)
async function sendInvoiceEmail(invoice: Record<string, unknown>, contractor: Record<string, unknown>): Promise<void> {
  // TODO: Implement email sending logic
  logger.info('Invoice email sent', {
    invoiceId: invoice.id,
    clientEmail: invoice.client_email,
  });
}

/**
 * GET /api/contractor/invoices
 * Fetch contractor's invoices with pagination and filters
 */
export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
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
      throw new InternalServerError('Failed to fetch invoices');
    }

    return NextResponse.json({
      invoices: invoices || [],
      total: count || 0,
      limit,
      offset,
    });
  },
);

/**
 * POST /api/contractor/invoices
 * Create a new invoice
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    // Validate and sanitize input using Zod schema
    const invoiceValidation = await validateRequest(request, createInvoiceSchema);
    if (invoiceValidation instanceof NextResponse) return invoiceValidation;
    const validatedData = invoiceValidation.data;

    // Calculate totals (taxRate defaults to 20 via schema validation)
    const { subtotal, taxAmount, totalAmount } = calculateTotals(
      validatedData.lineItems,
      validatedData.taxRate ?? 20,
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
      throw new InternalServerError('Failed to create invoice');
    }

    // If status is 'sent', send email notification
    if (validatedData.status === 'sent' && invoice) {
      try {
        await sendInvoiceEmail(invoice, user);

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
  },
);

/**
 * PATCH /api/contractor/invoices?id=xxx
 * Update an existing invoice
 */
export const PATCH = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');

    if (!invoiceId) {
      throw new BadRequestError('Invoice ID is required');
    }

    // Validate and sanitize input using Zod schema
    const patchValidation = await validateRequest(request, updateInvoiceSchema);
    if (patchValidation instanceof NextResponse) return patchValidation;
    const validatedPatchData = patchValidation.data;

    // Check if invoice belongs to contractor
    const { data: existingInvoice } = await serverSupabase
      .from('contractor_invoices')
      .select('contractor_id, status')
      .eq('id', invoiceId)
      .single();

    if (!existingInvoice || existingInvoice.contractor_id !== user.id) {
      throw new NotFoundError('Invoice not found');
    }

    // Don't allow editing paid invoices
    if (existingInvoice.status === 'paid') {
      throw new BadRequestError('Cannot edit paid invoices');
    }

    // Recalculate totals if line items changed
    let updateData: Record<string, unknown> = { ...validatedPatchData };
    if (validatedPatchData.lineItems && validatedPatchData.taxRate !== undefined) {
      const { subtotal, taxAmount, totalAmount } = calculateTotals(
        validatedPatchData.lineItems,
        validatedPatchData.taxRate,
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
      throw new InternalServerError('Failed to update invoice');
    }

    return NextResponse.json({
      success: true,
      invoice,
      message: 'Invoice updated successfully',
    });
  },
);

/**
 * DELETE /api/contractor/invoices?id=xxx
 * Remove an invoice (draft/sent only)
 */
export const DELETE = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');
    if (!invoiceId) {
      throw new BadRequestError('Invoice ID is required');
    }

    const { data: existing } = await serverSupabase
      .from('contractor_invoices')
      .select('id, contractor_id, status')
      .eq('id', invoiceId)
      .eq('contractor_id', user.id)
      .single();

    if (!existing) {
      throw new NotFoundError('Invoice not found');
    }

    if (existing.status === 'paid') {
      throw new BadRequestError('Cannot delete paid invoices');
    }

    const { error } = await serverSupabase
      .from('contractor_invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('contractor_id', user.id);

    if (error) {
      logger.error('Error deleting invoice', error);
      throw new InternalServerError('Failed to delete invoice');
    }

    logger.info('Invoice deleted', { invoiceId, contractorId: user.id });
    return NextResponse.json({ success: true });
  },
);
