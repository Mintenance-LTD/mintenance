import { act, renderHook } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: mocks.fetch }));
import { useDisputeActions } from '@/app/admin/disputes/components/useDisputeActions';

const action = {
  kind: 'hold' as const,
  body: { escrowId: 'synthetic-escrow', reason: 'Synthetic hold reason' },
};
beforeEach(() => vi.clearAllMocks());
it('allows one outstanding action even before the loading state renders', async () => {
  let finish!: (response: Response) => void;
  mocks.fetch.mockReturnValue(
    new Promise<Response>((resolve) => {
      finish = resolve;
    })
  );
  const onConfirmed = vi.fn();
  const { result } = renderHook(() =>
    useDisputeActions({ onConfirmed, onError: vi.fn() })
  );
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.submit(action);
    void result.current.submit(action);
  });
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish(
      new Response(
        JSON.stringify({ success: true, escrowId: action.body.escrowId })
      )
    );
    await pending;
  });
  expect(onConfirmed).toHaveBeenCalledTimes(1);
});
it('does not treat an ordinary forbidden response as an MFA challenge', async () => {
  mocks.fetch.mockResolvedValue(
    new Response(JSON.stringify({ error: 'Access revoked' }), { status: 403 })
  );
  const onError = vi.fn();
  const { result } = renderHook(() =>
    useDisputeActions({ onConfirmed: vi.fn(), onError })
  );
  await act(() => result.current.submit(action));
  expect(result.current.requiresVerification).toBe(false);
  expect(onError).toHaveBeenCalledWith('Access revoked');
});
it.each([{ success: true, escrowId: 'different-escrow' }, {}])(
  'rejects unverified hold responses',
  async (body) => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify(body)));
    const onConfirmed = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useDisputeActions({ onConfirmed, onError })
    );
    await act(() => result.current.submit(action));
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  }
);
