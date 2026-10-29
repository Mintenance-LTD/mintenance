import { it, expect, vi } from 'vitest';
const reconcile = vi.hoisted(() => vi.fn());
vi.mock('@/lib/cron-handler', () => ({
  withCronHandler: (_name: string, h: Function) => h,
}));
vi.mock('@/lib/services/payment/PaymentReconciliationService', () => ({
  PaymentReconciliationService: { reconcile },
}));
import { GET } from '@/app/api/cron/payment-reconciliation/route';
it.each(['errors', 'mismatched', 'missingInStripe'])(
  'marks a run unhealthy when %s remain',
  async (key) => {
    reconcile.mockResolvedValue({
      errors: 0,
      mismatched: 0,
      missingInStripe: 0,
      [key]: 1,
    });
    await expect(GET({} as never)).rejects.toThrow('requires retry');
  }
);
it('accepts a clean reconciliation', async () => {
  reconcile.mockResolvedValue({
    errors: 0,
    mismatched: 0,
    missingInStripe: 0,
    matched: 2,
  });
  expect(await GET({} as never)).toMatchObject({ matched: 2 });
});
