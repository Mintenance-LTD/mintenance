import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell';
const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('shows the actual assigned dispute notification and case link', async () => {
  fetchMock.mockImplementation(
    async (url: string) =>
      new Response(
        JSON.stringify(
          url.includes('pending-verifications')
            ? { count: 0 }
            : {
                notifications: [
                  {
                    id: 'notice',
                    type: 'dispute',
                    title: 'Test dispute assigned',
                    message: 'Review the statement',
                    action_url: '/admin/disputes/payment',
                    read: false,
                    created_at: '2026-11-17T00:00:00Z',
                  },
                ],
              }
        )
      )
  );
  render(<AdminNotificationBell userId='admin' />);
  fireEvent.click(screen.getByRole('button', { name: 'Admin Notifications' }));
  expect(await screen.findByText('Test dispute assigned')).toBeVisible();
  expect(
    screen.getByRole('link', { name: /Test dispute assigned/ })
  ).toHaveAttribute('href', '/admin/disputes/payment');
  expect(screen.queryByText('No notifications')).toBeNull();
});
it('shows a retryable error when the actual feed fails instead of claiming an empty inbox', async () => {
  fetchMock.mockResolvedValue(new Response('{}', { status: 500 }));
  render(<AdminNotificationBell userId='admin' />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'could not be refreshed'
  );
  expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible();
});
