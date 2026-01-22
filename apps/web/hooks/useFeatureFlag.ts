/**
 * useFeatureFlag Hook
 * Client-side hook to check feature flags
 * 
 * Usage:
 * ```typescript
 * 'use client';
 * import { useFeatureFlag } from '@/hooks/useFeatureFlag';
 * 
 * const isNewDashboardEnabled = useFeatureFlag('new-dashboard-2025');
 * ```
 */

'use client';

import { useEffect, useState } from 'react';
import { logger } from '@mintenance/shared';
import type { FeatureFlagName } from '@/lib/feature-flags';

export function useFeatureFlag(flagName: FeatureFlagName): boolean {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkFlag() {
      try {
        const response = await fetch(`/api/feature-flags/${flagName}`);
        if (response.ok) {
          const data = await response.json();
          setEnabled(data.enabled);
        }
      } catch (error) {
        logger.error(`[useFeatureFlag] Error checking ${flagName}:`, error);
      } finally {
        setLoading(false);
      }
    }

    checkFlag();
  }, [flagName]);

  return enabled;
}

