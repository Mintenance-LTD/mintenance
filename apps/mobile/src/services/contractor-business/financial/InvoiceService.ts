/**
 * InvoiceService — facade methods invoked via FinancialManagementService.
 *
 * 2026-04-30 audit P0-1 follow-up: was hitting `supabase.from('invoices')`
 * directly for INSERT/UPDATE/SELECT and stubbing the email/PDF flow with
 * mock data. Now routes through the canonical `/api/contractor/invoices`
 * endpoints so RLS, validation, totals calculation, invoice-number
 * generation and notification fan-out (NotificationService.invoice_received)
 * stay in one place.
 */
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { ServiceErrorHandler } from '../../../utils/serviceErrorHandler';
import { logger } from '../../../utils/logger';
import type { Invoice } from '../types';

interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  rate?: number;
  unit_price?: number;
  amount?: number;
}

/**
 * Mobile create-invoice payload. Intentionally NOT a strict
 * `Omit<Invoice, ...>` because the line item field uses `rate`
 * (mobile UI) and may also carry `unit_price` (server). The API
 * computes invoice_number / subtotal / tax_amount / total_amount
 * server-side; callers can still pass them but they're advisory.
 */
interface CreateInvoiceInput {
  contractor_id: string;
  // 2026-05-23 audit-17 P1: client_id is now optional. The API path
  // accepts a clientName-only invoice (no contractor_clients FK) — when
  // the contractor types a free-text client and saves, we should NOT
  // synthesize a fake clientId; that previously fell back to the
  // contractor's own profile UUID and the API rejected with "Client
  // not found or not yours". Only forward client_id when it actually
  // points at a contractor_clients row.
  client_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  job_id?: string;
  invoice_number?: string;
  status: Invoice['status'];
  subtotal?: number;
  tax_amount?: number;
  total_amount: number;
  due_date: string;
  issue_date?: string;
  notes?: string;
  title?: string;
  line_items: InvoiceLineItemInput[];
}

interface InvoicesListResponse {
  invoices: Invoice[];
  total?: number;
}

interface CreateInvoiceResponse {
  success: boolean;
  invoice: Invoice;
  message?: string;
}

export async function createInvoice(
  invoiceData: CreateInvoiceInput
): Promise<Invoice> {
  const context = {
    service: 'FinancialManagementService',
    method: 'createInvoice',
    userId: invoiceData.contractor_id,
    params: {
      client_id: invoiceData.client_id,
      total_amount: invoiceData.total_amount,
    },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(
      invoiceData.contractor_id,
      'Contractor ID',
      context
    );
    // 2026-05-23 audit-17 P1: client_id is no longer required — the
    // server accepts a clientName-only invoice. Requiring it here
    // forced the screen to fall back to the contractor's profile UUID
    // and the server rejected the resulting body. Validate clientName
    // instead so we still surface a useful error when the caller has
    // neither.
    if (!invoiceData.client_id && !invoiceData.client_name?.trim()) {
      throw new Error('Either client_id or client_name is required');
    }
    ServiceErrorHandler.validatePositiveNumber(
      invoiceData.total_amount,
      'Total amount',
      context
    );

    // Map mobile shape → API shape. The API computes totals from
    // line_items + taxRate server-side, so we don't ship the
    // pre-computed subtotal/tax/total. line_items use `unit_price`
    // (API) where the mobile model uses `rate`.
    const lineItems = (invoiceData.line_items ?? []).map((li) => ({
      description: li.description,
      quantity: li.quantity ?? 1,
      unit_price:
        typeof li.unit_price === 'number' ? li.unit_price : (li.rate ?? 0),
      amount: li.amount,
    }));

    const taxRate =
      invoiceData.subtotal && invoiceData.subtotal > 0
        ? Math.round(
            ((invoiceData.tax_amount ?? 0) / invoiceData.subtotal) * 100
          )
        : 20;

    const body: Record<string, unknown> = {
      jobId: invoiceData.job_id || undefined,
      // 2026-05-23 audit-17 P1: only forward clientId when it points at
      // a real contractor_clients row. The server schema marks it
      // .optional() and the handler resolves contact details from the
      // row when present; sending an empty string or a fake fallback
      // (previously contractor's own profile UUID) triggers "Client not
      // found or not yours".
      clientId: invoiceData.client_id || undefined,
      clientName: invoiceData.client_name,
      clientEmail: invoiceData.client_email,
      clientPhone: invoiceData.client_phone,
      clientAddress: invoiceData.client_address,
      title:
        invoiceData.title ||
        `Invoice ${invoiceData.invoice_number ?? ''}`.trim(),
      lineItems,
      taxRate,
      notes: invoiceData.notes,
      dueDate: invoiceData.due_date,
      status: invoiceData.status === 'sent' ? 'sent' : 'draft',
    };

    const response = await mobileApiClient.post<CreateInvoiceResponse>(
      '/api/contractor/invoices',
      body
    );
    if (!response?.invoice) {
      throw new Error('Invoice creation returned no payload');
    }
    return response.invoice;
  }, context);

  if (!result.success || !result.data)
    throw new Error('Failed to create invoice');
  return result.data;
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: Invoice['status'],
  contractorId: string
): Promise<Invoice> {
  const context = {
    service: 'FinancialManagementService',
    method: 'updateInvoiceStatus',
    userId: contractorId,
    params: { invoiceId, status },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(invoiceId, 'Invoice ID', context);
    ServiceErrorHandler.validateRequired(status, 'Status', context);

    const response = await mobileApiClient.patch<{
      success: boolean;
      invoice: Invoice;
    }>(`/api/contractor/invoices?id=${encodeURIComponent(invoiceId)}`, {
      status,
    });
    if (!response?.invoice) {
      throw new Error('Invoice update returned no payload');
    }
    return response.invoice;
  }, context);

  if (!result.success || !result.data)
    throw new Error('Failed to update invoice status');
  return result.data;
}

export async function getInvoices(
  contractorId: string,
  filters?: {
    status?: Invoice['status'];
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<Invoice[]> {
  const context = {
    service: 'FinancialManagementService',
    method: 'getInvoices',
    userId: contractorId,
    params: { contractorId, filters },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(
      contractorId,
      'Contractor ID',
      context
    );

    const params = new URLSearchParams();
    params.set('limit', '200');
    if (filters?.status) params.set('status', filters.status);
    if (filters?.dateFrom) params.set('period_start', filters.dateFrom);
    if (filters?.dateTo) params.set('period_end', filters.dateTo);

    const response = await mobileApiClient.get<InvoicesListResponse>(
      `/api/contractor/invoices?${params.toString()}`
    );
    return response?.invoices ?? [];
  }, context);

  if (!result.success) return [];
  return result.data || [];
}

export async function sendInvoice(
  invoiceId: string,
  contractorId: string
): Promise<void> {
  // 2026-04-30: previously generated a mock PDF and called a no-op
  // email helper. The API's PATCH path triggers
  // NotificationService.invoice_received and EmailService email
  // dispatch when status=sent (see /api/contractor/invoices POST).
  // Marking status='sent' is the canonical "send" action.
  await updateInvoiceStatus(invoiceId, 'sent', contractorId);
  logger.info('Invoice marked as sent', { invoiceId });
}

export async function generateInvoiceNumber(
  _contractorId: string
): Promise<string> {
  // 2026-04-30: server now generates the canonical invoice number on
  // POST /api/contractor/invoices. Return a placeholder for callers
  // that still need a UI preview before submit; the server number is
  // authoritative.
  return `INV-${new Date().getFullYear()}-DRAFT`;
}
