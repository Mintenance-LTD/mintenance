// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminMfaSetup } from '../../app/admin/(auth)/login/AdminMfaSetup';
vi.mock('@/lib/hooks/useCSRF', () => ({ useCSRF: () => ({ csrfToken: 'test-csrf' }) }));
vi.mock('next/image', () => ({ default: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('shows a rejected code alongside verification and confirms successful setup explicitly', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ qrCode: 'data:image/png;base64,', secret: 'TEST', backupCodes: ['TESTCODE'] }) }).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Invalid verification code' }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
  vi.stubGlobal('fetch', fetchMock);
  const done = vi.fn();
  render(<AdminMfaSetup token='test-token' onComplete={done} />);
  fireEvent.click(screen.getByRole('button', { name: 'Set up two-factor authentication' }));
  fireEvent.click(await screen.findByLabelText('I have saved my backup codes'));
  fireEvent.change(screen.getByLabelText('Six-digit authenticator code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify and finish setup' }));
  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toBe('Invalid verification code');
  expect(alert.closest('section')?.getAttribute('aria-labelledby')).toBe('verify-title');
  fireEvent.click(screen.getByRole('button', { name: 'Verify and finish setup' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Two-factor authentication is ready'));
  expect(done).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Continue to sign in' }));
  expect(done).toHaveBeenCalledOnce();
});
