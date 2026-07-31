import { useAuth } from '../contexts/AuthContext';
import { useSubscriptionStatusQuery } from '../screens/subscription/queries';
import { DEFAULT_PLATFORM_FEE_RATE } from '@mintenance/shared';

/**
 * The current contractor's effective platform fee rate (decimal, e.g.
 * 0.05), resolved server-side by GET /api/subscriptions/status with the
 * SAME resolver the escrow release charges with — so a bid preview quotes
 * the real rate instead of a hardcoded percent.
 *
 * 2026-07-22: replaces the per-screen `PLATFORM_FEE_PERCENT = 5` constant
 * that showed every contractor 5% regardless of tier. While the query is
 * loading (or for a non-contractor) it returns the Basic default (12%),
 * matching the server's own conservative fallback so an estimate never
 * under-quotes the fee.
 */
export function useContractorFeeRate(): {
  rate: number;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const query = useSubscriptionStatusQuery(
    user?.role ?? 'contractor',
    user?.id
  );
  const rate = query.data?.platformFeeRate ?? DEFAULT_PLATFORM_FEE_RATE;
  return { rate, isLoading: query.isLoading };
}

export default useContractorFeeRate;
