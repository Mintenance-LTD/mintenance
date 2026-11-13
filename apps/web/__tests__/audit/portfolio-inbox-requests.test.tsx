import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { PortfolioInboxClient } from '@/app/portfolio/portfolio-inbox-client';

const fetcher = vi.fn();
const user = { id: 'user', name: 'Test User', email: 'test@example.test' };
const ticket = (id: string, status = 'open') => ({
  id,
  title: id,
  description: `${id} detail`,
  status,
  priority: 'medium',
  category: 'general',
  created_at: '2026-01-01T00:00:00Z',
});
const response = (data: unknown) => ({ ok: true, json: async () => data });
beforeEach(() => {
  vi.stubGlobal('fetch', fetcher);
  fetcher.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setup(detail?: (id: string) => unknown) {
  fetcher.mockImplementation((url: string) => {
    if (url === '/api/portfolio/access')
      return Promise.resolve(response({ allowed: true }));
    if (url === '/api/portfolio/properties')
      return Promise.resolve(response({ properties: [] }));
    if (url.includes('?'))
      return Promise.resolve(
        response({
          orgId: 'org',
          tickets: url.includes('status=closed')
            ? [ticket('Closed job', 'closed')]
            : [ticket('First job'), ticket('Second job')],
        })
      );
    const id = url.split('/').pop()!;
    return (
      detail?.(id) ||
      Promise.resolve(response({ ticket: ticket(id), updates: [] }))
    );
  });
}
it('refetches the server list when filtering, including tickets outside the initial page', async () => {
  setup();
  render(<PortfolioInboxClient user={user} />);
  await screen.findByRole('button', { name: /First job/ });
  fireEvent.change(screen.getByLabelText('Status filter'), {
    target: { value: 'closed' },
  });
  await screen.findByRole('button', { name: /Closed job/ });
  expect(fetcher).toHaveBeenCalledWith(
    '/api/portfolio/tickets?limit=50&status=closed',
    expect.anything()
  );
});
it('ignores late detail from the previously selected ticket', async () => {
  let finish!: (value: unknown) => void;
  setup((id) =>
    id === 'First job'
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : undefined
  );
  render(<PortfolioInboxClient user={user} />);
  fireEvent.click(await screen.findByRole('button', { name: /Second job/ }));
  await screen.findByText('Second job detail');
  await act(async () => {
    finish(response({ ticket: ticket('First job'), updates: [] }));
  });
  expect(screen.queryByText('First job detail')).not.toBeInTheDocument();
  expect(screen.getByText('Second job detail')).toBeInTheDocument();
});
it('checks access again and clears private data when the account changes', async () => {
  setup();
  const view = render(<PortfolioInboxClient user={user} />);
  await screen.findByText('First job detail');
  fetcher.mockResolvedValue(response({ allowed: false }));
  view.rerender(<PortfolioInboxClient user={{ ...user, id: 'other' }} />);
  await screen.findByText('Portfolio Mode Locked');
  expect(screen.queryByText('First job detail')).not.toBeInTheDocument();
  await waitFor(() =>
    expect(
      fetcher.mock.calls.filter(([url]) => url === '/api/portfolio/access')
    ).toHaveLength(2)
  );
});
