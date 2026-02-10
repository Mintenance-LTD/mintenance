import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { handleAPIError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors/api-error';

/**
 * Invoice PDF generation endpoint (Issue 20)
 * Generates a plain-text PDF representation of an invoice.
 * Uses server-side HTML generation for consistent output.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) throw new UnauthorizedError();

    const { invoiceId } = await params;

    // Fetch the invoice
    const { data: invoice, error } = await serverSupabase
      .from('contractor_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Verify the user owns this invoice or is the client
    if (invoice.contractor_id !== user.id && invoice.client_email !== user.email) {
      throw new ForbiddenError('You do not have access to this invoice');
    }

    // Build PDF-friendly HTML
    const lineItems = (invoice.line_items || []) as Array<{
      description: string;
      quantity: number;
      unit_price: number;
    }>;

    const subtotal = lineItems.reduce(
      (sum: number, item: { quantity: number; unit_price: number }) => sum + item.quantity * item.unit_price,
      0,
    );
    const taxRate = invoice.tax_rate ?? 20;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    const html = buildInvoiceHTML({
      invoiceNumber: invoice.invoice_number,
      title: invoice.title,
      description: invoice.description,
      clientName: invoice.client_name,
      clientEmail: invoice.client_email,
      clientAddress: invoice.client_address,
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      total,
      currency: 'GBP',
      paymentTerms: invoice.payment_terms,
      notes: invoice.notes,
      dueDate: invoice.due_date,
      createdAt: invoice.created_at,
      vatNumber: invoice.vat_number,
    });

    // Return HTML with print-optimised headers
    // Clients can use browser print-to-PDF or we can expand to jsPDF server-side
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${invoice.invoice_number}.html"`,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

interface InvoiceHTMLParams {
  invoiceNumber: string;
  title: string;
  description?: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  lineItems: Array<{ description: string; quantity: number; unit_price: number }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  paymentTerms?: string;
  notes?: string;
  dueDate?: string;
  createdAt: string;
  vatNumber?: string;
}

function buildInvoiceHTML(params: InvoiceHTMLParams): string {
  const fmt = (amount: number) => `£${amount.toFixed(2)}`;
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const lineItemsHTML = params.lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHTML(item.description)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(item.unit_price)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(item.quantity * item.unit_price)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${escapeHTML(params.invoiceNumber)}</title>
  <style>
    @media print { @page { size: A4; margin: 15mm; } body { margin: 0; } .no-print { display: none; } }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 28px; margin: 0 0 4px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 32px; }
    .meta { font-size: 14px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { padding: 8px; text-align: left; border-bottom: 2px solid #1f2937; font-size: 14px; }
    .totals td { padding: 6px 8px; font-size: 14px; }
    .total-row { font-weight: 700; font-size: 16px; }
    .disclaimer { margin-top: 32px; padding: 12px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; font-size: 12px; color: #92400e; }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;">
    <button onclick="window.print()" style="padding:8px 16px;background:#059669;color:white;border:none;border-radius:6px;cursor:pointer;">Download as PDF (Print)</button>
  </div>

  <div class="header">
    <div>
      <h1>INVOICE</h1>
      <div class="meta">${escapeHTML(params.invoiceNumber)}</div>
      <div class="meta">Date: ${fmtDate(params.createdAt)}</div>
      ${params.dueDate ? `<div class="meta">Due: ${fmtDate(params.dueDate)}</div>` : ''}
    </div>
    <div style="text-align:right;">
      <div style="font-weight:600;">MINTENANCE LTD</div>
      <div class="meta">Suite 2 J2 Business Park</div>
      <div class="meta">Bridge Hall Lane, Bury, BL9 7NY</div>
      <div class="meta">Company No. 16542104</div>
      ${params.vatNumber ? `<div class="meta">VAT No. ${escapeHTML(params.vatNumber)}</div>` : ''}
    </div>
  </div>

  <div style="margin-bottom:24px;">
    <div style="font-weight:600;margin-bottom:4px;">Bill To:</div>
    <div>${escapeHTML(params.clientName)}</div>
    <div class="meta">${escapeHTML(params.clientEmail)}</div>
    ${params.clientAddress ? `<div class="meta">${escapeHTML(params.clientAddress)}</div>` : ''}
  </div>

  <div style="font-weight:600;font-size:18px;margin-bottom:8px;">${escapeHTML(params.title)}</div>
  ${params.description ? `<p class="meta">${escapeHTML(params.description)}</p>` : ''}

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${lineItemsHTML}</tbody>
  </table>

  <table class="totals" style="width:300px;margin-left:auto;margin-top:16px;">
    <tr><td>Subtotal</td><td style="text-align:right;">${fmt(params.subtotal)}</td></tr>
    <tr><td>VAT (${params.taxRate}%)</td><td style="text-align:right;">${fmt(params.taxAmount)}</td></tr>
    <tr class="total-row" style="border-top:2px solid #1f2937;"><td>Total</td><td style="text-align:right;">${fmt(params.total)}</td></tr>
  </table>

  ${params.paymentTerms ? `<p class="meta" style="margin-top:24px;"><strong>Payment Terms:</strong> ${escapeHTML(params.paymentTerms)}</p>` : ''}
  ${params.notes ? `<p class="meta"><strong>Notes:</strong> ${escapeHTML(params.notes)}</p>` : ''}

  <div class="disclaimer">
    This invoice was generated by Mintenance Ltd. All amounts are in GBP.
    ${params.taxRate > 0 ? `VAT is charged at ${params.taxRate}%.` : 'This invoice is exempt from VAT.'}
  </div>
</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
