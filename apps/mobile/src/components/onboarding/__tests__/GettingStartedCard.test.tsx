import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GettingStartedCard } from '../GettingStartedCard';
const mockNavigate = jest.fn();
let mockAccount = 'owner-a';
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: mockAccount } }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockAccount = 'owner-a';
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
});
it('opens guides and keeps them reachable without an onboarding gate', async () => {
  const ui = render(<GettingStartedCard />);
  fireEvent.press(await ui.findByLabelText('Open app guides'));
  expect(mockNavigate).toHaveBeenCalledWith('ProfileTab', {
    screen: 'GettingStarted',
  });
});
it('dismisses immediately and stays dismissed after remount for this account', async () => {
  const ui = render(<GettingStartedCard />);
  fireEvent.press(await ui.findByLabelText('Dismiss dashboard guide'));
  expect(ui.queryByText('App guides')).toBeNull();
  await waitFor(() =>
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'dashboard_guide_dismissed:v1:owner-a',
      '1'
    )
  );
  ui.unmount();
  jest.mocked(AsyncStorage.getItem).mockResolvedValue('1');
  const next = render(<GettingStartedCard />);
  await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2));
  expect(next.queryByText('App guides')).toBeNull();
});
it('scopes dismissal to the account and ignores late storage responses', async () => {
  let resolve!: (value: string | null) => void;
  jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    })
  );
  const ui = render(<GettingStartedCard />);
  mockAccount = 'owner-b';
  ui.rerender(<GettingStartedCard />);
  await ui.findByText('App guides');
  resolve(null);
  fireEvent.press(ui.getByLabelText('Dismiss dashboard guide'));
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    'dashboard_guide_dismissed:v1:owner-b',
    '1'
  );
});
it('keeps guidance hidden when optional storage cannot be read', async () => {
  jest
    .mocked(AsyncStorage.getItem)
    .mockRejectedValue(new Error('storage unavailable'));
  const ui = render(<GettingStartedCard />);
  await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
  expect(ui.queryByText('App guides')).toBeNull();
});
