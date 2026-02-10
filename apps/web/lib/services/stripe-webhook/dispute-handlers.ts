import Stripe from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { SendNotificationFn } from './webhook-helpers';

/**
 * Dispute created — freeze escrow, notify admin and both parties.
 * Stripe requires evidence submission within 7 days (usually).
 */
export async function handleDisputeCreated(
  dispute: Stripe.Dispute,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.warn('Dispute created webhook received', {
    service: 'stripe-webhook',
    disputeId: dispute.id,
    reason: dispute.reason,
    amount: dispute.amount,
    status: dispute.status,
  });

  try {
    const chargeId = typeof dispute.charge === 'string'
      ? dispute.charge
      : dispute.charge?.id;
    const paymentIntentId = typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent?.id;

    // Record dispute in disputes table
    await serverSupabase
      .from('disputes')
      .upsert({
        stripe_dispute_id: dispute.id,
        charge_id: chargeId || null,
        payment_intent_id: paymentIntentId || null,
        amount: dispute.amount,
        currency: dispute.currency,
        reason: dispute.reason,
        status: dispute.status,
        evidence_due_by: dispute.evidence_details?.due_by
          ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
          : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'stripe_dispute_id' });

    // Freeze the related escrow transaction
    if (paymentIntentId) {
      const { data: escrow } = await serverSupabase
        .from('escrow_transactions')
        .update({
          status: 'disputed',
          updated_at: new Date().toISOString(),
        })
        .or(`payment_intent_id.eq.${paymentIntentId},stripe_payment_intent_id.eq.${paymentIntentId}`)
        .select('id, payer_id, payee_id, job_id')
        .single();

      if (escrow) {
        if (escrow.job_id) {
          await serverSupabase
            .from('jobs')
            .update({
              payment_status: 'disputed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', escrow.job_id);
        }

        if (escrow.payer_id) {
          await sendNotification(
            escrow.payer_id,
            'Payment Dispute Filed',
            'A dispute has been filed on one of your payments. Our team is reviewing this. No action is required from you at this time.',
            'dispute_created'
          );
        }

        if (escrow.payee_id) {
          await sendNotification(
            escrow.payee_id,
            'Payment Dispute Filed',
            'A dispute has been filed on a payment for one of your jobs. Funds are temporarily held. Our team will contact you if additional information is needed.',
            'dispute_created'
          );
        }
      }
    }

    // Notify all admins
    const { data: admins } = await serverSupabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    if (admins) {
      const amountStr = `£${(dispute.amount / 100).toFixed(2)}`;
      for (const admin of admins) {
        await sendNotification(
          admin.id,
          'URGENT: Payment Dispute Filed',
          `A ${amountStr} dispute (${dispute.reason}) requires attention. Evidence due by ${dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString() : 'unknown'}. Dispute ID: ${dispute.id}`,
          'dispute_admin_alert'
        );
      }
    }

    logger.warn('Dispute created and escrow frozen', {
      service: 'stripe-webhook',
      disputeId: dispute.id,
      paymentIntentId,
    });
  } catch (error) {
    logger.error('Error in handleDisputeCreated', error, { service: 'stripe-webhook' });
    throw error;
  }
}

/**
 * Dispute updated — sync status.
 */
export async function handleDisputeUpdated(
  dispute: Stripe.Dispute,
  _sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Dispute updated webhook received', {
    service: 'stripe-webhook',
    disputeId: dispute.id,
    status: dispute.status,
  });

  try {
    await serverSupabase
      .from('disputes')
      .update({
        status: dispute.status,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_dispute_id', dispute.id);

    logger.info('Dispute status synced', {
      service: 'stripe-webhook',
      disputeId: dispute.id,
      status: dispute.status,
    });
  } catch (error) {
    logger.error('Error in handleDisputeUpdated', error, { service: 'stripe-webhook' });
    throw error;
  }
}

/**
 * Dispute closed — resolve escrow based on outcome (won/lost).
 */
export async function handleDisputeClosed(
  dispute: Stripe.Dispute,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Dispute closed webhook received', {
    service: 'stripe-webhook',
    disputeId: dispute.id,
    status: dispute.status,
  });

  try {
    await serverSupabase
      .from('disputes')
      .update({
        status: dispute.status,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_dispute_id', dispute.id);

    const paymentIntentId = typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent?.id;

    if (!paymentIntentId) return;

    const isLost = dispute.status === 'lost';
    const newEscrowStatus = isLost ? 'refunded' : 'held';
    const newPaymentStatus = isLost ? 'refunded' : 'paid';

    const { data: escrow } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: newEscrowStatus,
        updated_at: new Date().toISOString(),
      })
      .or(`payment_intent_id.eq.${paymentIntentId},stripe_payment_intent_id.eq.${paymentIntentId}`)
      .select('id, payer_id, payee_id, job_id')
      .single();

    if (escrow?.job_id) {
      await serverSupabase
        .from('jobs')
        .update({
          payment_status: newPaymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrow.job_id);
    }

    const outcomeMsg = isLost
      ? 'The payment dispute has been resolved in the cardholder\'s favour. The funds have been returned.'
      : 'The payment dispute has been resolved in our favour. The original payment stands.';

    if (escrow?.payer_id) {
      await sendNotification(escrow.payer_id, 'Dispute Resolved', outcomeMsg, 'dispute_closed');
    }
    if (escrow?.payee_id) {
      await sendNotification(escrow.payee_id, 'Dispute Resolved', outcomeMsg, 'dispute_closed');
    }

    logger.info('Dispute closed and escrow resolved', {
      service: 'stripe-webhook',
      disputeId: dispute.id,
      outcome: dispute.status,
      escrowStatus: newEscrowStatus,
    });
  } catch (error) {
    logger.error('Error in handleDisputeClosed', error, { service: 'stripe-webhook' });
    throw error;
  }
}
