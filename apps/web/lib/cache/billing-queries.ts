import { unstable_cache } from 'next/cache';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { CACHE_TAGS, CACHE_DURATIONS } from './config';
import { extractSupabaseError, type PaymentData, type SubscriptionData } from './types';

/**
 * Cached function to get user payments
 * Note: Uses payment_tracking table if payments table doesn't exist
 */
export const getCachedUserPayments = unstable_cache(
  async (userId: string, limit: number = 50): Promise<PaymentData[]> => {
    // Try payments table first, fallback to payment_tracking
    let data: PaymentData[] | null = null;
    let error: unknown = null;

    // First try the payments table
    const paymentsResult = await serverSupabase
      .from('payments')
      .select('id, amount, status, created_at, payment_date')
      .eq('payer_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (paymentsResult.error) {
      // If payments table doesn't exist, try payment_tracking
      if (paymentsResult.error.code === 'PGRST205') {
        const trackingResult = await serverSupabase
          .from('payment_tracking')
          .select('id, amount, status, created_at')
          .eq('contractor_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        data = trackingResult.data;
        error = trackingResult.error;
      } else {
        error = paymentsResult.error;
      }
    } else {
      // Map payment_date to due_date for compatibility
      data = (paymentsResult.data || []).map((payment: PaymentData) => ({
        ...payment,
        due_date: payment.payment_date,
      }));
    }

    if (error) {
      logger.error('Error fetching user payments', error, {
        service: 'cache',
        userId,
      });
      return [];
    }

    return data || [];
  },
  ['user-payments'],
  {
    tags: [CACHE_TAGS.USER_PAYMENTS],
    revalidate: CACHE_DURATIONS.SHORT,
  }
);

/**
 * Cached function to get user subscriptions
 * Note: Subscriptions are for contractors, homeowners don't have subscriptions
 * This returns empty array for homeowners
 */
export const getCachedUserSubscriptions = unstable_cache(
  async (userId: string, limit: number = 20) => {
    // Check if user is a contractor first
    const { data: userData } = await serverSupabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    // Only fetch subscriptions for contractors
    if (!userData || userData.role !== 'contractor') {
      return [];
    }

    const { data, error } = await serverSupabase
      .from('contractor_subscriptions')
      .select('id, status, current_period_end, amount, created_at')
      .eq('contractor_id', userId)
      .limit(limit);

    if (error) {
      const errorInfo = extractSupabaseError(error);
      logger.error('Error fetching user subscriptions', error, {
        service: 'cache',
        userId,
        code: errorInfo.code || null,
        message: errorInfo.message || null,
      });
      return [];
    }

    // Map current_period_end to next_billing_date for compatibility
    return (data || []).map((sub: SubscriptionData) => ({
      ...sub,
      next_billing_date: sub.current_period_end,
    }));
  },
  ['user-subscriptions'],
  {
    tags: [CACHE_TAGS.USER_SUBSCRIPTIONS],
    revalidate: CACHE_DURATIONS.SHORT,
  }
);
