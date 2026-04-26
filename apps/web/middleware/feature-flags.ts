/**
 * 2025 UI feature-flag logic for gradual rollout.
 * Extracted from middleware.ts — previously the standalone helpers
 * `is2025FeatureEnabled`, `getRolloutPercentage`, `simpleHash`.
 *
 * Precedence (highest first):
 *   1. DISABLE_2025_PAGES kill switch
 *   2. NEXT_PUBLIC_ENABLE_2025_DASHBOARD global flag
 *   3. `dashboard-version` cookie (user preference)
 *   4. `beta-features` cookie
 *   5. Percentage rollout via NEXT_PUBLIC_ROLLOUT_PERCENTAGE + consistent hash
 */
import type { NextRequest } from 'next/server';
import { logger } from '@mintenance/shared';
import { getClientIp } from '@/lib/request-ip';

/** Deterministic 32-bit string hash for user bucketing. */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/** Rollout percentage from env, validated 0–100. Defaults to 0. */
function getRolloutPercentage(): number {
  const percentage = process.env.NEXT_PUBLIC_ROLLOUT_PERCENTAGE;
  if (!percentage) return 0;

  const parsed = parseInt(percentage, 10);
  if (isNaN(parsed) || parsed < 0 || parsed > 100) {
    logger.warn('Invalid NEXT_PUBLIC_ROLLOUT_PERCENTAGE value', {
      service: 'middleware',
      value: percentage,
    });
    return 0;
  }
  return parsed;
}

/** Resolve the 2025 UI flag for a given request. */
export function is2025FeatureEnabled(request: NextRequest): boolean {
  if (process.env.DISABLE_2025_PAGES === 'true') return false;
  if (process.env.NEXT_PUBLIC_ENABLE_2025_DASHBOARD === 'true') return true;

  const userPreference = request.cookies.get('dashboard-version')?.value;
  if (userPreference === '2025') return true;
  if (userPreference === 'current') return false;

  if (request.cookies.get('beta-features')?.value === 'true') return true;

  const rolloutPercentage = getRolloutPercentage();
  if (rolloutPercentage > 0) {
    // Audit P2 (2026-04-23): use trusted Vercel-verified IP for the
    // rollout-bucket fallback. Spoofable XFF lets a single client
    // toggle in/out of the 2025 UI by sending different
    // `X-Forwarded-For` values per request, splintering A/B
    // measurements. `getClientIp` falls through to `'unknown'` when
    // no header is present, which is a stable bucket.
    const userIdentifier =
      request.cookies.get('session-id')?.value || getClientIp(request);
    const hash = simpleHash(userIdentifier);
    const userPercentile = hash % 100;
    if (userPercentile < rolloutPercentage) return true;
  }

  return false;
}
