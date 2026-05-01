import { NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { isFeatureEnabled, type FeatureFlagName } from '@/lib/feature-flags';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const VALID_FLAGS: FeatureFlagName[] = [
  'new-dashboard-2025',
  'enhanced-messaging',
  'real-time-notifications',
  'advanced-analytics',
];

/**
 * GET /api/feature-flags/[flagName] - check if a feature flag is enabled.
 *
 * auth-check: ok — feature flags are queried before sign-in (e.g. the
 * landing page asks "is the new home-health pricing flag on?" to
 * decide what to render). Optional-auth path is preserved below.
 */
export const GET = withApiHandler(
  { auth: false },
  async (_request, { params }) => {
    const { flagName } = params;

    if (!VALID_FLAGS.includes(flagName as FeatureFlagName)) {
      throw new BadRequestError('Invalid feature flag name');
    }

    // Optional auth - feature flags work with or without a user
    const user = await getCurrentUserFromCookies();

    const enabled = await isFeatureEnabled(
      flagName as FeatureFlagName,
      user?.id,
      user?.role
    );

    return NextResponse.json({
      flagName,
      enabled,
    });
  }
);
