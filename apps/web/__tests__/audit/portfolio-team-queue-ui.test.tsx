import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Page from '@/app/properties/work-queue/page';
vi.mock('@/components/property-operations/OperationsPage', () => ({
  OperationsPage: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));
vi.mock('@/app/properties/work-queue/PortfolioReport', () => ({
  PortfolioReport: () => null,
}));
vi.mock('@/app/properties/work-queue/FollowupForm', () => ({
  FollowupForm: () => <p>Follow-up editor</p>,
}));
const fetcher = vi.fn();
const item = {
  id: 'job',
  kind: 'job',
  property_id: 'home',
  property_name: 'Test property',
  title: 'Fix tap',
  next_action: 'Review progress',
  due_at: null,
  can_open_job: false,
  can_manage_followup: false,
  assigned_to: null,
  assignee_name: null,
  assignment_status: 'needs_reassignment',
};
const response = (scope = 'team', items = [item], hasMore = false) => ({
  ok: true,
  json: async () => ({
    scope,
    items,
    total: items.length,
    overdue: 0,
    hasMore,
  }),
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', fetcher);
  fetcher.mockResolvedValue(response());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('shows responsibility and view-only access without a follow-up editor', async () => {
  render(<Page />);
  await screen.findByText('Fix tap');
  expect(
    screen.getByText('Responsible: Needs reassignment')
  ).toBeInTheDocument();
  expect(screen.queryByText('Manage follow-up')).toBeNull();
  expect(screen.getByRole('link', { name: 'Review job' })).toHaveAttribute(
    'href',
    '/properties/home'
  );
});
it('requests a server-filtered first page and clears the previous editor', async () => {
  fetcher.mockResolvedValue(
    response(
      'team',
      [{ ...item, can_manage_followup: true, assignee_name: 'Alex Manager' }],
      true
    )
  );
  render(<Page />);
  fireEvent.click(await screen.findByText('Manage follow-up'));
  expect(screen.getByText('Follow-up editor')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() =>
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining('offset=25'),
      expect.anything()
    )
  );
  fetcher.mockResolvedValue(response('mine', []));
  fireEvent.change(screen.getByLabelText('Team queue'), {
    target: { value: 'mine' },
  });
  await screen.findByText(/No follow-ups are assigned to you/);
  expect(screen.queryByText('Follow-up editor')).toBeNull();
  expect(fetcher).toHaveBeenLastCalledWith(
    '/api/portfolio/queue?offset=0&limit=25&scope=mine',
    expect.anything()
  );
});
it('rejects a response for the wrong scope instead of showing an unfiltered queue', async () => {
  render(<Page />);
  await screen.findByText('Fix tap');
  fireEvent.change(screen.getByLabelText('Team queue'), {
    target: { value: 'mine' },
  });
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'selected queue could not be confirmed'
  );
  expect(screen.queryByText('Fix tap')).toBeNull();
});
it('ignores a late previous-scope response', async () => {
  let resolve!: (value: unknown) => void;
  fetcher.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    })
  );
  render(<Page />);
  fetcher.mockResolvedValue(response('mine', []));
  fireEvent.change(screen.getByLabelText('Team queue'), {
    target: { value: 'mine' },
  });
  await screen.findByText(/No follow-ups are assigned to you/);
  resolve(response());
  await waitFor(() => expect(screen.queryByText('Fix tap')).toBeNull());
});
