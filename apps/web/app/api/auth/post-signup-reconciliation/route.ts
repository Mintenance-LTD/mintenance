/**
 * POST /api/auth/post-signup-reconciliation
 *
 * 2026-04-30 audit P1 (Authentication And Signup Side Effects Differ):
 * mobile clients call `supabase.auth.signUp(...)` directly, which
 * creates the auth.users row + (via the `handle_new_user` trigger) a
 * profile row. But the web `/api/auth/register` flow ALSO does:
 *   - HIBP password breach check (already mirrored on mobile via
 *     /api/auth/check-password-breach before signUp)
 *   - Contractor trial initialization (TrialService.initializeTrial)
 * The first is mirrored client-side already. The second was missing
 * for mobile signups — contractors who registered on mobile never
 * got a trial, breaking subscription gating.
 *
 * This endpoint is idempotent (the underlying
 * `initialize_trial_period` SQL function checks for an existing
 * trial). Mobile calls it once, after `supabase.auth.signUp` returns
 * a confirmed user, with the user's bearer token.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

const reconcileBodySchema = z.object({
  // The role the user picked at signup. Optional because we'll fall
  // back to the role on the user's profile row if not supplied.
  role: z.enum(['homeowner', 'contractor']).optional(),
});

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = reconcileBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Resolve the role from either the body or the user's profile row.
    let role = parsed.data.role;
    if (!role) {
      const { data: profile } = await serverSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      role = (profile?.role ?? user.role) as
        | 'homeowner'
        | 'contractor'
        | undefined;
    }

    const actions: string[] = [];
    let trialInitialized: boolean | null = null;

    // Trial init is the one side-effect web does that mobile didn't.
    if (role === 'contractor') {
      try {
        const { TrialService } =
          await import('@/lib/services/subscription/TrialService');
        trialInitialized = await TrialService.initializeTrial(user.id);
        if (trialInitialized) {
          actions.push('trial_initialized');
        } else {
          // The DB function returns false when a trial already exists,
          // which is the expected idempotent path on a re-call.
          actions.push('trial_already_exists');
        }
      } catch (trialError) {
        logger.error('Mobile post-signup trial init failed', {
          service: 'auth/post-signup-reconciliation',
          userId: user.id,
          error:
            trialError instanceof Error
              ? trialError.message
              : String(trialError),
        });
        // Never throw — this endpoint is best-effort. Mobile can retry.
        actions.push('trial_init_failed');
      }
    }

    logger.info('Post-signup reconciliation complete', {
      service: 'auth/post-signup-reconciliation',
      userId: user.id,
      role,
      actions,
    });

    return NextResponse.json({
      success: true,
      role,
      trialInitialized,
      actions,
    });
  }
);
