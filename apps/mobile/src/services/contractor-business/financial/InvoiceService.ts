import { supabase } from '../../../config/supabase';
import { ServiceErrorHandler } from '../../../utils/serviceErrorHandler';
import { logger } from '../../../utils/logger';
import type { Invoice } from '../types';
import type { DatabaseInvoiceRow, DatabaseInvoiceUpdateData } from './types';

export async function createInvoice(
  invoiceData: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>
): Promise<Invoice> {
  const context = {
    service: 'FinancialManagementService', method: 'createInvoice',
    userId: invoiceData.contractor_id,
    params: { client_id: invoiceData.client_id, total_amount: invoiceData.total_amount },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(invoiceData.contractor_id, 'Contractor ID', context);
    ServiceErrorHandler.validateRequired(invoiceData.client_id, 'Client ID', context);
    ServiceErrorHandler.validateRequired(invoiceData.invoice_number, 'Invoice number', context);
    ServiceErrorHandler.validatePositiveNumber(invoiceData.total_amount, 'Total amount', context);

    const { data, error } = await supabase
      .from('invoices')
      .insert([{ ...invoiceData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw ServiceErrorHandler.handleDatabaseError(error, context);
    return data as Invoice;
  }, context);

  if (!result.success || !result.data) throw new Error('Failed to create invoice');
  return result.data;
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: Invoice['status'],
  contractorId: string
): Promise<Invoice> {
  const context = {
    service: 'FinancialManagementService', method: 'updateInvoiceStatus',
    userId: contractorId, params: { invoiceId, status },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(invoiceId, 'Invoice ID', context);
    ServiceErrorHandler.validateRequired(status, 'Status', context);
    ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);

    const updateData: DatabaseInvoiceUpdateData = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'paid') updateData.paid_date = new Date().toISOString();

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .eq('contractor_id', contractorId)
      .select()
      .single();

    if (error) throw ServiceErrorHandler.handleDatabaseError(error, context);
    return data as Invoice;
  }, context);

  if (!result.success || !result.data) throw new Error('Failed to update invoice status');
  return result.data;
}

export async function getInvoices(
  contractorId: string,
  filters?: { status?: Invoice['status']; dateFrom?: string; dateTo?: string }
): Promise<Invoice[]> {
  const context = {
    service: 'FinancialManagementService', method: 'getInvoices',
    userId: contractorId, params: { contractorId, filters },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);

    let query = supabase
      .from('invoices')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.dateFrom) query = query.gte('issue_date', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('issue_date', filters.dateTo);

    const { data, error } = await query;
    if (error) throw ServiceErrorHandler.handleDatabaseError(error, context);
    return data as Invoice[] || [];
  }, context);

  if (!result.success) return [];
  return result.data || [];
}

export async function sendInvoice(invoiceId: string, contractorId: string): Promise<void> {
  const context = {
    service: 'FinancialManagementService', method: 'sendInvoice',
    userId: contractorId, params: { invoiceId },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(invoiceId, 'Invoice ID', context);
    ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);

    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*, client:users!client_id(email, first_name, last_name)')
      .eq('id', invoiceId)
      .eq('contractor_id', contractorId)
      .single();

    if (fetchError) throw ServiceErrorHandler.handleDatabaseError(fetchError, context);

    const pdfBuffer = await generateInvoicePDF(invoice);
    await sendInvoiceEmail(invoice, pdfBuffer);

    const { error: updateError } = await supabase
      .from('invoices')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', invoiceId);

    if (updateError) throw ServiceErrorHandler.handleDatabaseError(updateError, context);
    logger.info('Invoice sent successfully', { invoiceId });
  }, context);

  if (!result.success) throw new Error('Failed to send invoice');
}

export async function generateInvoiceNumber(contractorId: string): Promise<string> {
  const { data: lastInvoice, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('contractor_id', contractorId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !lastInvoice) {
    return `INV-${new Date().getFullYear()}-001`;
  }

  const lastNumber = parseInt(lastInvoice.invoice_number.split('-').pop() || '0');
  return `INV-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(3, '0')}`;
}

async function generateInvoicePDF(invoice: DatabaseInvoiceRow): Promise<Buffer> {
  logger.info('Generating invoice PDF', { invoiceId: invoice.id });
  return Buffer.from(`Mock PDF for invoice ${invoice.invoice_number}`);
}

async function sendInvoiceEmail(invoice: DatabaseInvoiceRow, _pdfBuffer: Buffer): Promise<void> {
  logger.info('Sending invoice email', { invoiceId: invoice.id, clientEmail: invoice.client?.email });
  return Promise.resolve();
}
