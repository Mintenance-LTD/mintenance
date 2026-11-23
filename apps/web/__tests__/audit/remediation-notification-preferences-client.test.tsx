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

it('shows the selected timezone by the hours and blocks either incomplete time', async () => {
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => response(prefs));
  render(<NotificationPreferencesForm />);
  const save = await screen.findByRole('button', { name: 'Save preferences' });
  const start = screen.getByLabelText('Start');
  const end = screen.getByLabelText('End');
  fireEvent.change(screen.getByLabelText('Timezone'), {
    target: { value: 'Europe/London' },
  });
  expect(screen.getByText('Times use Europe/London.')).toBeVisible();
  expect(start).toHaveAccessibleDescription('Times use Europe/London.');
  fireEvent.change(start, { target: { value: '22:00' } });
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Enter both quiet hours times or leave both blank.'
  );
  expect(end).toHaveAttribute('aria-invalid', 'true');
  expect(save).toBeDisabled();
  fireEvent.click(save);
  expect(request).toHaveBeenCalledTimes(1);
  fireEvent.change(end, { target: { value: '07:00' } });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(save).toBeEnabled();
  fireEvent.change(start, { target: { value: '' } });
  expect(start).toHaveAttribute('aria-invalid', 'true');
  expect(save).toBeDisabled();
  fireEvent.change(end, { target: { value: '' } });
  expect(save).toBeEnabled();
});

it('explains protected payment events and preserves the old manual release mute', async () => {
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (url, options) => {
      if (url === '/api/csrf')
        return response({ token: 'synthetic-preference-csrf' });
      return response(
        options?.method === 'PATCH'
          ? prefs
          : { ...prefs, disabled_types: ['escrow_released'] }
      );
    });
  render(<NotificationPreferencesForm />);
  const manual = await screen.findByRole('checkbox', {
    name: 'Manual payment release (contractor)',
  });
  expect(manual).not.toBeChecked();
  expect(
    screen.getByRole('checkbox', {
      name: 'Automatic payment release (homeowner and contractor)',
    })
  ).toBeChecked();
  expect(screen.getByText('Protected from event mutes')).toBeVisible();
  expect(
    screen.getByText(/Payment confirmations, escrow funding/)
  ).toHaveTextContent('enabled in-app and mobile push');
  fireEvent.click(manual);
  expect(manual).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));
  await waitFor(() => {
    const patch = request.mock.calls.find(
      ([, options]) => options?.method === 'PATCH'
    );
    expect(patch).toBeDefined();
    expect(JSON.parse(patch![1]!.body as string).disabled_types).toEqual([]);
  });
});
