/**
 * HomeHealthSubscriptionService — R5 #2 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Home Health = £9.99/mo subscription that auto-creates 3 recurring
 * maintenance jobs per subscribed property:
 *   - Boiler service (annual)
 *   - Smoke-alarm check (biannual)
 *   - Gutter clean (biannual)
 *
 * Kept separate from HomeownerSubscriptionService (which models the
 * landlord/agency SaaS plans) so the 500-line pre-commit limit on that
 * file stays comfortable. Reuses getOrCreateStripeCustomer.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { getInvoicePaymentClientSecret } from '@/lib/services/stripe-compat';
import { HomeownerSubscriptionService } from './HomeownerSubscriptionService';
// 2026-05-28 audit: was a local proxy pinned to apiVersion '2024-04-10'.
// Route through the single shared lazy proxy so the API version stays
// pinned in one place (lib/stripe.ts → the SDK's own pinned version).
import { stripe as sharedStripe, getInvoiceClientSecret } from '@/lib/stripe';

function getStripe() {
  return sharedStripe;
}

export interface HomeHealthPlan {
  priceId: string;
  monthlyAmount: number;
  currency: 'gbp';
}

export interface HomeHealthRecurringTask {
  title: string;
  description: string;
  category: string;
  task_type: string;
  frequency: 'annual' | 'biannual' | 'quarterly';
}

/**
 * The canonical 3 tasks that ship with every Home Health subscription.
 * Dates are rolled forward from enrollment inside `createSubscription`.
 */
export const HOME_HEALTH_TASKS: HomeHealthRecurringTask[] = [
  {
    title: 'Annual boiler service',
    description:
      'Annual boiler inspection, service, and safety certificate (Gas Safe required).',
    category: 'heating',
    task_type: 'boiler_service',
    frequency: 'annual',
  },
  {
    title: 'Smoke alarm check',
    description:
      'Test and replace batteries on all smoke and CO alarms. Replace units older than 10 years.',
    category: 'safety',
    task_type: 'smoke_alarm_check',
    frequency: 'biannual',
  },
  {
    title: 'Gutter clean & roof inspection',
    description:
      'Clear debris from gutters and downpipes; flag missing tiles or flashing damage.',
    category: 'roofing',
    task_type: 'gutter_clean',
    frequency: 'biannual',
  },
];

function monthsAhead(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0] ?? '';
}

function firstDueFor(frequency: HomeHealthRecurringTask['frequency']): string {
  // Roll first occurrence a little in the future so the contractor has
  // a reasonable booking window. Annual=2mo out, biannual=1mo out.
  switch (frequency) {
    case 'annual':
      return monthsAhead(2);
    case 'biannual':
      return monthsAhead(1);
    case 'quarterly':
      return monthsAhead(1);
  }
}

export class HomeHealthSubscriptionService {
  /**
   * Resolve the configured Home Health plan from env.
   */
  static getPlan(): HomeHealthPlan | null {
    const priceId = process.env.STRIPE_HOME_HEALTH_PRICE_ID;
    if (!priceId) return null;
    return {
      priceId,
      monthlyAmount: 9.99,
      currency: 'gbp',
    };
  }

  /**
   * Enroll a homeowner's property in Home Health. Returns the Stripe
   * subscription PaymentIntent's client_secret so the client-side
   * Stripe Elements can collect payment.
   */
  static async createSubscription(input: {
    homeownerId: string;
    email: string;
    propertyId: string;
  }): Promise<{
    subscriptionId: string;
    clientSecret: string | null;
    recurringScheduleIds: string[];
  }> {
    const plan = this.getPlan();
    if (!plan) {
      throw new Error(
        'Home Health plan is not configured — set STRIPE_HOME_HEALTH_PRICE_ID'
      );
    }

    const stripe = getStripe();
    const customerId =
      await HomeownerSubscriptionService.getOrCreateStripeCustomer(
        input.homeownerId,
        input.email
      );

    // Create Stripe subscription in incomplete state. Client confirms
    // the latest invoice's PaymentIntent to move it to active.
    const stripeSub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: plan.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      // basil+ API versions reject the old `latest_invoice.payment_intent`
      // expansion; confirmation_secret carries the same client secret.
      expand: ['latest_invoice.confirmation_secret'],
      metadata: {
        homeownerId: input.homeownerId,
        propertyId: input.propertyId,
        source: 'home_health',
      },
    });

    // Mirror into homeowner_subscriptions.
    await serverSupabase.from('homeowner_subscriptions').insert({
      homeowner_id: input.homeownerId,
      stripe_subscription_id: stripeSub.id,
      stripe_customer_id: customerId,
      stripe_price_id: plan.priceId,
      plan_type: 'home_health',
      plan_name: 'Home Health',
      status: stripeSub.status,
      amount: plan.monthlyAmount,
      currency: plan.currency,
      metadata: {
        propertyId: input.propertyId,
        source: 'home_health',
      },
    });

    // Auto-create the 3 recurring maintenance schedules on the
    // property. Existing recurring-job-creator cron picks these up.
    const recurringScheduleIds: string[] = [];
    for (const task of HOME_HEALTH_TASKS) {
      const { data, error } = await serverSupabase
        .from('recurring_schedules')
        .insert({
          owner_id: input.homeownerId,
          property_id: input.propertyId,
          task_type: task.task_type,
          title: task.title,
          description: task.description,
          category: task.category,
          frequency: task.frequency,
          next_due_date: firstDueFor(task.frequency),
          auto_create_job: true,
          is_active: true,
          remind_days_before: 7,
          reminder_sent: false,
        })
        .select('id')
        .single();

      if (error) {
        logger.warn('home_health: failed to insert recurring schedule', {
          task: task.task_type,
          error: error.message,
        });
        continue;
      }
      if (data?.id) recurringScheduleIds.push(data.id as string);
    }

    return {
      subscriptionId: stripeSub.id,
      clientSecret: getInvoiceClientSecret(stripeSub.latest_invoice),
      recurringScheduleIds,
    };
  }

  /**
   * Cancel a Home Health subscription at period end and deactivate the
   * linked recurring_schedules rows so the next cron run stops creating
   * jobs. Historical rows are preserved (is_active=false, not deleted)
   * for auditability.
   */
  static async cancelSubscription(
    homeownerId: string,
    stripeSubscriptionId: string
  ): Promise<void> {
    const stripe = getStripe();
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await serverSupabase
      .from('homeowner_subscriptions')
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .eq('homeowner_id', homeownerId);

    // Deactivate every Home Health schedule this homeowner set up.
    await serverSupabase
      .from('recurring_schedules')
      .update({ is_active: false })
      .eq('owner_id', homeownerId)
      .in(
        'task_type',
        HOME_HEALTH_TASKS.map((t) => t.task_type)
      );
  }
}
