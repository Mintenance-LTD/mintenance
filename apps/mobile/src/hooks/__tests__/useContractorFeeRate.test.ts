import { renderHook } from '@testing-library/react-native';
import { useContractorFeeRate } from '../useContractorFeeRate';
import { DEFAULT_PLATFORM_FEE_RATE } from '@mintenance/shared';

/**
 * The bid screen used to hardcode a 5% platform fee for every contractor.
 * This hook makes it tier-driven, reading the server-resolved rate from
 * /api/subscriptions/status. These tests pin the resolution + the
 * conservative fallback.
 */

let mockUser: { id?: string; role?: string } | null = {
  id: 'c-1',
  role: 'contractor',
};
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

let mockQuery: { data?: { platformFeeRate?: number }; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
};
jest.mock('../../screens/subscription/queries', () => ({
  useSubscriptionStatusQuery: () => mockQuery,
}));

describe('useContractorFeeRate', () => {
  beforeEach(() => {
    mockUser = { id: 'c-1', role: 'contractor' };
    mockQuery = { data: undefined, isLoading: false };
  });

  it('returns the server-resolved rate for a founding member (5%)', () => {
    mockQuery = { data: { platformFeeRate: 0.05 }, isLoading: false };
    const { result } = renderHook(() => useContractorFeeRate());
    expect(result.current.rate).toBe(0.05);
  });

  it('returns each tier rate the server sends', () => {
    for (const rate of [0.05, 0.08, 0.12]) {
      mockQuery = { data: { platformFeeRate: rate }, isLoading: false };
      const { result } = renderHook(() => useContractorFeeRate());
      expect(result.current.rate).toBe(rate);
    }
  });

  it('falls back to the Basic default while the rate is loading', () => {
    mockQuery = { data: undefined, isLoading: true };
    const { result } = renderHook(() => useContractorFeeRate());
    expect(result.current.rate).toBe(DEFAULT_PLATFORM_FEE_RATE);
    expect(result.current.isLoading).toBe(true);
  });

  it('falls back to the default when the field is absent', () => {
    mockQuery = { data: {}, isLoading: false };
    const { result } = renderHook(() => useContractorFeeRate());
    expect(result.current.rate).toBe(DEFAULT_PLATFORM_FEE_RATE);
  });
});
