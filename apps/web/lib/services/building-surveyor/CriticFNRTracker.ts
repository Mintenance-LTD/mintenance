/**
 * CriticFNRTracker
 *
 * Tracks False Negative Rates (FNR) per Mondrian stratum for the Safe-LUCB Critic.
 * Implements Wilson score confidence intervals and hierarchical stratum fallback.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { wilsonScoreUpper } from './ab-test/ABTestMathUtils';

export interface FNRResult {
  fnr: number; // Point estimate of FNR (0-1)
  fnrUpperBound: number; // Wilson score upper bound (95% confidence)
  sampleSize: number; // Number of automated decisions in stratum
  confidence: number; // Confidence level (0-1)
  shouldEscalate: boolean; // True if FNR upper bound exceeds threshold OR sample size too small
  reason?: string; // Human-readable explanation
}

export class CriticFNRTracker {
  // FNR tracking cache (stratum -> FNR stats)
  static fnrCache: Map<string, { fnr: number; lastUpdated: number }> = new Map();
  static readonly FNR_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  /**
   * Get False Negative Rate with statistical validation for a stratum.
   *
   * Implements Wilson score confidence intervals for small samples (n < 100)
   * and validates sample size sufficiency (escalates if n < 10).
   *
   * @param stratum - Mondrian stratum identifier
   * @returns FNRResult with confidence intervals and escalation flag
   */
  static async getFNR(stratum: string): Promise<FNRResult> {
    try {
      // Load from database
      const { data, error } = await serverSupabase
        .from('ab_critic_fnr_tracking')
        .select('false_negatives, total_automated')
        .eq('stratum', stratum)
        .single();

      // Handle "not found" error (PGRST116)
      if (error && error.code === 'PGRST116') {
        return {
          fnr: 0,
          fnrUpperBound: 1.0, // Conservative: assume 100% FNR upper bound when no data
          sampleSize: 0,
          confidence: 0.95,
          shouldEscalate: true,
          reason: 'No data available for stratum - escalating for safety',
        };
      }

      // Handle other database errors
      if (error) {
        logger.error('Database error loading FNR', {
          service: 'CriticModule',
          stratum,
          error,
        });
        return {
          fnr: 0,
          fnrUpperBound: 1.0,
          sampleSize: 0,
          confidence: 0.95,
          shouldEscalate: true,
          reason: 'Database error - escalating for safety',
        };
      }

      const falseNegatives = data?.false_negatives || 0;
      const totalAutomated = data?.total_automated || 0;

      // Sample size validation
      if (totalAutomated < 10) {
        logger.warn('Insufficient sample size for FNR estimation', {
          service: 'CriticModule',
          stratum,
          sampleSize: totalAutomated,
        });
        return {
          fnr: totalAutomated > 0 ? falseNegatives / totalAutomated : 0,
          fnrUpperBound: 1.0,
          sampleSize: totalAutomated,
          confidence: 0.95,
          shouldEscalate: true,
          reason: `Insufficient sample size (n=${totalAutomated}) - need at least 10 observations`,
        };
      }

      // Compute point estimate
      const fnr = falseNegatives / totalAutomated;

      // Compute Wilson score upper bound for 95% confidence
      const fnrUpperBound = wilsonScoreUpper(falseNegatives, totalAutomated, 0.95);

      // Check if should escalate (5% threshold)
      const FNR_THRESHOLD = 0.05;
      const shouldEscalate = fnrUpperBound >= FNR_THRESHOLD;

      logger.debug('FNR computed with confidence interval', {
        service: 'CriticModule',
        stratum,
        fnr,
        fnrUpperBound,
        sampleSize: totalAutomated,
        shouldEscalate,
      });

      return {
        fnr,
        fnrUpperBound,
        sampleSize: totalAutomated,
        confidence: 0.95,
        shouldEscalate,
        reason: shouldEscalate
          ? `FNR upper bound (${(fnrUpperBound * 100).toFixed(2)}%) exceeds threshold (${FNR_THRESHOLD * 100}%)`
          : undefined,
      };
    } catch (error) {
      logger.error('Unexpected error computing FNR', {
        service: 'CriticModule',
        stratum,
        error,
      });
      // Conservative: escalate on error
      return {
        fnr: 0,
        fnrUpperBound: 1.0,
        sampleSize: 0,
        confidence: 0.95,
        shouldEscalate: true,
        reason: 'Unexpected error - escalating for safety',
      };
    }
  }

  /**
   * Get FNR with hierarchical fallback.
   *
   * Implements fallback hierarchy for sparse strata:
   * 1. Specific stratum (e.g., "region:west|severity:high")
   * 2. Parent stratum (e.g., "region:west")
   * 3. Grandparent stratum (e.g., "global")
   * 4. Global default (if no data exists)
   *
   * @param stratum - Mondrian stratum identifier (e.g., "region:west|severity:high")
   * @returns FNRResult with metadata about which stratum was used
   */
  static async getFNRWithFallback(stratum: string): Promise<
    FNRResult & { stratumUsed: string; fallbackLevel: number }
  > {
    // Try specific stratum first
    const specificResult = await this.getFNR(stratum);
    if (specificResult.sampleSize >= 10) {
      return {
        ...specificResult,
        stratumUsed: stratum,
        fallbackLevel: 0,
      };
    }

    // Parse stratum to get parent (remove last component)
    const stratumParts = stratum.split('|');
    if (stratumParts.length > 1) {
      // Try parent stratum (e.g., "region:west|severity:high" -> "region:west")
      const parentStratum = stratumParts.slice(0, -1).join('|');
      const parentResult = await this.getFNR(parentStratum);
      if (parentResult.sampleSize >= 10) {
        logger.info('Using parent stratum FNR due to insufficient specific data', {
          service: 'CriticModule',
          specificStratum: stratum,
          parentStratum,
          specificSampleSize: specificResult.sampleSize,
          parentSampleSize: parentResult.sampleSize,
        });
        return {
          ...parentResult,
          stratumUsed: parentStratum,
          fallbackLevel: 1,
        };
      }

      // Try grandparent stratum if parent also insufficient
      if (stratumParts.length > 2) {
        const grandparentStratum = stratumParts.slice(0, -2).join('|');
        const grandparentResult = await this.getFNR(grandparentStratum);
        if (grandparentResult.sampleSize >= 10) {
          logger.info('Using grandparent stratum FNR due to insufficient parent data', {
            service: 'CriticModule',
            specificStratum: stratum,
            grandparentStratum,
            specificSampleSize: specificResult.sampleSize,
            grandparentSampleSize: grandparentResult.sampleSize,
          });
          return {
            ...grandparentResult,
            stratumUsed: grandparentStratum,
            fallbackLevel: 2,
          };
        }
      }
    }

    // Try global stratum as final fallback
    const globalResult = await this.getFNR('global');
    if (globalResult.sampleSize >= 10) {
      logger.warn('Using global stratum FNR due to insufficient hierarchical data', {
        service: 'CriticModule',
        specificStratum: stratum,
        specificSampleSize: specificResult.sampleSize,
        globalSampleSize: globalResult.sampleSize,
      });
      return {
        ...globalResult,
        stratumUsed: 'global',
        fallbackLevel: 3,
      };
    }

    // No sufficient data at any level - return specific result with escalation flag
    logger.error('Insufficient data at all stratum levels', {
      service: 'CriticModule',
      stratum,
      specificSampleSize: specificResult.sampleSize,
      globalSampleSize: globalResult.sampleSize,
    });
    return {
      ...specificResult,
      shouldEscalate: true,
      reason: 'Insufficient data at all stratum levels - escalating for safety',
      stratumUsed: stratum,
      fallbackLevel: 0,
    };
  }

  /**
   * Record outcome of an automated decision.
   *
   * @param stratum - Mondrian stratum identifier
   * @param decision - The decision that was made ('automate' or 'escalate')
   * @param actualCriticalHazard - Whether a critical hazard was actually present
   */
  static async recordOutcome(
    stratum: string,
    decision: 'automate' | 'escalate',
    actualCriticalHazard: boolean
  ): Promise<void> {
    // Only track outcomes for automated decisions
    if (decision !== 'automate') {
      return;
    }

    try {
      // Get current stats
      const { data: existing } = await serverSupabase
        .from('ab_critic_fnr_tracking')
        .select('total_automated, false_negatives')
        .eq('stratum', stratum)
        .single();

      const totalAutomated = (existing?.total_automated || 0) + 1;
      const falseNegatives = (existing?.false_negatives || 0) + (actualCriticalHazard ? 1 : 0);

      // Upsert FNR tracking
      await serverSupabase
        .from('ab_critic_fnr_tracking')
        .upsert({
          stratum,
          total_automated: totalAutomated,
          false_negatives: falseNegatives,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'stratum',
        });

      // Invalidate cache for this stratum
      this.fnrCache.delete(stratum);

      logger.debug('Recorded FNR outcome', {
        service: 'CriticModule',
        stratum,
        decision,
        actualCriticalHazard,
        totalAutomated,
        falseNegatives,
        fnr: falseNegatives / totalAutomated,
      });
    } catch (error) {
      logger.error('Failed to record FNR outcome', {
        service: 'CriticModule',
        stratum,
        decision,
        actualCriticalHazard,
        error,
      });
    }
  }

  /**
   * Persist FNR statistics to database (explicit save).
   */
  private static async persistFNR(stratum: string): Promise<void> {
    // This is handled by recordOutcome, but kept for explicit saves if needed
    await this.getFNR(stratum); // This will load and cache
  }

  /**
   * Load FNR statistics from database.
   */
  private static async loadFNR(stratum: string): Promise<FNRResult> {
    return this.getFNR(stratum);
  }
}
