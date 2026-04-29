import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { PaymentMethodSummary } from '@/lib/stripe/connect/types';

/**
 * GET /api/payments/payment-methods
 *
 * **Audit step 12 (2026-04-29): legacy local-DB read.**
 *
 * Reads from the `payment_methods` audit table. Stripe is the
 * canonical source for payment-method state — use
 * `/api/payments/methods` instead, which calls
 * `stripe.paymentMethods.list({ customer })` and reflects deletes /
 * expiries / fraud-disables that happen Stripe-side.
 *
 * Kept alive because the audit table still has /[id] sub-routes for
 * setting default + removing methods that the web settings UI uses.
 * Once those mutations are consolidated against the Stripe SDK, this
 * GET + the table can be deprecated together.
 */
export const GET = withApiHandler(
  { csrf: false, rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const { data, error } = await serverSupabase
      .from('payment_methods')
      .select(
        'stripe_payment_method_id, type, last4, brand, exp_month, exp_year, is_default, created_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to load payment methods' },
        { status: 500 }
      );
    }

    const methods: PaymentMethodSummary[] = (data ?? []).map((row) => ({
      id: row.stripe_payment_method_id,
      type: row.type as 'card' | 'bacs_debit',
      last4: row.last4 ?? '',
      brand: row.brand ?? undefined,
      expMonth: row.exp_month ?? undefined,
      expYear: row.exp_year ?? undefined,
      isDefault: !!row.is_default,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ success: true, methods });
  }
);
