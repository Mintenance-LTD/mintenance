import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NotificationPreferencesScreen } from '../NotificationPreferencesScreen';
import LegacyNotificationSettings from '../../NotificationSettingsScreen';
const mockGet = jest.fn();
const mockPatch = jest.fn();
let mockUser: { id: string } | null = { id: 'synthetic-homeowner' };
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock('../../../components/shared', () => ({
  MintScreenBackBar: () => null,
}));
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
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
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockReset().mockResolvedValue(saved);
  mockPatch.mockReset().mockResolvedValue(saved);
  mockUser = { id: 'synthetic-homeowner' };
});
describe.each([
  ['current route', NotificationPreferencesScreen],
  ['legacy deep-link route', LegacyNotificationSettings],
] as const)('%s', (_name, Screen) => {
  it('blocks default overwrite after failed loading, then saves loaded values after retry', async () => {
    mockGet
      .mockRejectedValueOnce(new Error('Synthetic offline'))
      .mockResolvedValueOnce(saved);
    const view = render(<Screen />);
    await view.findByText('Try again');
    expect(view.queryByLabelText('Save notification preferences')).toBeNull();
    expect(mockPatch).not.toHaveBeenCalled();
    fireEvent.press(view.getByText('Try again'));
    fireEvent.press(
      await view.findByLabelText('Save notification preferences')
    );
    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/user/notification-preferences',
        saved
      )
    );
    expect(mockGet).toHaveBeenCalledWith('/api/user/notification-preferences');
  });

  it('hides old preferences immediately on sign-out and does not fetch or save', async () => {
    const view = render(<Screen />);
    await view.findByDisplayValue('22:00');
    mockUser = null;
    view.rerender(<Screen />);
    expect(view.queryByDisplayValue('22:00')).toBeNull();
    expect(view.queryByLabelText('Save notification preferences')).toBeNull();
    expect(
      view.getByText('Sign in to manage notification preferences.')
    ).toBeTruthy();
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('ignores old account results when the account changes during loading', async () => {
    const old = deferred<typeof saved>();
    mockGet
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce({ ...saved, quiet_hours_start: '20:00' });
    const view = render(<Screen />);
    mockUser = { id: 'second-account' };
    view.rerender(<Screen />);
    await view.findByDisplayValue('20:00');
    await act(async () => {
      old.resolve(saved);
    });
    expect(view.queryByDisplayValue('22:00')).toBeNull();
    expect(view.getByDisplayValue('20:00')).toBeTruthy();
  });

  it('suppresses obsolete save completion and allows the new account to save', async () => {
    const old = deferred<typeof saved>();
    mockPatch.mockReturnValueOnce(old.promise);
    const view = render(<Screen />);
    fireEvent.press(
      await view.findByLabelText('Save notification preferences')
    );
    expect(mockPatch).toHaveBeenCalledTimes(1);
    mockGet.mockResolvedValueOnce({ ...saved, quiet_hours_start: '20:00' });
    mockUser = { id: 'second-account' };
    view.rerender(<Screen />);
    await view.findByDisplayValue('20:00');
    await act(async () => {
      old.resolve(saved);
    });
    expect(alertSpy).not.toHaveBeenCalled();
    expect(view.getByDisplayValue('20:00')).toBeTruthy();
    fireEvent.press(view.getByLabelText('Save notification preferences'));
    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(2));
    expect(mockPatch).toHaveBeenLastCalledWith(
      '/api/user/notification-preferences',
      { ...saved, quiet_hours_start: '20:00' }
    );
  });
});
