import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ toast }));
vi.mock('@/app/dashboard/components/HomeownerPageWrapper', () => ({
  HomeownerPageWrapper: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, variant: _variant, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock('@/components/ui/Card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/ui/Input', () => ({
  Input: (props: any) => <input {...props} />,
}));
vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null),
}));
vi.mock('next/image', () => ({ default: (props: any) => <img {...props} /> }));
import MFASettingsPage from '@/app/settings/security/mfa/page';
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const statusBody = {
  success: true,
  data: {
    enabled: false,
    method: null,
    enrolledAt: null,
    phoneNumber: null,
    backupCodesCount: 0,
    trustedDevicesCount: 0,
  },
};
beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('does not show disabled or permit enrollment when status cannot be loaded', async () => {
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(response({}, 500))
    .mockResolvedValueOnce(response(statusBody));
  render(<MFASettingsPage />);
  await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: 'Enable MFA' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry MFA status' }));
  await screen.findByRole('button', { name: 'Enable MFA' });
});
it('uses the actual CSRF token contract for enrollment and verification, retaining a rejected code', async () => {
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (url) => {
      if (url === '/api/csrf') return response({ token: 'synthetic-mfa-csrf' });
      if (url === '/api/auth/mfa/enroll/totp')
        return response({
          success: true,
          data: {
            secret: 'SYNTHETIC',
            qrCode: 'data:image/png;base64,AA==',
            backupCodes: ['synthetic-backup'],
          },
        });
      if (url === '/api/auth/mfa/verify-enrollment')
        return response({ error: 'Invalid verification code' }, 400);
      return response(statusBody);
    });
  render(<MFASettingsPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Enable MFA' }));
  const verify = await screen.findByRole('button', { name: 'Verify' });
  const input = document.getElementById('verificationCode')!;
  fireEvent.change(input, { target: { value: '123456' } });
  fireEvent.click(verify);
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith('Invalid verification code')
  );
  const writes = request.mock.calls.filter(
    ([, options]) => options?.method === 'POST'
  );
  expect(writes).toHaveLength(2);
  for (const [, options] of writes)
    expect(new Headers(options?.headers).get('X-CSRF-Token')).toBe(
      'synthetic-mfa-csrf'
    );
  expect((input as HTMLInputElement).value).toBe('123456');
  expect(toast.success).not.toHaveBeenCalledWith('MFA enabled successfully!');
});
