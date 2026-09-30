import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MFASecurityScreen } from '../MFASecurityScreen';

const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'synthetic-account' } }),
}));
jest.mock('../../../components/shared', () => ({ ScreenHeader: () => null }));

function screen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MFASecurityScreen />
    </QueryClientProvider>
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ success: true, data: { enabled: false } });
});
it('uses the server envelope and verifies enrollment before enabled status', async () => {
  mockPost.mockResolvedValueOnce({
    success: true,
    data: {
      secret: 'SYNTHETICSECRET',
      qrCode: '',
      backupCodes: ['synthetic-recovery'],
    },
  });
  const view = screen();
  await view.findByText('Disabled');
  fireEvent(
    view.getByLabelText('Two-factor authentication'),
    'valueChange',
    true
  );
  await view.findByText('SYNTHETICSECRET');
  expect(mockPost).toHaveBeenCalledWith('/api/auth/mfa/enroll/totp', {});
  mockPost.mockResolvedValueOnce({ success: true });
  mockGet.mockResolvedValue({ success: true, data: { enabled: true } });
  fireEvent.changeText(view.getByLabelText('Authenticator code'), '123456');
  fireEvent.press(view.getByText('Verify and enable MFA'));
  await waitFor(() =>
    expect(mockPost).toHaveBeenCalledWith('/api/auth/mfa/verify-enrollment', {
      token: '123456',
    })
  );
  await view.findByText('Enabled');
  view.unmount();
});
it('does not expose an enabled/disabled toggle after a failed status read', async () => {
  mockGet.mockRejectedValue(new Error('Synthetic offline'));
  const view = screen();
  await view.findByText('Unable to load your security settings.');
  expect(view.queryByLabelText('Two-factor authentication')).toBeNull();
  expect(mockPost).not.toHaveBeenCalled();
  view.unmount();
});
it('requires password confirmation and sends it to disable', async () => {
  mockGet.mockResolvedValue({ success: true, data: { enabled: true } });
  mockPost.mockResolvedValue({ success: true });
  const view = screen();
  await view.findByText('Enabled');
  fireEvent(
    view.getByLabelText('Two-factor authentication'),
    'valueChange',
    false
  );
  expect(mockPost).not.toHaveBeenCalled();
  fireEvent.changeText(
    view.getByLabelText('Current password'),
    'synthetic-password'
  );
  fireEvent.press(view.getByText('Confirm disable'));
  await waitFor(() =>
    expect(mockPost).toHaveBeenCalledWith('/api/auth/mfa/disable', {
      password: 'synthetic-password',
    })
  );
  view.unmount();
});
