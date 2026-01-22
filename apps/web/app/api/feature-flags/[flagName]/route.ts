/**
 * Feature Flags API Endpoint
 * GET /api/feature-flags/[flagName]
 * 
 * Returns whether a feature flag is enabled for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { isFeatureEnabled, type FeatureFlagName } from '@/lib/feature-flags';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@mintenance/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ flagName: string }> }
) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

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
    logger.error('[FeatureFlags API] Error:', error, { service: 'api' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

