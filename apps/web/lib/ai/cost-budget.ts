/**
 * AI Cost Budget Guard
 *
 * Sprint 5.3 (2026-04-13 audit remediation): the audit found that AI
 * endpoints had per-request rate limiting but no per-user cost cap. A
 * single compromised account could exhaust the platform AI budget by
 * making thousands of expensive vision calls. This helper enforces a
 * rolling 24-hour and 30-day cost cap per user by querying the existing
 * `ai_service_costs` table.
 *
 * Failure mode is fail-OPEN on read errors (transient DB issues should
 * not block legitimate users from running an assessment) but the warning
 * is logged so ops can monitor. The hard rate limit at the entry point
 * (5 req/min) provides the second layer of defence.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export interface AICostBudgetResult {
  allowed: boolean;
  reason?: 'daily_cap_exceeded' | 'monthly_cap_exceeded' | 'check_failed';
  spent: { day: number; month: number };
  limits: { day: number; month: number };
}

/** Default per-user budget caps in USD. Override per call site if needed. */
export const DEFAULT_AI_BUDGET = {
  /** Rolling 24h soft cap. £5 of vision calls is roughly 100 assessments. */
  perUserDailyUSD: 5,
  /** Rolling 30d hard cap. */
  perUserMonthlyUSD: 50,
} as const;

export interface AICostBudgetOptions {
  perUserDailyUSD?: number;
  perUserMonthlyUSD?: number;
}

/**
 * Check whether a user is within their AI cost budget. Returns
 * `{ allowed: false, reason }` when the user has exceeded a cap.
 *
 * Callers should treat `allowed: false` as a 429 / 402 response.
 */
export async function checkAICostBudget(
  userId: string,
  options: AICostBudgetOptions = {}
): Promise<AICostBudgetResult> {
  const dailyLimit =
    options.perUserDailyUSD ?? DEFAULT_AI_BUDGET.perUserDailyUSD;
  const monthlyLimit =
    options.perUserMonthlyUSD ?? DEFAULT_AI_BUDGET.perUserMonthlyUSD;

  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await serverSupabase
      .from('ai_service_costs')
      .select('cost, timestamp')
      .eq('user_id', userId)
      .gte('timestamp', monthAgo);

    if (error) {
      logger.warn('AI cost budget check failed — failing open', {
        service: 'ai-budget',
        userId,
        error: error.message,
      });
      return {
        allowed: true,
        reason: 'check_failed',
        spent: { day: 0, month: 0 },
        limits: { day: dailyLimit, month: monthlyLimit },
      };
    }

    const rows = data ?? [];
    let dayCost = 0;
    let monthCost = 0;
    for (const row of rows) {
      const cost = Number(row.cost) || 0;
      monthCost += cost;
      if (row.timestamp >= dayAgo) {
        dayCost += cost;
      }
    }

    if (monthCost >= monthlyLimit) {
      logger.warn('AI monthly cost cap exceeded', {
        service: 'ai-budget',
        userId,
        monthCost,
        limit: monthlyLimit,
      });
      return {
        allowed: false,
        reason: 'monthly_cap_exceeded',
        spent: { day: dayCost, month: monthCost },
        limits: { day: dailyLimit, month: monthlyLimit },
      };
    }

    if (dayCost >= dailyLimit) {
      logger.warn('AI daily cost cap exceeded', {
        service: 'ai-budget',
        userId,
        dayCost,
        limit: dailyLimit,
      });
      return {
        allowed: false,
        reason: 'daily_cap_exceeded',
        spent: { day: dayCost, month: monthCost },
        limits: { day: dailyLimit, month: monthlyLimit },
      };
    }

    return {
      allowed: true,
      spent: { day: dayCost, month: monthCost },
      limits: { day: dailyLimit, month: monthlyLimit },
    };
  } catch (error) {
    logger.error('Exception in AI cost budget check — failing open', error, {
      service: 'ai-budget',
      userId,
    });
    return {
      allowed: true,
      reason: 'check_failed',
      spent: { day: 0, month: 0 },
      limits: { day: dailyLimit, month: monthlyLimit },
    };
  }
}
