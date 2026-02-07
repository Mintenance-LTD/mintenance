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

      if (escrowTransaction && (!escrowTransaction.payer_id || !escrowTransaction.payee_id)) {
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

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info('Payment failed webhook received', {
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id,
    });

    try {
      const { error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .or(`payment_intent_id.eq.${paymentIntent.id},stripe_payment_intent_id.eq.${paymentIntent.id}`);

      if (escrowError) {
        logger.error('Failed to update escrow transaction status', escrowError, {
          service: 'stripe-webhook',
          paymentIntentId: paymentIntent.id,
        });
      }

      logger.info('Payment marked as failed', {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
      });
    } catch (error) {
      logger.error('Error in handlePaymentIntentFailed', error, { service: 'stripe-webhook' });
      throw error;
    }
  }

  private async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info('Payment canceled webhook received', {
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id,
    });

    try {
      const { error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (escrowError) {
        logger.error('Failed to update canceled payment status', escrowError, {
          service: 'stripe-webhook',
          paymentIntentId: paymentIntent.id,
        });
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

      const { error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .update({
          status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .or(`payment_intent_id.eq.${paymentIntentId},stripe_payment_intent_id.eq.${paymentIntentId}`);

      if (escrowError) {
        logger.error('Failed to update refunded payment status', escrowError, {
          service: 'stripe-webhook',
          paymentIntentId,
        });
      }

      logger.info('Payment marked as refunded', {
        service: 'stripe-webhook',
        paymentIntentId,
      });
    } catch (error) {
      logger.error('Error in handleChargeRefunded', error, { service: 'stripe-webhook' });
      throw error;
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    logger.info('Subscription updated webhook received', {
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
        .select('id')
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

      logger.info('Subscription status synced', {
        service: 'stripe-webhook',
        subscriptionId: subscription.id,
        userId: user.id,
        status: subscription.status,
      });
    } catch (error) {
      logger.error('Error in handleSubscriptionUpdated', error, { service: 'stripe-webhook' });
      throw error;
    }
  }

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
        .select('id')
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

      logger.info('Subscription canceled', {
        service: 'stripe-webhook',
        subscriptionId: subscription.id,
        userId: user.id,
      });
    } catch (error) {
      logger.error('Error in handleSubscriptionDeleted', error, { service: 'stripe-webhook' });
      throw error;
    }
  }

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
        .select('id')
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
        .select('id, email')
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

      logger.warn('Invoice payment failed', {
        service: 'stripe-webhook',
        invoiceId: invoice.id,
        userId: user.id,
        amount: invoice.amount_due,
      });

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
            <p><strong>Amount:</strong> ${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()}</p>
            <p>Please update your payment method to continue your subscription.</p>
            <a href="${baseUrl}/account/billing" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px;">
              Update Payment Method
            </a>
          </div>
        `,
          text: `Payment Failed\n\nWe were unable to process your payment for invoice ${invoice.id}.\nAmount: ${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()}\n\nPlease update your payment method at ${baseUrl}/account/billing`,
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

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    logger.info('Checkout session completed webhook received', {
      service: 'stripe-webhook',
      sessionId: session.id,
    });

    try {
      const isMarketplacePayment = session.metadata?.isMarketplacePayment === 'true';
      const jobId = session.metadata?.jobId;

      if (!isMarketplacePayment || !jobId) {
        logger.info('Checkout session is not a marketplace payment, skipping escrow update', {
          service: 'stripe-webhook',
          sessionId: session.id,
        });
        return;
      }

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

      if (escrowTransaction && (!escrowTransaction.payer_id || !escrowTransaction.payee_id)) {
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

          logger.info('Backfilled payer_id and payee_id for escrow transaction from checkout', {
            service: 'stripe-webhook',
            escrowId: escrowTransaction.id,
            homeownerId: job.homeowner_id,
            contractorId: job.contractor_id,
          });
        }
      }

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
    } catch (error) {
      logger.error('Error in handleCheckoutSessionCompleted', error, { service: 'stripe-webhook' });
      throw error;
    }
  }
}
