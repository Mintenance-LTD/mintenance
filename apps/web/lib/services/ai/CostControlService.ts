/**
 * AI Cost Control Service
 *
 * Enforces budget limits and tracks API usage costs across all AI services.
 * Prevents runaway API costs by implementing hard limits and monitoring.
 */

import { logger } from '../../logger';
import { serverSupabase } from '@/lib/api/supabaseServer';

interface CostEstimate {
  service: string;
  model: string;
  tokens?: number;
  images?: number;
  estimatedCost: number;
}

interface UsageRecord {
  id: string;
  service: string;
  model: string;
  tokens: number;
  cost: number;
  timestamp: Date;
  user_id?: string;
  job_id?: string;
  success: boolean;
}

export class CostControlService {
  // Budget configuration from environment with sensible defaults
  private static readonly DAILY_BUDGET = parseFloat(process.env.AI_DAILY_BUDGET || '100');
  private static readonly MONTHLY_BUDGET = parseFloat(process.env.AI_MONTHLY_BUDGET || '2000');
  private static readonly ALERT_THRESHOLD = parseFloat(process.env.AI_ALERT_THRESHOLD || '0.8');
  private static readonly MAX_COST_PER_REQUEST = parseFloat(process.env.AI_MAX_COST_PER_REQUEST || '5');

  // Cost rates per model (in USD)
  private static readonly COST_RATES = {
    'gpt-4o': { input: 0.005, output: 0.015 }, // per 1K tokens
    'mint-ai-vlm': { input: 0.005, output: 0.015 }, // Phase 4: same as gpt-4o until in-house VLM
    'gpt-4-vision-preview': { input: 0.01, output: 0.03 }, // per 1K tokens
    'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }, // per 1K tokens
    'text-embedding-3-small': { input: 0.00002, output: 0 }, // per 1K tokens
    'google-vision': { perImage: 0.0015 }, // per image
    'roboflow': { perImage: 0.001 }, // per image
    'aws-rekognition': { perImage: 0.001 }, // per image
  };

  // In-memory cache for current period spending
  private static currentDaySpend = 0;
  private static currentMonthSpend = 0;
  private static lastResetDay = new Date().toISOString().split('T')[0];
  private static lastResetMonth = new Date().toISOString().slice(0, 7);

  /**
   * Check if a request can proceed within budget constraints
   */
  static async checkBudget(estimate: CostEstimate): Promise<{
    allowed: boolean;
    reason?: string;
    currentDailySpend: number;
    dailyBudgetRemaining: number;
  }> {
    try {
      // Reset counters if new day/month
      await this.resetCountersIfNeeded();

      // Check per-request limit
      if (estimate.estimatedCost > this.MAX_COST_PER_REQUEST) {
        logger.warn('AI request exceeds per-request limit', {
          service: estimate.service,
          estimatedCost: estimate.estimatedCost,
          limit: this.MAX_COST_PER_REQUEST
        });

        return {
          allowed: false,
          reason: `Request cost ($${estimate.estimatedCost.toFixed(2)}) exceeds per-request limit ($${this.MAX_COST_PER_REQUEST})`,
          currentDailySpend: this.currentDaySpend,
          dailyBudgetRemaining: Math.max(0, this.DAILY_BUDGET - this.currentDaySpend)
        };
      }

      // Check daily budget
      if (this.currentDaySpend + estimate.estimatedCost > this.DAILY_BUDGET) {
        logger.warn('AI daily budget would be exceeded', {
          currentSpend: this.currentDaySpend,
          attemptedCost: estimate.estimatedCost,
          dailyBudget: this.DAILY_BUDGET
        });

        return {
          allowed: false,
          reason: `Daily budget would be exceeded ($${this.currentDaySpend.toFixed(2)} + $${estimate.estimatedCost.toFixed(2)} > $${this.DAILY_BUDGET})`,
          currentDailySpend: this.currentDaySpend,
          dailyBudgetRemaining: Math.max(0, this.DAILY_BUDGET - this.currentDaySpend)
        };
      }

      // Check monthly budget
      if (this.currentMonthSpend + estimate.estimatedCost > this.MONTHLY_BUDGET) {
        logger.warn('AI monthly budget would be exceeded', {
          currentMonthSpend: this.currentMonthSpend,
          attemptedCost: estimate.estimatedCost,
          monthlyBudget: this.MONTHLY_BUDGET
        });

        return {
          allowed: false,
          reason: `Monthly budget would be exceeded ($${this.currentMonthSpend.toFixed(2)} + $${estimate.estimatedCost.toFixed(2)} > $${this.MONTHLY_BUDGET})`,
          currentDailySpend: this.currentDaySpend,
          dailyBudgetRemaining: Math.max(0, this.DAILY_BUDGET - this.currentDaySpend)
        };
      }

      // Check if approaching threshold and log warning
      const dailyPercentage = (this.currentDaySpend + estimate.estimatedCost) / this.DAILY_BUDGET;
      if (dailyPercentage > this.ALERT_THRESHOLD) {
        logger.warn('AI spend approaching daily budget threshold', {
          percentage: (dailyPercentage * 100).toFixed(1),
          threshold: (this.ALERT_THRESHOLD * 100).toFixed(0)
        });
      }

      return {
        allowed: true,
        currentDailySpend: this.currentDaySpend,
        dailyBudgetRemaining: Math.max(0, this.DAILY_BUDGET - this.currentDaySpend - estimate.estimatedCost)
      };

    } catch (error) {
      logger.error('Failed to check AI budget', error);
      // Fail open in case of error (allow request but log)
      return {
        allowed: true,
        reason: 'Budget check failed, allowing request',
        currentDailySpend: this.currentDaySpend,
        dailyBudgetRemaining: this.DAILY_BUDGET
      };
    }
  }

