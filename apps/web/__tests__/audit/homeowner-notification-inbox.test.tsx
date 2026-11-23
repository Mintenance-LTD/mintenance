import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import NotificationsPage from '@/app/notifications/page';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  write: vi.fn(),
  confirm: vi.fn(),
}));
vi.unmock('@tanstack/react-query');
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { id: 'homeowner' }, loading: false }),
}));
vi.mock('@/app/dashboard/components/HomeownerPageWrapper', () => ({
  HomeownerPageWrapper: ({ children }: { children: React.ReactNode }) =>
    children,
}));
vi.mock('@/app/notifications/useNotificationsRealtime', () => ({
  useNotificationsRealtime: () => undefined,
}));
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: mocks.write }));
vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirm: () => mocks.confirm,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  delete document.documentElement.dataset.theme;
});

const cursor = {
  before: '2026-11-23T20:00:00+00:00',
  beforeId: '00000000-0000-4000-8000-000000000001',
};
const paymentReminder = {
  id: 'work-approval',
  title: 'Work approval reminder',
  message: 'Payment release is paused while the dispute is reviewed.',
  type: 'job_completed',
  action_url: '/jobs/current-job',
  action_status: 'no_longer_actionable',
  read: false,
  created_at: cursor.before,
};
const response = (body: unknown) => new Response(JSON.stringify(body));

function renderInbox(theme: string) {
  document.documentElement.dataset.theme = theme;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <NotificationsPage />
    </QueryClientProvider>
  );
}

it.each(['mint-editorial', 'default'])(
  'shows the stale reminder and loads the next page with the same cursor (%s)',
  async (theme) => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        response({
          notifications: [paymentReminder],
          unreadCount: 81,
          nextCursor: cursor,
        })
      )
      .mockResolvedValueOnce(
        response({
          notifications: [
            {
              ...paymentReminder,
              id: 'dispute-alert',
              title: 'Dispute submitted',
              type: 'payment',
              action_url: '/disputes/escrow-id',
              action_status: undefined,
            },
          ],
          unreadCount: 81,
          nextCursor: null,
        })
      );
    vi.stubGlobal('fetch', fetcher);
    mocks.write.mockResolvedValue(response({ success: true }));
    renderInbox(theme);
    expect(await screen.findByText('No longer actionable')).toBeVisible();
    expect(
      screen.getByText(/81 unread notification/, { exact: false })
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: 'Load older notifications' })
    );
    const viewDispute = await screen.findByText('View dispute');
    expect(fetcher).toHaveBeenLastCalledWith(
      '/api/notifications?' + new URLSearchParams({ inbox: '1', ...cursor }),
      expect.objectContaining({ cache: 'no-store' })
    );
    expect(screen.getByText('Work approval reminder')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Load older notifications' })
    ).toBeNull();
    fireEvent.click(viewDispute);
    expect(mocks.push).toHaveBeenCalledWith('/disputes/escrow-id');
    await waitFor(() =>
      expect(mocks.write).toHaveBeenCalledWith(
        '/api/notifications/dispute-alert/read?inbox=1',
        { method: 'POST' }
      )
    );
  }
);

it('keeps loaded notifications visible if loading an older page fails', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      response({
        notifications: [paymentReminder],
        unreadCount: 81,
        nextCursor: cursor,
      })
    )
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(
      response({ notifications: [], unreadCount: 81, nextCursor: null })
    );
  vi.stubGlobal('fetch', fetcher);
  renderInbox('mint-editorial');
  fireEvent.click(
    await screen.findByRole('button', { name: 'Load older notifications' })
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not load older notifications.'
  );
  expect(screen.getByText('Work approval reminder')).toBeVisible();
  fireEvent.click(
    screen.getByRole('button', { name: 'Load older notifications' })
  );
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
});
