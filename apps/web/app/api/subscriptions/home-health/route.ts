/**
 * /api/subscriptions/home-health — R5 #2 of docs/RETENTION_ROADMAP_2026.md.
 *
 * POST   { propertyId } → enroll a property in Home Health (returns
 *        Stripe client_secret for client-side confirmation)
 * GET                    → the homeowner's current Home Health row (or null)
 * DELETE                 → cancel at period end + deactivate schedules
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { HomeHealthSubscriptionService } from '@/lib/services/subscription/HomeHealthSubscriptionService';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';

const PostSchema = z.object({
  propertyId: z.string().uuid(),
});

export const GET = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 60 } },
  async (_req, { user }) => {
    const { data, error } = await serverSupabase
      .from('homeowner_subscriptions')
      .select('*')
      .eq('homeowner_id', user.id)
      .eq('plan_type', 'home_health')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to load subscription' },
        { status: 500 }
      );
    }
    return NextResponse.json({ subscription: data });
  }
);

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const raw = await request.json().catch(() => null);
    const parsed = PostSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestError('propertyId is required');
    }

    // Confirm the property belongs to the homeowner.
    const { data: property, error: propErr } = await serverSupabase
      .from('properties')
      .select('id, property_name, owner_id')
      .eq('id', parsed.data.propertyId)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (propErr || !property) {
      throw new NotFoundError('Property not found');
    }

    // Fetch email for Stripe customer creation.
    const { data: profile } = await serverSupabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.email) {
      throw new BadRequestError('User profile email not found');
    }

    try {
      const result = await HomeHealthSubscriptionService.createSubscription({
        homeownerId: user.id,
        email: profile.email as string,
        propertyId: property.id as string,
      });
      return NextResponse.json({ success: true, ...result });
    } catch (err) {
      logger.error('Home Health enrollment failed', {
        service: 'subscriptions/home-health',
        userId: user.id,
        err: err instanceof Error ? err.message : String(err),
      });
      const msg = err instanceof Error ? err.message : 'Enrollment failed';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }
);

export const DELETE = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 10 } },
  async (_req, { user }) => {
    // Find the active Home Health subscription.
    const { data: sub } = await serverSupabase
      .from('homeowner_subscriptions')
      .select('stripe_subscription_id')
      .eq('homeowner_id', user.id)
      .eq('plan_type', 'home_health')
      .in('status', ['active', 'trial', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) {
      throw new NotFoundError('No active Home Health subscription');
    }

    await HomeHealthSubscriptionService.cancelSubscription(
      user.id,
      sub.stripe_subscription_id as string
    );

    return NextResponse.json({ success: true, cancel_at_period_end: true });
  }
);
