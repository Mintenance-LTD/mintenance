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
vi.mock('react-hot-toast', () => ({ default: toast }));
import { NotificationPreferencesForm } from '@/app/settings/notifications/components/NotificationPreferencesForm';
const prefs = {
  push_enabled: true,
  email_enabled: true,
  in_app_enabled: true,
  disabled_types: ['payment'],
  quiet_hours_start: null,
  quiet_hours_end: null,
  timezone: 'UTC',
};
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('blocks saving defaults after a load failure and allows a fresh retry', async () => {
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(response({}, 500))
    .mockResolvedValueOnce(response(prefs));
  render(<NotificationPreferencesForm />);
  await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: 'Save preferences' })).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Retry loading preferences' })
  );
  await screen.findByRole('button', { name: 'Save preferences' });
  expect(request).toHaveBeenCalledTimes(2);
});
it('sends the delivery preference contract with CSRF, preserves failed edits, and never offers protected event mutes', async () => {
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (_url, options) => {
      if (_url === '/api/csrf')
        return response({ token: 'synthetic-preference-csrf' });
      if (options?.method === 'PATCH')
        return response({ error: 'Save unavailable' }, 503);
      return response(prefs);
    });
  render(<NotificationPreferencesForm />);
  await screen.findByRole('button', { name: 'Save preferences' });
  expect(
    screen.queryByRole('checkbox', { name: 'Payment updates' })
  ).toBeNull();
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'Push notifications (mobile app)' })
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith('Save unavailable')
  );
  const call = request.mock.calls.find(
    ([, options]) => options?.method === 'PATCH'
  )!;
  expect(new Headers(call[1]?.headers).get('X-CSRF-Token')).toBe(
    'synthetic-preference-csrf'
  );
  expect(JSON.parse(call[1]!.body as string)).toMatchObject({
    push_enabled: false,
    disabled_types: [],
  });
  expect(
    (
      screen.getByRole('checkbox', {
        name: 'Push notifications (mobile app)',
      }) as HTMLInputElement
    ).checked
  ).toBe(false);
  expect(toast.success).not.toHaveBeenCalled();
  request.mockResolvedValue(response({ ...prefs, push_enabled: false }));
  fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));
  await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
});
it('does not show success for a malformed successful save response', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => {
    if (_url === '/api/csrf')
      return response({ token: 'synthetic-preference-csrf' });
    return response(options?.method === 'PATCH' ? {} : prefs);
  });
  render(<NotificationPreferencesForm />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Save preferences' })
  );
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(toast.success).not.toHaveBeenCalled();
});
