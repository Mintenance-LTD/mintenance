import { Stripe } from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
export class ChargeHandler {
  async handleRefunded(event: Stripe.Event): Promise<void> {
    const charge = event.data.object as Stripe.Charge;
    const supabase = serverSupabase;
    logger.info('Charge refunded', {
      service: 'stripe-webhook',
      eventId: event.id,
      chargeId: charge.id,
      refundedAmount: charge.amount_refunded,
      paymentIntentId: charge.payment_intent,
    });
    try {
      const jobId = charge.metadata?.job_id;
      if (!jobId) {
        logger.warn('Charge missing job_id in metadata', {
          chargeId: charge.id,
        });
        return;
      }
      // Calculate refund details
      const refundedAmount = charge.amount_refunded / 100;
      const originalAmount = charge.amount / 100;
      const isFullRefund = charge.amount_refunded === charge.amount;
      // Update job payment status
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          payment_status: isFullRefund ? 'refunded' : 'partially_refunded',
          refunded_amount: refundedAmount,
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      if (jobError) {
        throw new Error(`Failed to update job refund status: ${jobError.message}`);
      }
      // Create refund record
      const { error: refundError } = await supabase.from('refunds').insert({
        job_id: jobId,
        charge_id: charge.id,
        payment_intent_id: charge.payment_intent as string,
        amount: refundedAmount,
        currency: charge.currency,
        reason: charge.refunds?.data[0]?.reason || 'requested_by_customer',
        status: 'completed',
        metadata: charge.metadata,
        created_at: new Date().toISOString(),
      });
      if (refundError) {
        logger.error('Failed to create refund record', {
          service: 'stripe-webhook',
          error: refundError.message,
          chargeId: charge.id,
        });
      }
      // Get job details for notifications
      const { data: job } = await supabase
        .from('jobs')
        .select('homeowner_id, contractor_id, title')
        .eq('id', jobId)
        .single();
      if (job) {
        // Notify homeowner
        await NotificationService.createNotification({
          userId: job.homeowner_id,
          type: 'payment_refunded',
          title: 'Refund Processed',
          message: isFullRefund
            ? `Your payment of ${originalAmount} ${charge.currency.toUpperCase()} for "${job.title}" has been fully refunded.`
            : `A partial refund of ${refundedAmount} ${charge.currency.toUpperCase()} has been processed for "${job.title}".`,
          metadata: {
            job_id: jobId,
            charge_id: charge.id,
            refund_amount: refundedAmount,
            is_full_refund: isFullRefund,
          },
        });
        // Notify contractor if job was already paid out
        if (job.contractor_id) {
          await NotificationService.createNotification({
            userId: job.contractor_id,
            type: 'job_refunded',
            title: 'Job Payment Refunded',
            message: `The payment for "${job.title}" has been refunded to the customer.`,
            metadata: {
              job_id: jobId,
              refund_amount: refundedAmount,
              is_full_refund: isFullRefund,
            },
          });
        }
      }
      logger.info('Refund processed successfully', {
        service: 'stripe-webhook',
        jobId,
        chargeId: charge.id,
        refundedAmount,
        isFullRefund,
      });
    } catch (error) {
      logger.error('Failed to process charge refunded event', {
        service: 'stripe-webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        chargeId: charge.id,
      });
      throw error;
    }
  }
}