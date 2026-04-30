/**
 * PaymentRecordService — manual-payment recording.
 *
 * 2026-04-30 audit P0-1 follow-up: this method previously inserted
 * directly into `payments` and then flipped the linked invoice to
 * `paid`. There are zero callers in the mobile app today (verified
 * with grep), and the canonical Stripe-backed payment flow is
 * `/api/contractor/invoices/pay` which records its own row server-
 * side. Rather than add a new API endpoint for a feature nothing
 * calls, this stub throws clearly so a future caller gets directed
 * to the right surface.
 *
 * If you need to mark an invoice as paid OUTSIDE Stripe (cash, bank
 * transfer), call `updateInvoiceStatus(invoiceId, 'paid', userId)`
 * which routes through `PATCH /api/contractor/invoices?id=...`.
 */
import type { PaymentRecord } from '../types';

export async function recordPayment(
  _paymentData: Omit<PaymentRecord, 'id' | 'created_at'>
): Promise<PaymentRecord> {
  throw new Error(
    'recordPayment() has no canonical API yet. ' +
      'For Stripe payments use POST /api/contractor/invoices/pay; ' +
      'to mark an invoice paid manually, use updateInvoiceStatus(id, "paid", userId).'
  );
}
