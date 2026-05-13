import Stripe from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { isValidUUID, type SendNotificationFn } from './webhook-helpers';

/**
 * Tip-jar success — flip the `job_tips` row to completed + fire a
 * notification to the contractor. Called from
 * handlePaymentIntentSucceeded when metadata.type === 'job_tip'.
 *
 * Tips don't have an escrow row, so they short-circuit the regular
 * escrow-update path.
 */
async function handleTipPaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  sendNotification: SendNotificationFn
): Promise<void> {
  try {
    const jobId = paymentIntent.metadata?.job_id;
    const payerId = paymentIntent.metadata?.payer_id;
    const payeeId = paymentIntent.metadata?.payee_id;

    const { data: tip, error } = await serverSupabase
      .from('job_tips')
      .update({
        status: 'completed',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .select('id, amount, currency, job_id, payee_id, note')
      .single();

    if (error || !tip) {
      logger.error('Failed to flip job_tips row to completed', error, {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
      });
      return;
    }

    // Fire notification to the contractor. sendNotification is
    // positional `(userId, title, message, type)` — see
    // webhook-helpers.ts.
    try {
      const amountLabel = `£${Number(tip.amount).toFixed(2)}`;
      const title = `You received a ${amountLabel} tip 💚`;
      const message = tip.note
        ? `${amountLabel} tip on your completed job. Note: "${tip.note}"`
        : `${amountLabel} tip on your completed job — funds land in your next payout.`;
      await sendNotification(tip.payee_id, title, message, 'job_tip_received');
    } catch (notifyErr) {
      logger.error('Tip recorded but notification failed', notifyErr, {
        service: 'stripe-webhook',
        tipId: tip.id,
      });
    }

    logger.info('Job tip marked completed', {
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id,
      tipId: tip.id,
      jobId,
      payerId,
      payeeId,
    });
  } catch (err) {
    logger.error('Error handling tip payment success', err, {
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id,
    });
  }
}

/**
 * Payment succeeded — mark escrow as held, update job payment status.
 *
 * If the PaymentIntent metadata marks this as a `job_tip`, we
 * short-circuit to the tip handler (tips don't have an escrow row).
 */
export async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Payment succeeded webhook received', {
    service: 'stripe-webhook',
    paymentIntentId: paymentIntent.id,
  });

  // Tip-jar short-circuit — no escrow row to look up.
  if (paymentIntent.metadata?.type === 'job_tip') {
    await handleTipPaymentSucceeded(paymentIntent, sendNotification);
    return;
  }

  try {
    const { data: escrowTransaction, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'held',
        payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .or(
        `payment_intent_id.eq.${paymentIntent.id},stripe_payment_intent_id.eq.${paymentIntent.id}`
      )
      .select()
      .single();

    if (escrowError) {
      logger.error('Failed to update escrow transaction', escrowError, {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
      });
      return;
    }

    if (!escrowTransaction) {
      logger.warn('No escrow transaction found for payment intent', {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
      });
      return;
    }

    // Backfill payer/payee IDs if missing (with UUID validation)
    if (!escrowTransaction.payer_id || !escrowTransaction.payee_id) {
      const homeownerId = paymentIntent.metadata?.homeownerId;
      const contractorId = paymentIntent.metadata?.contractorId;

      const validHomeowner = homeownerId && isValidUUID(homeownerId);
      const validContractor = contractorId && isValidUUID(contractorId);

      if (!validHomeowner && homeownerId) {
        logger.warn('Invalid homeownerId UUID in payment metadata', {
          service: 'stripe-webhook',
          paymentIntentId: paymentIntent.id,
          homeownerId,
        });
      }
      if (!validContractor && contractorId) {
        logger.warn('Invalid contractorId UUID in payment metadata', {
          service: 'stripe-webhook',
          paymentIntentId: paymentIntent.id,
          contractorId,
        });
      }

      if (validHomeowner && validContractor) {
        await serverSupabase
          .from('escrow_transactions')
          .update({
            payer_id: homeownerId,
            payee_id: contractorId,
          })
          .eq('id', escrowTransaction.id);

        logger.info('Backfilled payer_id and payee_id for escrow transaction', {
          service: 'stripe-webhook',
          escrowId: escrowTransaction.id,
          homeownerId,
          contractorId,
        });
      }
    }

    logger.info('Escrow transaction updated to held', {
      service: 'stripe-webhook',
      escrowId: escrowTransaction.id,
    });

    const { error: jobError } = await serverSupabase
      .from('jobs')
      .update({
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowTransaction.job_id);

    if (jobError) {
      logger.error('Failed to update job payment status', jobError, {
        service: 'stripe-webhook',
        jobId: escrowTransaction.job_id,
      });
    }

    // R6 #5 deferred: tell every stakeholder the job is funded. This is
    // where the 'payment_secured' canonical event fires — homeowner,
    // payer (landlord), contractor, and tenants (on rental properties)
    // all learn escrow is held and work can start.
    try {
      const { notifyStakeholders } =
        await import('@/lib/services/notifications/JobStakeholderNotifier');
      const jobIdForFanout = escrowTransaction.job_id as string;
      await notifyStakeholders({
        jobId: jobIdForFanout,
        type: 'payment_secured',
        titleFor: (role) =>
          role === 'contractor'
            ? 'Payment secured — you can start'
            : role === 'tenant'
              ? 'Your repair is funded'
              : 'Payment secured in escrow',
        messageFor: (role) => {
          if (role === 'contractor')
            return 'The homeowner has funded this job. Payment is held in escrow until you complete the work.';
          if (role === 'tenant')
            return 'The contractor can now schedule a visit. You\u2019ll get another update when they start on site.';
          if (role === 'payer')
            return 'Your payment has been secured in escrow and will be released once the work is approved.';
          return 'Your payment has been secured in escrow and will be released after you approve the completed work.';
        },
        actionUrlFor: () => `/jobs/${jobIdForFanout}`,
        emailTenants: true,
        tenantJobStatus: 'assigned',
      });
    } catch (fanoutErr) {
      logger.warn('Stakeholder fan-out on payment secured failed', {
        service: 'stripe-webhook',
        jobId: escrowTransaction.job_id,
        err: fanoutErr instanceof Error ? fanoutErr.message : String(fanoutErr),
      });
    }
  } catch (error) {
    logger.error('Error in handlePaymentIntentSucceeded', error, {
      service: 'stripe-webhook',
    });
    throw error;
  }
}

/**
 * Payment failed — mark escrow as failed, update job, notify homeowner.
 */
export async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Payment failed webhook received', {
    service: 'stripe-webhook',
    paymentIntentId: paymentIntent.id,
  });

  try {
    const { data: escrowTransaction, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .or(
        `payment_intent_id.eq.${paymentIntent.id},stripe_payment_intent_id.eq.${paymentIntent.id}`
      )
      .select()
      .single();

    if (escrowError) {
      logger.error('Failed to update escrow transaction status', escrowError, {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
      });
    }

    const jobId = escrowTransaction?.job_id || paymentIntent.metadata?.jobId;
    if (jobId) {
      await serverSupabase
        .from('jobs')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      const homeownerId =
        escrowTransaction?.payer_id || paymentIntent.metadata?.homeownerId;
      if (homeownerId) {
        await sendNotification(
          homeownerId,
          'Payment Failed',
          'Your payment could not be processed. Please try again or use a different payment method.',
          'payment_failed'
        );
      }
    }

    logger.info('Payment marked as failed', {
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id,
      jobId,
    });
  } catch (error) {
    logger.error('Error in handlePaymentIntentFailed', error, {
      service: 'stripe-webhook',
    });
    throw error;
  }
}

