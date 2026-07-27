/* eslint-disable import/first --
 * jest.mock factories are hoisted above imports, so mocked bindings
 * must be imported after them.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

let mockUser: { id: string; role: string } | null = {
  id: 'h-1',
  role: 'homeowner',
};
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

import { mobileApiClient } from '../../../utils/mobileApiClient';
import { PhoneVerificationBanner } from '../PhoneVerificationBanner';

const mockGet = mobileApiClient.get as jest.Mock;

/**
 * The proactive nudge (mobile parity with web's VerificationBanner):
 * must appear ONLY for homeowners whose phone_verified is explicitly
 * false — never for contractors, never mid-load, never once verified —
 * and tapping it must open the verification modal.
 */

const renderBanner = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PhoneVerificationBanner />
    </QueryClientProvider>
  );
};

describe('PhoneVerificationBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'h-1', role: 'homeowner' };
    mockGet.mockResolvedValue({ profile: { phone_verified: false } });
  });

  it('shows for a homeowner whose phone is unverified', async () => {
    const { getByTestId } = renderBanner();
    await waitFor(() =>
      expect(getByTestId('phone-verification-banner')).toBeTruthy()
    );
    expect(mockGet).toHaveBeenCalledWith('/api/users/profile');
  });

  it('renders nothing once the phone is verified', async () => {
    mockGet.mockResolvedValue({ profile: { phone_verified: true } });
    const { queryByTestId } = renderBanner();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(queryByTestId('phone-verification-banner')).toBeNull();
  });

  it('renders nothing for contractors and never fetches', async () => {
    mockUser = { id: 'c-1', role: 'contractor' };
    const { queryByTestId } = renderBanner();
    expect(queryByTestId('phone-verification-banner')).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('renders nothing while the status is still loading', () => {
    // Query never resolves within this test — status is unknown.
    mockGet.mockReturnValue(new Promise(() => {}));
    const { queryByTestId } = renderBanner();
    expect(queryByTestId('phone-verification-banner')).toBeNull();
  });

  it('opens the verification modal on tap', async () => {
    const { getByTestId, getByText } = renderBanner();
    await waitFor(() =>
      expect(getByTestId('phone-verification-banner')).toBeTruthy()
    );
    fireEvent.press(getByTestId('phone-verification-banner'));
    await waitFor(() =>
      expect(getByText('Verify your phone number')).toBeTruthy()
    );
  });
});
