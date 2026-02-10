import Stripe from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

export class StripeWebhookEventHandler {
  private stripe: Stripe;

  constructor(stripe: Stripe) {
    this.stripe = stripe;
  }

  async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        return;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        return;
      case 'payment_intent.canceled':
        await this.handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
        return;
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        return;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        return;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        return;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        return;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        return;
      case 'account.updated':
        await this.handleAccountUpdated(event.data.object as Stripe.Account);
        return;
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        return;
      default:
        logger.info('Unhandled webhook event type', {
          service: 'stripe-webhook',
          eventType: event.type,
        });
    }
  }

  /**
   * Payment succeeded — mark escrow as held, update job payment status.
   * FIX: Error check moved before data usage (was using data before checking error).
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info('Payment succeeded webhook received', {
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id,
    });

    try {
      const { data: escrowTransaction, error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .update({
          status: 'held',
          payment_intent_id: paymentIntent.id,
          updated_at: new Date().toISOString(),
        })
        .or(`payment_intent_id.eq.${paymentIntent.id},stripe_payment_intent_id.eq.${paymentIntent.id}`)
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

      // Backfill payer/payee IDs if missing
      if (!escrowTransaction.payer_id || !escrowTransaction.payee_id) {
        const homeownerId = paymentIntent.metadata?.homeownerId;
        const contractorId = paymentIntent.metadata?.contractorId;

        if (homeownerId && contractorId) {
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
    } catch (error) {
      logger.error('Error in handlePaymentIntentSucceeded', error, { service: 'stripe-webhook' });
      throw error;
    }
  }

  /**
   * Payment failed — mark escrow as failed, update job, notify homeowner.
   * FIX: Now updates job payment_status and sends notification (was logging only).
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
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
        .or(`payment_intent_id.eq.${paymentIntent.id},stripe_payment_intent_id.eq.${paymentIntent.id}`)
        .select()
        .single();

      if (escrowError) {
        logger.error('Failed to update escrow transaction status', escrowError, {
          service: 'stripe-webhook',
          paymentIntentId: paymentIntent.id,
        });
      }

      // Update job payment_status
      const jobId = escrowTransaction?.job_id || paymentIntent.metadata?.jobId;
      if (jobId) {
        await serverSupabase
          .from('jobs')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        // Notify homeowner
        const homeownerId = escrowTransaction?.payer_id || paymentIntent.metadata?.homeownerId;
        if (homeownerId) {
          await this.sendNotification(
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
      logger.error('Error in handlePaymentIntentFailed', error, { service: 'stripe-webhook' });
      throw error;
    }
  }

  /**
   * Payment cancelled — mark escrow as cancelled, update job.
   * FIX: Uses .or() for both column names (was only checking stripe_payment_intent_id).
   */
  private async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
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
        .or(`payment_intent_id.eq.${paymentIntent.id},stripe_payment_intent_id.eq.${paymentIntent.id}`)
        .select()
        .single();

      if (escrowError) {
        logger.error('Failed to update canceled payment status', escrowError, {
          service: 'stripe-webhook',
          paymentIntentId: paymentIntent.id,
        });
      }

      // Update job payment_status
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
      logger.error('Error in handlePaymentIntentCanceled', error, { service: 'stripe-webhook' });
      throw error;
    }
  }

  /**
   * Charge refunded — mark escrow as refunded, update job, record refund, notify users.
   * FIX: Now updates job status, records refund, and sends notifications (was logging only).
   */
  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
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
        .or(`payment_intent_id.eq.${paymentIntentId},stripe_payment_intent_id.eq.${paymentIntentId}`)
        .select()
        .single();

      if (escrowError) {
        logger.error('Failed to update refunded payment status', escrowError, {
          service: 'stripe-webhook',
          paymentIntentId,
        });
      }

      // Update job payment_status
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
        await serverSupabase
          .from('refunds')
          .upsert({
            charge_id: charge.id,
            payment_intent_id: paymentIntentId,
            amount: refundAmount,
            currency: charge.currency,
            status: 'succeeded',
            reason: charge.metadata?.refundReason || 'webhook_refund',
            escrow_transaction_id: escrowTransaction?.id || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'charge_id' });
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
          await this.sendNotification(
            escrowTransaction.payer_id,
            'Refund Processed',
            `Your refund of ${amountStr} has been processed and will appear on your statement within 5-10 business days.`,
            'refund_processed'
          );
        }
        if (escrowTransaction.payee_id) {
          await this.sendNotification(
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
      logger.error('Error in handleChargeRefunded', error, { service: 'stripe-webhook' });
      throw error;
    }
  }

  /**
   * Subscription created/updated — sync status to profiles and contractor_profiles.
   * FIX: Now performs actual DB updates (was logging-only stub).
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    logger.info('Subscription updated webhook received', {
      service: 'stripe-webhook',
      subscriptionId: subscription.id,
      status: subscription.status,
    });

    try {
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;

      if (!customerId) {
        logger.warn('Subscription missing customer ID', {
          service: 'stripe-webhook',
          subscriptionId: subscription.id,
        });
        return;
      }

      const { data: user, error: userError } = await serverSupabase
        .from('profiles')
        .select('id, role')
        .eq('stripe_customer_id', customerId)
        .single();

      if (userError || !user) {
        logger.warn('User not found for subscription customer', {
          service: 'stripe-webhook',
          subscriptionId: subscription.id,
          customerId,
        });
        return;
      }

      // Map Stripe subscription status to our internal status
      const statusMap: Record<string, string> = {
        active: 'active',
        past_due: 'past_due',
        canceled: 'cancelled',
        unpaid: 'unpaid',
        incomplete: 'incomplete',
        incomplete_expired: 'expired',
        trialing: 'trialing',
        paused: 'paused',
      };
      const mappedStatus = statusMap[subscription.status] || subscription.status;

      // Determine tier from price metadata or product
      const priceId = subscription.items?.data?.[0]?.price?.id;
      const tierFromMetadata = subscription.metadata?.tier
        || subscription.items?.data?.[0]?.price?.metadata?.tier;

      // Update profiles.subscription_status
      const { error: profileError } = await serverSupabase
        .from('profiles')
        .update({
          subscription_status: mappedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        logger.error('Failed to update profile subscription status', profileError, {
          service: 'stripe-webhook',
          userId: user.id,
        });
      }

      // Update contractor_profiles if user is a contractor
      if (user.role === 'contractor') {
        const contractorUpdate: Record<string, unknown> = {
          subscription_status: mappedStatus,
          updated_at: new Date().toISOString(),
        };
        if (tierFromMetadata) {
          contractorUpdate.subscription_tier = tierFromMetadata;
        }

        const { error: contractorError } = await serverSupabase
          .from('contractor_profiles')
          .update(contractorUpdate)
          .eq('user_id', user.id);

        if (contractorError) {
          logger.error('Failed to update contractor_profiles subscription', contractorError, {
            service: 'stripe-webhook',
            userId: user.id,
          });
        }
      }

      // Send notifications for concerning statuses
      if (['past_due', 'unpaid'].includes(subscription.status)) {
        await this.sendNotification(
          user.id,
          'Subscription Payment Issue',
          'There is an issue with your subscription payment. Please update your payment method to avoid service interruption.',
          'subscription_payment_issue'
        );
      } else if (subscription.status === 'canceled') {
        await this.sendNotification(
          user.id,
          'Subscription Cancelled',
          'Your subscription has been cancelled. You can resubscribe at any time from your account settings.',
          'subscription_cancelled'
        );
      }

      logger.info('Subscription status synced', {
        service: 'stripe-webhook',
        subscriptionId: subscription.id,
        userId: user.id,
        status: mappedStatus,
        priceId,
        tier: tierFromMetadata,
      });
    } catch (error) {
      logger.error('Error in handleSubscriptionUpdated', error, { service: 'stripe-webhook' });
      throw error;
    }
  }

  /**
   * Subscription deleted — downgrade user to free tier.
   * FIX: Now performs actual DB updates (was logging-only stub).
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    logger.info('Subscription deleted webhook received', {
      service: 'stripe-webhook',
      subscriptionId: subscription.id,
    });

    try {
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;

      if (!customerId) {
        logger.warn('Subscription missing customer ID', {
          service: 'stripe-webhook',
          subscriptionId: subscription.id,
        });
        return;
      }

      const { data: user, error: userError } = await serverSupabase
        .from('profiles')
        .select('id, role')
        .eq('stripe_customer_id', customerId)
        .single();

      if (userError || !user) {
        logger.warn('User not found for subscription customer', {
          service: 'stripe-webhook',
          subscriptionId: subscription.id,
          customerId,
        });
        return;
      }

      // Downgrade to free/none in profiles
      const { error: profileError } = await serverSupabase
        .from('profiles')
        .update({
          subscription_status: 'none',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        logger.error('Failed to downgrade profile subscription', profileError, {
          service: 'stripe-webhook',
          userId: user.id,
        });
      }

      // Downgrade contractor_profiles
      if (user.role === 'contractor') {
        const { error: contractorError } = await serverSupabase
          .from('contractor_profiles')
          .update({
            subscription_status: 'none',
            subscription_tier: 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (contractorError) {
          logger.error('Failed to downgrade contractor subscription', contractorError, {
            service: 'stripe-webhook',
            userId: user.id,
          });
        }
      }

      // Notify user
      await this.sendNotification(
        user.id,
        'Subscription Ended',
        'Your subscription has ended. You have been downgraded to the free plan. Resubscribe any time from your account settings.',
        'subscription_ended'
      );

      logger.info('Subscription deleted and user downgraded', {
        service: 'stripe-webhook',
        subscriptionId: subscription.id,
        userId: user.id,
      });
    } catch (error) {
      logger.error('Error in handleSubscriptionDeleted', error, { service: 'stripe-webhook' });
      throw error;
    }
  }

  /**
   * Invoice payment succeeded — record payment, reactivate past_due subscriptions.
   * FIX: Now records to invoice_payments table (was logging-only stub).
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    logger.info('Invoice payment succeeded webhook received', {
      service: 'stripe-webhook',
      invoiceId: invoice.id,
    });

    try {
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;

      if (!customerId) {
        logger.warn('Invoice missing customer ID', {
          service: 'stripe-webhook',
          invoiceId: invoice.id,
        });
        return;
      }

      const { data: user, error: userError } = await serverSupabase
        .from('profiles')
        .select('id, subscription_status')
        .eq('stripe_customer_id', customerId)
        .single();

      if (userError || !user) {
        logger.warn('User not found for invoice customer', {
          service: 'stripe-webhook',
          invoiceId: invoice.id,
          customerId,
        });
        return;
      }

      const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;

      // Record in invoice_payments table
      try {
        await serverSupabase
          .from('invoice_payments')
          .upsert({
            invoice_id: invoice.id,
            user_id: user.id,
            subscription_id: subscriptionId || null,
            amount_paid: invoice.amount_paid,
            amount_due: invoice.amount_due,
            currency: invoice.currency,
            status: 'paid',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'invoice_id' });
      } catch (recordError) {
        logger.error('Failed to record invoice payment', recordError, {
          service: 'stripe-webhook',
          invoiceId: invoice.id,
        });
      }

      // Reactivate subscription if it was past_due
      if (user.subscription_status === 'past_due') {
        await serverSupabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        await this.sendNotification(
          user.id,
          'Subscription Reactivated',
          'Your subscription payment has been processed successfully. Your account is now fully active.',
          'subscription_reactivated'
        );
      }

      logger.info('Invoice payment processed', {
        service: 'stripe-webhook',
        invoiceId: invoice.id,
        userId: user.id,
        amount: invoice.amount_paid,
      });
    } catch (error) {
      logger.error('Error in handleInvoicePaymentSucceeded', error, { service: 'stripe-webhook' });
      throw error;
    }
  }

  /**
   * Invoice payment failed — record failure, update subscription status, notify user.
   * FIX: Now records to invoice_payments and updates subscription_status (was email only).
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.info('Invoice payment failed webhook received', {
      service: 'stripe-webhook',
      invoiceId: invoice.id,
    });

    try {
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;

      if (!customerId) {
        logger.warn('Invoice missing customer ID', {
          service: 'stripe-webhook',
          invoiceId: invoice.id,
        });
        return;
      }

      const { data: user, error: userError } = await serverSupabase
        .from('profiles')
        .select('id, email, role')
        .eq('stripe_customer_id', customerId)
        .single();

      if (userError || !user) {
        logger.warn('User not found for invoice customer', {
          service: 'stripe-webhook',
          invoiceId: invoice.id,
          customerId,
        });
        return;
      }

      const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;

      // Record failed payment in invoice_payments
      try {
        await serverSupabase
          .from('invoice_payments')
          .upsert({
            invoice_id: invoice.id,
            user_id: user.id,
            subscription_id: subscriptionId || null,
            amount_paid: 0,
            amount_due: invoice.amount_due,
            currency: invoice.currency,
            status: 'failed',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'invoice_id' });
      } catch (recordError) {
        logger.error('Failed to record invoice payment failure', recordError, {
          service: 'stripe-webhook',
          invoiceId: invoice.id,
        });
      }

      // Update subscription status to past_due
      if (subscriptionId) {
        await serverSupabase
          .from('profiles')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (user.role === 'contractor') {
          await serverSupabase
            .from('contractor_profiles')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        }
      }

      // Send in-app notification
      await this.sendNotification(
        user.id,
        'Payment Failed',
        'We were unable to process your subscription payment. Please update your payment method to continue your subscription.',
        'invoice_payment_failed'
      );

      logger.warn('Invoice payment failed', {
        service: 'stripe-webhook',
        invoiceId: invoice.id,
        userId: user.id,
        amount: invoice.amount_due,
      });

      // Send email notification
      try {
        const { EmailService } = await import('@/lib/email-service');
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com';

        await EmailService.sendEmail({
          to: user.email,
          subject: 'Payment Failed - Action Required',
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #EF4444;">Payment Failed</h2>
            <p>We were unable to process your payment for invoice ${invoice.id}.</p>
            <p><strong>Amount:</strong> £${(invoice.amount_due / 100).toFixed(2)}</p>
            <p>Please update your payment method to continue your subscription.</p>
            <a href="${baseUrl}/settings/payment-methods" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px;">
              Update Payment Method
            </a>
          </div>
        `,
          text: `Payment Failed\n\nWe were unable to process your payment for invoice ${invoice.id}.\nAmount: £${(invoice.amount_due / 100).toFixed(2)}\n\nPlease update your payment method at ${baseUrl}/settings/payment-methods`,
        });
      } catch (emailError) {
        logger.error('Failed to send payment failure email', emailError, {
          service: 'stripe-webhook',
          invoiceId: invoice.id,
          userId: user.id,
        });
      }
    } catch (error) {
      logger.error('Error in handleInvoicePaymentFailed', error, { service: 'stripe-webhook' });
      throw error;
    }
  }

  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    logger.info('Stripe Connect account updated webhook received', {
      service: 'stripe-webhook',
      accountId: account.id,
    });

    try {
      const contractorId = account.metadata?.contractor_id;

      if (!contractorId) {
        logger.warn('Account updated webhook missing contractor_id metadata', {
          service: 'stripe-webhook',
          accountId: account.id,
        });
        return;
      }

      const isOnboarded = account.details_submitted && account.charges_enabled && account.payouts_enabled;

      const { error: userUpdateError } = await serverSupabase
        .from('profiles')
        .update({
          stripe_connect_account_id: account.id,
        })
        .eq('id', contractorId);

      if (userUpdateError) {
        logger.error('Failed to update profiles.stripe_connect_account_id', userUpdateError, {
          service: 'stripe-webhook',
          accountId: account.id,
          contractorId,
        });
      }

      const { error: payoutUpdateError } = await serverSupabase
        .from('contractor_payout_accounts')
        .update({
          stripe_account_id: account.id,
          account_complete: isOnboarded,
          updated_at: new Date().toISOString(),
        })
        .eq('contractor_id', contractorId);

      if (payoutUpdateError) {
        logger.error('Failed to update contractor_payout_accounts', payoutUpdateError, {
          service: 'stripe-webhook',
          accountId: account.id,
          contractorId,
        });
      }

      logger.info('Stripe Connect account synced successfully', {
        service: 'stripe-webhook',
        accountId: account.id,
        contractorId,
        isOnboarded,
      });
    } catch (error) {
      logger.error('Error in handleAccountUpdated', error, { service: 'stripe-webhook' });
      throw error;
    }
  }

  /**
   * Checkout session completed — handle subscription, setup, and payment modes.
   * FIX: Now handles subscription and setup modes (was ignoring non-marketplace payments).
   * FIX: Error check moved before data usage.
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    logger.info('Checkout session completed webhook received', {
      service: 'stripe-webhook',
      sessionId: session.id,
      mode: session.mode,
    });

    try {
      // Handle based on checkout mode
      if (session.mode === 'subscription') {
        await this.handleCheckoutSubscription(session);
        return;
      }

      if (session.mode === 'setup') {
        await this.handleCheckoutSetup(session);
        return;
      }

      // Payment mode — check if it's a marketplace payment
      const isMarketplacePayment = session.metadata?.isMarketplacePayment === 'true';
      const jobId = session.metadata?.jobId;

      if (!isMarketplacePayment || !jobId) {
        // Record non-marketplace payments for audit
        await this.recordCheckoutSession(session);
        logger.info('Non-marketplace checkout session recorded', {
          service: 'stripe-webhook',
          sessionId: session.id,
        });
        return;
      }

      // Marketplace payment — update escrow
      await this.handleCheckoutMarketplacePayment(session, jobId);
    } catch (error) {
      logger.error('Error in handleCheckoutSessionCompleted', error, { service: 'stripe-webhook' });
      throw error;
    }
  }

  /** Handle subscription checkout — record session, subscription updates handled by subscription webhooks */
  private async handleCheckoutSubscription(session: Stripe.Checkout.Session): Promise<void> {
    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription as Stripe.Subscription | null)?.id;

    await this.recordCheckoutSession(session);

    logger.info('Subscription checkout session recorded', {
      service: 'stripe-webhook',
      sessionId: session.id,
      subscriptionId,
    });
  }

  /** Handle setup checkout — store payment method on user profile */
  private async handleCheckoutSetup(session: Stripe.Checkout.Session): Promise<void> {
    const setupIntentId = typeof session.setup_intent === 'string'
      ? session.setup_intent
      : (session.setup_intent as Stripe.SetupIntent | null)?.id;

    if (!setupIntentId) {
      logger.warn('Setup checkout session has no setup intent', {
        service: 'stripe-webhook',
        sessionId: session.id,
      });
      return;
    }

    try {
      const setupIntent = await this.stripe.setupIntents.retrieve(setupIntentId);
      const paymentMethodId = typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id;

      if (paymentMethodId && session.customer) {
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;

        // Update the user's default payment method in profiles
        if (customerId) {
          await serverSupabase
            .from('profiles')
            .update({
              stripe_default_payment_method: paymentMethodId,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', customerId);
        }
      }

      await this.recordCheckoutSession(session);

      logger.info('Setup checkout session processed', {
        service: 'stripe-webhook',
        sessionId: session.id,
        paymentMethodId,
      });
    } catch (setupError) {
      logger.error('Failed to process setup checkout session', setupError, {
        service: 'stripe-webhook',
        sessionId: session.id,
      });
    }
  }

  /** Handle marketplace payment checkout — update escrow transaction */
  private async handleCheckoutMarketplacePayment(
    session: Stripe.Checkout.Session,
    jobId: string
  ): Promise<void> {
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

    if (!paymentIntentId) {
      logger.warn('Checkout session has no payment intent', {
        service: 'stripe-webhook',
        sessionId: session.id,
      });
      return;
    }

    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    const chargeId = typeof paymentIntent.latest_charge === 'string'
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id;

    const { data: escrowTransaction, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'held',
        payment_intent_id: paymentIntentId,
        stripe_checkout_session_id: session.id,
        stripe_charge_id: chargeId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_checkout_session_id', session.id)
      .select()
      .single();

    if (escrowError) {
      logger.error('Failed to update escrow transaction from checkout session', escrowError, {
        service: 'stripe-webhook',
        sessionId: session.id,
        paymentIntentId,
      });
      return;
    }

    if (!escrowTransaction) {
      logger.warn('No escrow transaction found for checkout session', {
        service: 'stripe-webhook',
        sessionId: session.id,
      });
      return;
    }

    // Backfill payer/payee IDs if missing
    if (!escrowTransaction.payer_id || !escrowTransaction.payee_id) {
      const { data: job } = await serverSupabase
        .from('jobs')
        .select('homeowner_id, contractor_id')
        .eq('id', escrowTransaction.job_id)
        .single();

      if (job) {
        await serverSupabase
          .from('escrow_transactions')
          .update({
            payer_id: job.homeowner_id,
            payee_id: job.contractor_id,
          })
          .eq('id', escrowTransaction.id);

        logger.info('Backfilled payer_id and payee_id for escrow from checkout', {
          service: 'stripe-webhook',
          escrowId: escrowTransaction.id,
          homeownerId: job.homeowner_id,
          contractorId: job.contractor_id,
        });
      }
    }

    // Update platform fee and contractor payout if present
    if (session.metadata?.platformFeeAmount) {
      const platformFee = parseFloat(session.metadata.platformFeeAmount);
      const totalAmount = parseFloat(session.metadata.totalAmount || escrowTransaction.amount.toString());
      const contractorAmount = totalAmount - platformFee;

      await serverSupabase
        .from('escrow_transactions')
        .update({
          platform_fee: platformFee,
          contractor_payout: contractorAmount,
        })
        .eq('id', escrowTransaction.id);
    }

    // Update job payment status
    await serverSupabase
      .from('jobs')
      .update({
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    logger.info('Escrow transaction updated from checkout session', {
      service: 'stripe-webhook',
      escrowId: escrowTransaction.id,
      sessionId: session.id,
      paymentIntentId,
    });
  }

  /** Record checkout session for audit trail */
  private async recordCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const customerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;

      // Look up user from Stripe customer ID
      let userId: string | null = null;
      if (customerId) {
        const { data: user } = await serverSupabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
        userId = user?.id || null;
      }

      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as Stripe.Subscription | null)?.id;

      await serverSupabase
        .from('checkout_sessions')
        .upsert({
          session_id: session.id,
          user_id: userId,
          mode: session.mode || 'payment',
          status: 'complete',
          payment_intent_id: paymentIntentId || null,
          subscription_id: subscriptionId || null,
          amount_total: session.amount_total,
          currency: session.currency || 'gbp',
          metadata: session.metadata || {},
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_id' });
    } catch (recordError) {
      logger.error('Failed to record checkout session', recordError, {
        service: 'stripe-webhook',
        sessionId: session.id,
      });
    }
  }

  /** Safely send an in-app notification. Fails silently if notifications table is missing. */
  private async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: string
  ): Promise<void> {
    try {
      await serverSupabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type,
          read: false,
          created_at: new Date().toISOString(),
        });
    } catch (notifError) {
      logger.error('Failed to send notification', notifError, {
        service: 'stripe-webhook',
        userId,
        type,
      });
    }
  }
}
