import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NotificationPreferencesScreen } from '../NotificationPreferencesScreen';
const mockGet = jest.fn();
const mockPatch = jest.fn();
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'synthetic-homeowner' } }),
}));
jest.mock('../../../components/shared', () => ({
  MintScreenBackBar: () => null,
}));
const saved = {
  push_enabled: false,
  email_enabled: false,
  sms_enabled: false,
  in_app_enabled: true,
  disabled_types: ['job_nearby'],
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  timezone: 'Europe/London',
};
beforeEach(() => {
  jest.clearAllMocks();
  mockPatch.mockResolvedValue(saved);
});
it('blocks default overwrite after failed loading, then saves loaded values after retry', async () => {
  mockGet
    .mockRejectedValueOnce(new Error('Synthetic offline'))
    .mockResolvedValueOnce(saved);
  const view = render(<NotificationPreferencesScreen />);
  await view.findByText('Try again');
  expect(view.queryByLabelText('Save notification preferences')).toBeNull();
  expect(mockPatch).not.toHaveBeenCalled();
  fireEvent.press(view.getByText('Try again'));
  await view.findByLabelText('Save notification preferences');
  fireEvent.press(view.getByLabelText('Save notification preferences'));
  await waitFor(() =>
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/user/notification-preferences',
      saved
    )
  );
  view.unmount();
});
