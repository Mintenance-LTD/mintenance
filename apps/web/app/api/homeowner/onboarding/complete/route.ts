import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateRequest } from '@/lib/validation/validator';
import { OnboardingService } from '@/lib/services/OnboardingService';
import { InternalServerError } from '@/lib/errors/api-error';

/**
 * POST /api/homeowner/onboarding/complete
 *
 * Persists the answers from the homeowner web wizard
 * (/onboarding/homeowner) and flips the `profiles.onboarding_completed`
 * flag in a single round-trip.
 *
 * 2026-05-25 audit-P0-2 — the web app previously had no homeowner
 * onboarding surface. Mobile's HomeownerSetupScreen captures the same
 * fields via PUT /api/users/profile, but only the mobile intro-swiper
 * dismissal flow flips the DB flag (via OnboardingService). Live: 6 of
 * 9 homeowners are flagged complete — all mobile-onboarded. Web-only
 * homeowners stayed at false forever.
 *
 * This route bundles both writes so the wizard's Finish button is one
 * idempotent call. Re-running with the same payload re-merges the
 * settings JSONB (no clobbering of unrelated keys) and is a no-op on
 * the already-flipped flag.
 *
 * Schema mirrors apps/web/app/api/users/profile/route.ts:66-71 so the
 * accepted enum + array shape stays consistent across both write paths.
 */
const homeownerOnboardingCompleteSchema = z
  .object({
    propertyType: z
      .enum(['house', 'flat', 'bungalow', 'maisonette', 'other'])
      .optional()
      .nullable(),
    concernTags: z.array(z.string().max(60)).max(20).optional().nullable(),
  })
  .strict();

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const validation = await validateRequest(
      request,
      homeownerOnboardingCompleteSchema
    );
    if ('headers' in validation) {
      return validation;
    }

    const { propertyType, concernTags } = validation.data;

    // Merge into profiles.settings (JSONB) without clobbering unrelated
    // keys (notifications, theme, etc.). Same pattern as
    // /api/users/profile PUT handler — kept inline so this route is
    // self-contained.
    const { data: existing } = await serverSupabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .single();

    const currentSettings =
      (existing?.settings as Record<string, unknown> | null | undefined) ?? {};

    const setupPatch: Record<string, unknown> = {};
    if (propertyType !== undefined) {
      setupPatch.property_type = propertyType;
    }
    if (concernTags !== undefined) {
      setupPatch.concern_tags = concernTags ?? [];
    }

    const mergedSettings = {
      ...currentSettings,
      ...setupPatch,
    };

    const { error: settingsError } = await serverSupabase
      .from('profiles')
      .update({
        settings: mergedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (settingsError) {
      logger.error('Failed to persist homeowner setup answers', settingsError, {
        service: 'homeowner-onboarding',
        userId: user.id,
      });
      throw new InternalServerError('Failed to save setup answers');
    }

    // Flip the completion flag via the shared service so the columns
    // (onboarding_completed, onboarding_completed_at,
    // intro_swiper_dismissed_at) stay in lock-step with the mobile
    // intro-swiper path.
    const flagOk = await OnboardingService.markOnboardingComplete(user.id);
    if (!flagOk) {
      // Settings were saved but the flag wasn't — surface a soft error
      // so the client can decide what to do. The wizard's onSuccess
      // still advances to the welcome step.
      logger.warn(
        'Homeowner settings saved but onboarding_completed flag write failed',
        { service: 'homeowner-onboarding', userId: user.id }
      );
    }

    return NextResponse.json({
      success: true,
      onboardingCompleted: flagOk,
    });
  }
);
