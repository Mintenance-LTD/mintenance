import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { stripe } from '@/lib/stripe';

interface InvoicePaymentInput {
  id: string;
  contractor_id: string;
  total_amount: number;
  invoice_number: string;
  title: string;
  client_email: string;
  job_id?: string;
}

/**
 * Create the platform-held PaymentIntent used by invoice payments.
 * Contractor funds are transferred later by escrow release.
 */
export async function createInvoicePaymentIntent(
  invoice: InvoicePaymentInput,
  payerId: string,
  idempotencyKey: string
) {
  try {
    const { data: contractor } = await serverSupabase
      .from('profiles')
      .select('stripe_connect_account_id, email, company_name')
      .eq('id', invoice.contractor_id)
      .single();

    if (!contractor?.stripe_connect_account_id) {
      throw new Error('Contractor has not set up payment processing');
    }

    const amountCents = Math.round(invoice.total_amount * 100);
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: 'gbp',
        description: `Invoice ${invoice.invoice_number}: ${invoice.title}`,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          payer_id: payerId,
          contractor_id: invoice.contractor_id,
          job_id: invoice.job_id || '',
        },
        payment_method_types: ['card'],
        receipt_email: invoice.client_email,
      },
      { idempotencyKey: `invoice_payment_${idempotencyKey}` }
    );

    return paymentIntent;
  } catch (error) {
    logger.error('Error creating payment intent', error);
    throw error;
  }
}
