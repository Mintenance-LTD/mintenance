// Regression: failed saves must not masquerade as persisted accessibility changes.
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSilverMode } from '../useSilverMode';
import { setSilverModeEnabled } from '../../theme/silverModeState';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'synthetic-homeowner' } }),
}));
const mockGet = jest.fn();
const mockPatch = jest.fn();
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));
jest.mock('../../utils/logger', () => ({ logger: { warn: jest.fn() } }));

describe('Settings audit: failed accessibility persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSilverModeEnabled(false);
    mockGet.mockResolvedValue({ silverMode: false });
    mockPatch.mockRejectedValue(new Error('Synthetic offline failure'));
  });

  it('retains the saved value and exposes a retryable error after a failed save', async () => {
    const first = renderHook(() => useSilverMode());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    await act(async () => {
      await expect(
        first.result.current.setSilverMode(true)
      ).resolves.toBeUndefined();
    });
    expect(first.result.current.silverMode).toBe(false);
    expect(first.result.current.error).toContain('not saved');
    expect(mockPatch).toHaveBeenCalledWith('/api/users/settings', {
      silverMode: true,
    });
    first.unmount();

    const reopened = renderHook(() => useSilverMode());
    await waitFor(() => expect(reopened.result.current.loading).toBe(false));
    expect(reopened.result.current.silverMode).toBe(false);
    reopened.unmount();
  });
});
