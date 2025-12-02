/**
 * Revenue Queries Utility
 * Real-time aggregation of payment data for dashboard charts
 * Replaces hardcoded multipliers with actual database queries
 */

import { serverSupabase } from '@/lib/api/supabaseServer';

// ==========================================================
// TYPES
// ==========================================================

export interface MonthlyRevenue {
  /** Month label (e.g., "Jan", "Feb") */
  month: string;
  /** Year (e.g., 2025) */
  year: number;
  /** Total revenue/spending for the month */
  total: number;
  /** Number of transactions in the month */
  count: number;
  /** Internal key for sorting (e.g., "2025-01") */
  monthKey: string;
}

export interface RevenueStats {
  /** Total revenue/spending across all months */
  total: number;
  /** Average revenue per month */
  monthlyAverage: number;
  /** Growth percentage (last month vs previous month) */
  growthPercentage: number;
  /** Revenue for the most recent month */
  lastMonthRevenue: number;
  /** Revenue for the previous month */
  previousMonthRevenue: number;
}

// ==========================================================
// MAIN QUERY FUNCTION
// ==========================================================

/**
 * Get monthly revenue aggregated by month
 *
 * @param userId - User ID (contractor for earnings, homeowner for spending)
 * @param months - Number of months to fetch (default: 12)
 * @param type - 'earnings' (payee_id) or 'spending' (payer_id)
 * @returns Array of monthly revenue data, always returns `months` items (fills missing with zeros)
 *
 * @example
 * ```typescript
 * // Get contractor earnings for last 12 months
 * const earnings = await getMonthlyRevenue('user-123', 12, 'earnings');
 *
 * // Get homeowner spending for last 6 months
 * const spending = await getMonthlyRevenue('user-456', 6, 'spending');
 * ```
 */
export async function getMonthlyRevenue(
  userId: string,
  months: number = 12,
  type: 'earnings' | 'spending' = 'earnings'
): Promise<MonthlyRevenue[]> {
  const supabase = serverSupabase;

  // Calculate start date (N months ago from start of current month)
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1); // First day of month
  startDate.setHours(0, 0, 0, 0);

  // Determine which column to query based on type
  const userIdColumn = type === 'earnings' ? 'payee_id' : 'payer_id';

  try {
    // Query payments from database
    const { data: payments, error } = await supabase
      .from('payments')
      .select('amount, created_at, status')
      .eq(userIdColumn, userId)
      .eq('status', 'completed') // Only count completed payments
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error(`[getMonthlyRevenue] Error fetching ${type}:`, error);
      // Return empty months instead of failing
      return generateEmptyMonths(months);
    }

    // Group payments by month
    const monthlyMap = new Map<string, MonthlyRevenue>();

    payments?.forEach((payment) => {
      const date = new Date(payment.created_at);
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleString('en-GB', { month: 'short' });

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthLabel,
          year,
          total: 0,
          count: 0,
          monthKey,
        });
      }

      const monthData = monthlyMap.get(monthKey)!;
      monthData.total += Number(payment.amount);
      monthData.count += 1;
    });

    // Fill in missing months with zeros (ensures consistent chart display)
    const result: MonthlyRevenue[] = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < months; i++) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthLabel = currentDate.toLocaleString('en-GB', { month: 'short' });

      // Use actual data if available, otherwise zero
      result.push(
        monthlyMap.get(monthKey) || {
          month: monthLabel,
          year,
          total: 0,
          count: 0,
          monthKey,
        }
      );

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return result;
  } catch (error) {
    console.error('[getMonthlyRevenue] Unexpected error:', error);
    return generateEmptyMonths(months);
  }
}

// ==========================================================
// STATS CALCULATION
// ==========================================================

/**
 * Get revenue statistics (total, average, growth)
 *
 * @param userId - User ID
 * @param type - 'earnings' or 'spending'
 * @returns Revenue statistics including growth percentage
 *
 * @example
 * ```typescript
 * const stats = await getRevenueStats('user-123', 'earnings');
 * console.log(`Total: £${stats.total}`);
 * console.log(`Growth: ${stats.growthPercentage}%`);
 * ```
 */
export async function getRevenueStats(
  userId: string,
  type: 'earnings' | 'spending' = 'earnings'
): Promise<RevenueStats> {
  const monthlyData = await getMonthlyRevenue(userId, 12, type);

  const total = monthlyData.reduce((sum, month) => sum + month.total, 0);
  const monthlyAverage = total / 12;

  const lastMonth = monthlyData[monthlyData.length - 1]?.total || 0;
  const previousMonth = monthlyData[monthlyData.length - 2]?.total || 0;

  const growthPercentage =
    previousMonth > 0 ? ((lastMonth - previousMonth) / previousMonth) * 100 : 0;

  return {
    total,
    monthlyAverage,
    growthPercentage,
    lastMonthRevenue: lastMonth,
    previousMonthRevenue: previousMonth,
  };
}

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================

/**
 * Generate empty months (used as fallback when query fails)
 */
function generateEmptyMonths(months: number): MonthlyRevenue[] {
  const result: MonthlyRevenue[] = [];
  const currentDate = new Date();
  currentDate.setMonth(currentDate.getMonth() - months);
  currentDate.setDate(1);
  currentDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < months; i++) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthLabel = currentDate.toLocaleString('en-GB', { month: 'short' });

    result.push({
      month: monthLabel,
      year,
      total: 0,
      count: 0,
      monthKey,
    });

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return result;
}

/**
 * Format currency for display
 */
export function formatRevenue(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format growth percentage
 */
export function formatGrowth(percentage: number): string {
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
}

// ==========================================================
// EXPORTS FOR TESTING
// ==========================================================

export const __testing = {
  generateEmptyMonths,
};
