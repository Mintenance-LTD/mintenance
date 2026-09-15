import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
import { changeAccountPassword } from '@/lib/change-account-password';
const body = {
  currentPassword: 'SyntheticOld1!',
  newPassword: 'SyntheticNew2!',
  confirmPassword: 'SyntheticNew2!',
};
const op = 'fa410906-0000-4000-8000-000000000002';
const originalAlert = window.alert;
const originalPrompt = window.prompt;
beforeEach(() => {
  vi.clearAllMocks();
  window.alert = vi.fn();
  window.prompt = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
  window.alert = originalAlert;
  window.prompt = originalPrompt;
});
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
it('sends the current/new password with CSRF, then requests MFA only after the server requires it', async () => {
  let writes = 0;
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (url) => {
      if (url === '/api/csrf') return response({ token: 'synthetic-csrf' });
      return ++writes === 1
        ? response({ requiresMfa: true }, 403)
        : response({
            success: true,
            status: 'completed',
            requestId: op,
            message: 'Password changed. Sign in again.',
          });
    });
  vi.mocked(window.prompt).mockReturnValue('123456');
  expect(await changeAccountPassword(body)).toBe(true);
  const calls = request.mock.calls.filter(
    ([url]) => url === '/api/auth/change-password'
  );
  expect(calls).toHaveLength(2);
  expect(new Headers(calls[1][1]?.headers).get('X-CSRF-Token')).toBe(
    'synthetic-csrf'
  );
  expect(JSON.parse(calls[1][1]!.body as string)).toEqual({
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
    mfaCode: '123456',
    mfaMethod: 'totp',
  });
  expect(window.alert).toHaveBeenCalledWith(expect.stringContaining(op));
});
it('returns pending without a completed result or automatic password retry', async () => {
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      response(
        {
          success: false,
          status: 'pending',
          requestId: op,
          message: 'Cleanup pending',
        },
        202
      )
    );
  expect(await changeAccountPassword(body)).toBe(false);
  expect(request).toHaveBeenCalledTimes(1);
  expect(window.alert).toHaveBeenCalledWith(
    expect.stringContaining('Cleanup pending')
  );
});
it('preserves caller inputs on API failure and surfaces structured messages', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    response({ error: { message: 'Current password is incorrect' } }, 401)
  );
  expect(await changeAccountPassword(body)).toBe(false);
  expect(toast.error).toHaveBeenCalledWith('Current password is incorrect');
  expect(body.currentPassword).toBe('SyntheticOld1!');
  expect(window.alert).not.toHaveBeenCalled();
});
it('does not treat malformed successful responses as confirmation', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ success: true }));
  expect(await changeAccountPassword(body)).toBe(false);
  expect(window.alert).not.toHaveBeenCalled();
});
it('does not submit mismatched confirmation', async () => {
  const request = vi.spyOn(globalThis, 'fetch');
  expect(
    await changeAccountPassword({ ...body, confirmPassword: 'different' })
  ).toBe(false);
  expect(request).not.toHaveBeenCalled();
});
