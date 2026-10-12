import { useFinancialsData } from '../useFinancialsData';
const mockGet = jest.fn();
jest.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'payer' } }),
}));
jest.mock('../../../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => options,
}));

it('keeps unpaid attempts out of held and spent balances, and keeps releases pending in escrow', async () => {
  const created_at = new Date().toISOString();
  mockGet.mockResolvedValue({
    payments: [
      { id: 'held', amount: 3.52, status: 'held', created_at },
      { id: 'unpaid', amount: 2.66, status: 'pending', created_at },
      { id: 'releasing', amount: 1, status: 'release_pending', created_at },
      {
        id: 'released',
        amount: 2,
        status: 'completed',
        category: 'general',
        created_at,
      },
      { id: 'failed', amount: 8, status: 'failed', created_at },
    ],
  });
  const query = useFinancialsData() as unknown as {
    queryFn: () => Promise<unknown>;
  };
  expect(await query.queryFn()).toMatchObject({
    inEscrow: 4.52,
    totalSpent: 2,
    thisMonth: 2,
    categoryBreakdown: [{ amount: 2, percentage: 100 }],
  });
  expect(mockGet).toHaveBeenCalledWith('/api/homeowner/financials');
});
