/**
 * Feature Flags API Endpoint
 * GET /api/feature-flags/[flagName]
 * 
 * Returns whether a feature flag is enabled for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { isFeatureEnabled, type FeatureFlagName } from '@/lib/feature-flags';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ flagName: string }> }
) {
  try {
    const user = await getCurrentUserFromCookies();
    const { flagName } = await params;

    // Validate flag name
    const validFlags: FeatureFlagName[] = [
      'new-dashboard-2025',
      'enhanced-messaging',
      'real-time-notifications',
      'advanced-analytics',
    ];

    if (!validFlags.includes(flagName as FeatureFlagName)) {
      return NextResponse.json(
        { error: 'Invalid feature flag name' },
        { status: 400 }
      );
    }

    // Check if feature is enabled for user
    const enabled = await isFeatureEnabled(
      flagName as FeatureFlagName,
      user?.id,
      user?.role
    );

    return NextResponse.json({
      flagName,
      enabled,
      userId: user?.id,
      userRole: user?.role,
    });
  } catch (error) {
    console.error('[FeatureFlags API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

