import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../config/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { PaymentRecord } from './constants';

export function useFinancialsData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['homeowner-financials', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data: rows, error: err } = await supabase
        .from('escrow_transactions')
        .select(
          'id, amount, status, created_at, description, job:job_id(title)'
        )
        .eq('payer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (err) throw new Error(err.message);

      const payments: PaymentRecord[] = (rows || []).map(
        (r: Record<string, unknown>) => ({
          id: r.id as string,
          amount: (r.amount as number) || 0,
          status: (r.status as string) || 'pending',
          created_at: r.created_at as string,
          job_title: (r.job as Record<string, unknown>)?.title as
            | string
            | undefined,
          category: r.description as string | undefined,
        })
      );

      // Fetch subscription from profile
      const { data: subRow } = await supabase
        .from('subscriptions')
        .select('plan_type, status')
        .eq('user_id', user.id)
        .single();

      const subscriptionRes = subRow
        ? {
            subscription: {
              planType: subRow.plan_type as string,
              status: subRow.status as string,
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
