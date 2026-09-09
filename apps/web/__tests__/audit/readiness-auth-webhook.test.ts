// @vitest-environment node
// Audit-only diagnostics; all database/provider boundaries are mocked.
import { SignJWT, generateKeyPair } from 'jose';
import { verifyJWT } from '@mintenance/auth';

const state = vi.hoisted(() => ({
  status: 'held',
  writes: [] as string[],
  from: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: state.from },
}));
vi.mock('@/lib/services/notifications/JobStakeholderNotifier', () => ({
  notifyStakeholders: vi.fn(),
}));
vi.mock('@/lib/services/stripe-webhook/invoice-payment-reconciliation', () => ({
  reconcileInvoicePayment: vi.fn(),
}));
import { handlePaymentIntentSucceeded } from '@/lib/services/stripe-webhook/payment-intent-handlers';

it('AUDIT: cookie HS256 verifier used by proxy rejects an otherwise valid ES256 mobile token', async () => {
  const { privateKey } = await generateKeyPair('ES256');
  const token = await new SignJWT({
    sub: 'synthetic-user',
    role: 'authenticated',
    session_id: 'synthetic-session',
  })
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);
  expect(
    await verifyJWT(token, 'Synthetic_App_Cookie_Secret_123!'.repeat(3))
  ).toBeNull();
});

it('preserves a concurrent release claim when processing a success webhook', async () => {
  state.status = 'held';
  state.writes = [];
  state.from.mockImplementation((table: string) => {
    let update: Record<string, unknown> | undefined;
    const predicates: Array<[string, unknown]> = [];
    const chain: any = {
      select: () => chain,
      eq: (key: string, value: unknown) => {
        predicates.push([key, value]);
        return chain;
      },
      in: (key: string, value: unknown[]) => {
        predicates.push([key, value]);
        return chain;
      },
      update: (value: Record<string, unknown>) => {
        update = value;
        return chain;
      },
      maybeSingle: async () => {
        // The SELECT snapshot sees held; release claims the row before UPDATE.
        state.status = 'release_pending';
        return {
          data: { id: 'synthetic-escrow', status: 'held', amount: 500 },
          error: null,
        };
      },
      single: async () => {
        if (table === 'escrow_transactions' && update) {
          const statusFilter = predicates.find(([key]) => key === 'status');
          const permitted =
            !statusFilter ||
            (Array.isArray(statusFilter[1])
              ? statusFilter[1].includes(state.status)
              : statusFilter[1] === state.status);
          if (permitted) {
            state.status = String(update.status);
            state.writes.push(state.status);
          }
          // Abort subsequent work after observing the real UPDATE predicate.
          return {
            data: null,
            error: { message: 'synthetic downstream stop' },
          };
        }
        return { data: null, error: null };
      },
    };
    return chain;
  });
  await expect(
    handlePaymentIntentSucceeded(
      {
        id: 'pi_synthetic',
        currency: 'gbp',
        amount: 50000,
        metadata: {},
      } as never,
      vi.fn()
    )
  ).rejects.toThrow();
  expect(state.status).toBe('release_pending');
  expect(state.writes).toEqual([]);
});

it('retries the webhook when the escrow lookup fails', async () => {
  state.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: null,
          error: { message: 'database unavailable' },
        }),
      }),
    }),
  });
  await expect(
    handlePaymentIntentSucceeded(
      {
        id: 'pi_synthetic',
        currency: 'gbp',
        amount: 50000,
        metadata: {},
      } as never,
      vi.fn()
    )
  ).rejects.toThrow('Failed to look up funded escrow transaction');
});