/**
 * Payment cancelled — mark escrow as cancelled, update job.
 */
export async function handlePaymentIntentCanceled(
  paymentIntent: Stripe.PaymentIntent,
  _sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Payment canceled webhook received', {
    service: 'stripe-webhook',
    paymentIntentId: paymentIntent.id,
  });

  try {
    const { data: escrowTransaction, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .or(
        `payment_intent_id.eq.${paymentIntent.id},stripe_payment_intent_id.eq.${paymentIntent.id}`
      )
      .select()
      .single();

    if (escrowError) {
      logger.error('Failed to update canceled payment status', escrowError, {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
      });
    }

    const jobId = escrowTransaction?.job_id || paymentIntent.metadata?.jobId;
    if (jobId) {
      await serverSupabase
        .from('jobs')
        .update({
          payment_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    logger.info('Payment marked as canceled', {
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    logger.error('Error in handlePaymentIntentCanceled', error, {
      service: 'stripe-webhook',
    });
    throw error;
  }
}

/**
 * Charge refunded — mark escrow as refunded, update job, record refund, notify users.
 */
export async function handleChargeRefunded(
  charge: Stripe.Charge,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Charge refunded webhook received', {
    service: 'stripe-webhook',
    chargeId: charge.id,
  });

  try {
    const paymentIntentId = charge.payment_intent as string;

    if (!paymentIntentId) {
      logger.warn('Charge has no payment intent', {
        service: 'stripe-webhook',
        chargeId: charge.id,
      });
      return;
    }

    const { data: escrowTransaction, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .or(
        `payment_intent_id.eq.${paymentIntentId},stripe_payment_intent_id.eq.${paymentIntentId}`
      )
      .select()
      .single();

    if (escrowError) {
      logger.error('Failed to update refunded payment status', escrowError, {
        service: 'stripe-webhook',
        paymentIntentId,
      });
    }

    const jobId = escrowTransaction?.job_id || charge.metadata?.jobId;
    if (jobId) {
      await serverSupabase
        .from('jobs')
        .update({
          payment_status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    // Record in refunds table
    const refundAmount = charge.amount_refunded;
    try {
      await serverSupabase.from('refunds').upsert(
        {
          charge_id: charge.id,
          payment_intent_id: paymentIntentId,
          amount: refundAmount,
          currency: charge.currency,
          status: 'succeeded',
          reason: charge.metadata?.refundReason || 'webhook_refund',
          escrow_transaction_id: escrowTransaction?.id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'charge_id' }
      );
    } catch (refundRecordError) {
      logger.error('Failed to record refund', refundRecordError, {
        service: 'stripe-webhook',
        chargeId: charge.id,
      });
    }

    // Notify both homeowner and contractor
    if (escrowTransaction) {
      const amountStr = `£${(refundAmount / 100).toFixed(2)}`;
      if (escrowTransaction.payer_id) {
        await sendNotification(
          escrowTransaction.payer_id,
          'Refund Processed',
          `Your refund of ${amountStr} has been processed and will appear on your statement within 5-10 business days.`,
          'refund_processed'
        );
      }
      if (escrowTransaction.payee_id) {
        await sendNotification(
          escrowTransaction.payee_id,
          'Payment Refunded',
          `A payment of ${amountStr} for this job has been refunded to the homeowner.`,
          'payment_refunded'
        );
      }
    }

    logger.info('Payment marked as refunded', {
      service: 'stripe-webhook',
      paymentIntentId,
      chargeId: charge.id,
      amountRefunded: refundAmount,
    });
  } catch (error) {
    logger.error('Error in handleChargeRefunded', error, {
      service: 'stripe-webhook',
    });
    throw error;
  }
}

/**
 * Payment requires 3D Secure or other action — notify homeowner to complete authentication.
 */
export async function handlePaymentIntentRequiresAction(
  paymentIntent: Stripe.PaymentIntent,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Payment requires action webhook received', {
    service: 'stripe-webhook',
    paymentIntentId: paymentIntent.id,
  });

  try {
    const homeownerId = paymentIntent.metadata?.homeownerId;
    const jobId = paymentIntent.metadata?.jobId;

    if (homeownerId) {
      await sendNotification(
        homeownerId,
        'Payment Requires Action',
        'Your payment requires additional verification (3D Secure). Please return to the payment page to complete authentication.',
        'payment_requires_action'
      );
    }

    logger.info('Payment requires_action notification sent', {
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id,
      homeownerId,
      jobId,
    });
  } catch (error) {
    logger.error('Error in handlePaymentIntentRequiresAction', error, {
      service: 'stripe-webhook',
    });
    throw error;
  }
}

/**
 * Charge succeeded — log for audit trail. Escrow update is handled by payment_intent.succeeded.
 */
export async function handleChargeSucceeded(
  charge: Stripe.Charge,
  _sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Charge succeeded webhook received', {
    service: 'stripe-webhook',
    chargeId: charge.id,
    paymentIntentId: charge.payment_intent,
    amount: charge.amount,
  });
}

/**
 * Charge failed — update escrow status and notify homeowner.
 */
export async function handleChargeFailed(
  charge: Stripe.Charge,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Charge failed webhook received', {
    service: 'stripe-webhook',
    chargeId: charge.id,
    failureCode: charge.failure_code,
    failureMessage: charge.failure_message,
  });

  try {
    const paymentIntentId = charge.payment_intent as string;
    if (!paymentIntentId) return;

    // Update escrow to failed
    const { data: escrowTransaction } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .or(
        `payment_intent_id.eq.${paymentIntentId},stripe_payment_intent_id.eq.${paymentIntentId}`
      )
      .select()
      .single();

    const homeownerId =
      escrowTransaction?.payer_id || charge.metadata?.homeownerId;
    if (homeownerId) {
      const reason = charge.failure_message || 'Your card was declined';
      await sendNotification(
        homeownerId,
        'Payment Failed',
        `${reason}. Please try again with a different payment method.`,
        'payment_failed'
      );
    }

    logger.info('Charge failure processed', {
      service: 'stripe-webhook',
      chargeId: charge.id,
      failureCode: charge.failure_code,
    });
  } catch (error) {
    logger.error('Error in handleChargeFailed', error, {
      service: 'stripe-webhook',
    });
    throw error;
  }
}
