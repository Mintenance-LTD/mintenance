import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { HomeownerSetupScreen } from '../auth/HomeownerSetupScreen';
const mockPut = jest.fn();
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: { put: (...args: unknown[]) => mockPut(...args) },
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { firstName: 'Test', lastName: 'User' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
beforeEach(() => mockPut.mockReset());
it('retains selections after a failed save and dismisses only after a successful retry', async () => {
  mockPut.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
  const complete = jest.fn();
  const screen = render(<HomeownerSetupScreen onComplete={complete} />);
  fireEvent.press(screen.getByLabelText('Property type: House'));
  fireEvent.press(screen.getByLabelText('Top concern: Plumbing'));
  fireEvent.press(screen.getByLabelText('Finish setup'));
  await waitFor(() =>
    expect(screen.getByText(/Your choices could not be saved/)).toBeTruthy()
  );
  expect(complete).not.toHaveBeenCalled();
  expect(
    screen.getByLabelText('Property type: House').props.accessibilityState
      .checked
  ).toBe(true);
  fireEvent.press(screen.getByLabelText('Retry saving setup'));
  await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
  expect(mockPut).toHaveBeenLastCalledWith('/api/users/profile', {
    propertyType: 'house',
    concernTags: ['Plumbing'],
  });
});
it('allows an explicit skip after failure', async () => {
  mockPut.mockRejectedValue(new Error('offline'));
  const complete = jest.fn();
  const screen = render(<HomeownerSetupScreen onComplete={complete} />);
  fireEvent.press(screen.getByLabelText('Finish setup'));
  await waitFor(() =>
    expect(screen.getByText('Skip setup for now')).toBeTruthy()
  );
  fireEvent.press(screen.getByText('Skip setup for now'));
  expect(complete).toHaveBeenCalledTimes(1);
});
it('prevents duplicate submissions while saving', async () => {
  let resolve!: (value: unknown) => void;
  mockPut.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    })
  );
  const complete = jest.fn();
  const screen = render(<HomeownerSetupScreen onComplete={complete} />);
  const button = screen.getByLabelText('Finish setup');
  fireEvent.press(button);
  fireEvent.press(button);
  expect(mockPut).toHaveBeenCalledTimes(1);
  await act(async () => {
    resolve({});
  });
  expect(complete).toHaveBeenCalledTimes(1);
});