  /**
   * Record actual usage after API call completes
   */
  static async recordUsage(
    service: string,
    model: string,
    actualCost: number,
    metadata?: {
      tokens?: number;
      user_id?: string;
      job_id?: string;
      success?: boolean;
    }
  ): Promise<void> {
    try {
      // Update in-memory counters
      this.currentDaySpend += actualCost;
      this.currentMonthSpend += actualCost;

      // Store in database for tracking
      const { error } = await serverSupabase
        .from('ai_service_costs')
        .insert({
          service,
          model,
          cost: actualCost,
          tokens: metadata?.tokens || 0,
          user_id: metadata?.user_id,
          job_id: metadata?.job_id,
          success: metadata?.success ?? true,
          timestamp: new Date().toISOString()
        });

      if (error) {
        logger.error('Failed to record AI usage in database', error);
      }

      // Log metrics
      logger.info('AI usage recorded', {
        service,
        model,
        cost: actualCost,
        dailySpend: this.currentDaySpend,
        monthlySpend: this.currentMonthSpend,
        dailyBudgetRemaining: Math.max(0, this.DAILY_BUDGET - this.currentDaySpend)
      });

    } catch (error) {
      logger.error('Failed to record AI usage', error);
    }
  }

  /**
   * Estimate cost for a request before making it
   */
  static estimateCost(
    model: string,
    params: {
      inputTokens?: number;
      outputTokens?: number;
      images?: number;
    }
  ): number {
    const rates = this.COST_RATES[model as keyof typeof this.COST_RATES];

    if (!rates) {
      logger.warn('Unknown model for cost estimation', { model });
      return 0;
    }

    let cost = 0;

    // Token-based models
    if ('input' in rates && params.inputTokens) {
      cost += (params.inputTokens / 1000) * rates.input;
    }
    if ('output' in rates && params.outputTokens) {
      cost += (params.outputTokens / 1000) * rates.output;
    }

    // Image-based models
    if ('perImage' in rates && params.images) {
      cost += params.images * rates.perImage;
    }

    return cost;
  }

  /**
   * Get current budget status
   */
  static async getBudgetStatus(): Promise<{
    daily: {
      spent: number;
      budget: number;
      remaining: number;
      percentage: number;
    };
    monthly: {
      spent: number;
      budget: number;
      remaining: number;
      percentage: number;
    };
    alerts: string[];
  }> {
    await this.resetCountersIfNeeded();

    const dailyPercentage = (this.currentDaySpend / this.DAILY_BUDGET) * 100;
    const monthlyPercentage = (this.currentMonthSpend / this.MONTHLY_BUDGET) * 100;

    const alerts: string[] = [];

    if (dailyPercentage > this.ALERT_THRESHOLD * 100) {
      alerts.push(`Daily spend at ${dailyPercentage.toFixed(1)}% of budget`);
    }

    if (monthlyPercentage > this.ALERT_THRESHOLD * 100) {
      alerts.push(`Monthly spend at ${monthlyPercentage.toFixed(1)}% of budget`);
    }

    return {
      daily: {
        spent: this.currentDaySpend,
        budget: this.DAILY_BUDGET,
        remaining: Math.max(0, this.DAILY_BUDGET - this.currentDaySpend),
        percentage: dailyPercentage
      },
      monthly: {
        spent: this.currentMonthSpend,
        budget: this.MONTHLY_BUDGET,
        remaining: Math.max(0, this.MONTHLY_BUDGET - this.currentMonthSpend),
        percentage: monthlyPercentage
      },
      alerts
    };
  }

  /**
   * Reset counters at day/month boundaries
   */
  private static async resetCountersIfNeeded(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);

    // Reset daily counter
    if (today !== this.lastResetDay) {
      this.currentDaySpend = await this.getTodaySpendFromDB();
      this.lastResetDay = today;
    }

    // Reset monthly counter
    if (thisMonth !== this.lastResetMonth) {
      this.currentMonthSpend = await this.getMonthSpendFromDB();
      this.lastResetMonth = thisMonth;
    }
  }

  /**
   * Get today's spend from database
   */
  private static async getTodaySpendFromDB(): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await serverSupabase
        .from('ai_service_costs')
        .select('cost')
        .gte('timestamp', `${today}T00:00:00`)
        .lt('timestamp', `${today}T23:59:59`);

      if (error) {
        logger.error('Failed to get today spend from DB', error);
        return 0;
      }

      return data?.reduce((sum, record) => sum + (record.cost || 0), 0) || 0;
    } catch (error) {
      logger.error('Failed to query today spend', error);
      return 0;
    }
  }

  /**
   * Get this month's spend from database
   */
  private static async getMonthSpendFromDB(): Promise<number> {
    try {
      const thisMonth = new Date().toISOString().slice(0, 7);
      const { data, error } = await serverSupabase
        .from('ai_service_costs')
        .select('cost')
        .gte('timestamp', `${thisMonth}-01T00:00:00`)
        .lt('timestamp', `${thisMonth}-31T23:59:59`);

      if (error) {
        logger.error('Failed to get month spend from DB', error);
        return 0;
      }

      return data?.reduce((sum, record) => sum + (record.cost || 0), 0) || 0;
    } catch (error) {
      logger.error('Failed to query month spend', error);
      return 0;
    }
  }

  /**
   * Emergency stop - disable all AI services
   */
  static emergencyStop(): void {
    logger.error('AI EMERGENCY STOP ACTIVATED - All AI services disabled');
    // This would be checked by all AI services before making calls
    process.env.AI_EMERGENCY_STOP = 'true';
  }

  /**
   * Check if emergency stop is active
   */
  static isEmergencyStopped(): boolean {
    return process.env.AI_EMERGENCY_STOP === 'true';
  }
}