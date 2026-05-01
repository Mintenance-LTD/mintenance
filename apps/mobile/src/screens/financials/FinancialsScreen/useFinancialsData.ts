import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import type { PaymentRecord } from './constants';

interface FinancialsResponse {
  payments: PaymentRecord[];
  subscription: {
    planType: string | null;
    status: string | null;
  } | null;
}

export function useFinancialsData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['homeowner-financials', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // 2026-04-30 audit P0-1: was reading `escrow_transactions` and
      // `subscriptions` directly. Backed by the new
      // /api/homeowner/financials endpoint which projects the same
      // shape and lets the server enforce RLS / role gating.
      const data = await mobileApiClient.get<FinancialsResponse>(
        '/api/homeowner/financials'
      );

      const payments: PaymentRecord[] = data?.payments ?? [];
      const subscriptionRes = data?.subscription
        ? {
            subscription: {
              planType: data.subscription.planType ?? '',
              status: data.subscription.status ?? '',
            },
          }
        : { subscription: null };

      const totalSpent = payments
        .filter((p) =>
          ['completed', 'released', 'release_pending'].includes(p.status)
        )
        .reduce((sum, p) => sum + p.amount, 0);

      const inEscrow = payments
        .filter((p) => p.status === 'held' || p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);

      const refunded = payments
        .filter((p) => p.status === 'refunded')
        .reduce((sum, p) => sum + p.amount, 0);

      const now = new Date();
      const thisMonth = payments
        .filter((p) => {
          const d = new Date(p.created_at);
          return (
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          );
        })
        .reduce((sum, p) => sum + p.amount, 0);

      // Build category breakdown from payments
      const categoryTotals: Record<string, number> = {};
      for (const p of payments.filter((pay) =>
        ['completed', 'released', 'release_pending'].includes(pay.status)
      )) {
        const cat = p.category || 'general';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + p.amount;
      }

      const categoryBreakdown = Object.entries(categoryTotals)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage:
            totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        totalSpent,
        inEscrow,
        refunded,
        thisMonth,
        recentPayments: payments.slice(0, 8),
        subscription: subscriptionRes.subscription,
        categoryBreakdown,
      };
    },
  });
}

type FinancialsData = NonNullable<ReturnType<typeof useFinancialsData>['data']>;
