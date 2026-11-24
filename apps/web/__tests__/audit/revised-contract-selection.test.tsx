import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useContractData } from '@/app/jobs/[id]/components/contract/useContractData';

vi.mock('@/lib/hooks/useCSRF', () => ({
  useCSRF: () => ({ csrfToken: null }),
}));
vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirm: () => vi.fn(),
}));

const exact = { id: 'contract', quoteId: 'applied-quote', version: 2 };
const revised = {
  id: 'contract',
  quote_id: 'applied-quote',
  contract_version: 2,
  status: 'draft',
  amount: 120,
};
const unrelated = { ...revised, id: 'other', amount: 500 };
const old = {
  ...revised,
  quote_id: 'old-quote',
  contract_version: 1,
  amount: 100,
};

function serve(contracts: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ contracts }),
    })
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each(['homeowner', 'contractor'])(
  'loads the exact revised draft for %s even if a different agreement appears first',
  async (role) => {
    serve([unrelated, old, revised]);
    const { result, unmount } = renderHook(() =>
      useContractData('job', role, exact)
    );
    await waitFor(() => expect(result.current.contract).toEqual(revised));
    unmount();
    const refreshed = renderHook(() => useContractData('job', role, exact));
    await waitFor(() =>
      expect(refreshed.result.current.contract).toEqual(revised)
    );
  }
);

it('does not fall back to a different revision of the same agreement', async () => {
  serve([old]);
  const { result } = renderHook(() =>
    useContractData('job', 'homeowner', exact)
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.contract).toBeNull();
});
