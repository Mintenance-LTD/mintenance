import { renderHook, waitFor } from '@testing-library/react-native';
import { useOnboardingAudience } from '../useOnboardingAudience';
import { mobileApiClient } from '../../utils/mobileApiClient';
let mockUser = { id: 'one', role: 'contractor' };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: jest.fn() },
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 'one', role: 'contractor' };
});
it.each([
  [[], 'contractor'],
  [
    [{ organization_type: 'contractor_company', myRole: 'member' }],
    'team-member',
  ],
  [
    [
      { organization_type: 'contractor_company', myRole: 'owner' },
      { organization_type: 'contractor_company', myRole: 'member' },
    ],
    'contractor',
  ],
  [[{ organization_type: 'portfolio', myRole: 'member' }], 'contractor'],
])('uses company membership to suggest %s', async (organizations, expected) => {
  (mobileApiClient.get as jest.Mock).mockResolvedValue({ organizations });
  const { result } = renderHook(() => useOnboardingAudience());
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.audience).toBe(expected);
});
it('does not assume business ownership when membership lookup fails', async () => {
  (mobileApiClient.get as jest.Mock).mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useOnboardingAudience());
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.audience).toBeNull();
});
