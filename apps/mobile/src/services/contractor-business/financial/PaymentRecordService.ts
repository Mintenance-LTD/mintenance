import { supabase } from '../../../config/supabase';
import { ServiceErrorHandler } from '../../../utils/serviceErrorHandler';
import { updateInvoiceStatus } from './InvoiceService';
import type { PaymentRecord } from '../types';

export async function recordPayment(
  paymentData: Omit<PaymentRecord, 'id' | 'created_at'>
): Promise<PaymentRecord> {
  const context = {
    service: 'FinancialManagementService', method: 'recordPayment',
    userId: paymentData.contractor_id,
    params: { amount: paymentData.amount, payment_method: paymentData.payment_method },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(paymentData.contractor_id, 'Contractor ID', context);
    ServiceErrorHandler.validatePositiveNumber(paymentData.amount, 'Amount', context);
    ServiceErrorHandler.validateRequired(paymentData.payment_method, 'Payment method', context);

    const { data, error } = await supabase
      .from('payments')
      .insert([{ ...paymentData, created_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw ServiceErrorHandler.handleDatabaseError(error, context);

    if (paymentData.invoice_id) {
      await updateInvoiceStatus(paymentData.invoice_id, 'paid', paymentData.contractor_id);
    }

    return data as PaymentRecord;
  }, context);

  if (!result.success || !result.data) throw new Error('Failed to record payment');
  return result.data;
}
