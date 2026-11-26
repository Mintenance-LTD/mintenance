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
  urgency: 1,
  unassigned_report_age_days: null as number | null,
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
  window.history.replaceState(null, '', '/');
});
it('shows responsibility and view-only access without a follow-up editor', async () => {
  render(<Page />);
  await screen.findByText('Fix tap');
  expect(screen.getByText('Needs reassignment')).toBeInTheDocument();
  expect(screen.queryByText('Manage follow-up')).toBeNull();
  expect(screen.getByRole('link', { name: 'Review job' })).toHaveAttribute(
    'href',
    '/properties/home/repairs/job?from=queue'
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
    '/api/portfolio/queue?offset=0&limit=25&scope=mine&sort=priority',
    expect.anything()
  );
});
it('shows the age and missing assignment on a prioritised tenant report', async () => {
  fetcher.mockResolvedValue(
    response('team', [
      {
        ...item,
        id: 'report',
        kind: 'report',
        title: 'Damp and mould in a bedroom',
        status: 'new',
        urgency: 0,
        assignment_status: 'unassigned',
        unassigned_report_age_days: 32,
        can_manage_followup: true,
      },
    ])
  );
  render(<Page />);
  expect(
    await screen.findByText('Unassigned report · 32 days old')
  ).toHaveAttribute('data-priority', '0');
  expect(screen.getByRole('link', { name: 'Review report' })).toHaveAttribute(
    'href',
    '/maintenance/reports/report?from=action-queue'
  );
  expect(
    screen.getByRole('button', { name: 'Manage follow-up' })
  ).toBeVisible();
});
it('restores the unassigned filters, page and focus on the report', async () => {
  window.history.replaceState(
    null,
    '',
    '/properties/work-queue?scope=unassigned&priority=0&sort=due&offset=25#queue-report-report'
  );
  fetcher.mockResolvedValue(
    response('unassigned', [
      {
        ...item,
        id: 'report',
        kind: 'report',
        title: 'Mould report',
        urgency: 0,
      },
    ])
  );
  render(<Page />);
  const review = await screen.findByRole('link', { name: 'Review report' });
  expect(screen.getByLabelText('Team queue')).toHaveValue('unassigned');
  expect(screen.getByLabelText('Priority')).toHaveValue('0');
  await waitFor(() => expect(review).toHaveFocus());
  expect(screen.getByText('Page 2')).toBeInTheDocument();
  expect(review).toHaveAttribute(
    'href',
    '/maintenance/reports/report?scope=unassigned&priority=0&sort=due&offset=25&from=action-queue'
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

it('requests global priority and sort filters from the first page', async () => {
  render(<Page />);
  await screen.findByText('Fix tap');
  fireEvent.change(screen.getByLabelText('Priority'), {
    target: { value: '0' },
  });
  await waitFor(() =>
    expect(fetcher).toHaveBeenLastCalledWith(
      '/api/portfolio/queue?offset=0&limit=25&scope=team&priority=0&sort=priority',
      expect.anything()
    )
  );
  fireEvent.change(screen.getByLabelText('Sort by'), {
    target: { value: 'due' },
  });
  await waitFor(() =>
    expect(fetcher).toHaveBeenLastCalledWith(
      '/api/portfolio/queue?offset=0&limit=25&scope=team&priority=0&sort=due',
      expect.anything()
    )
  );
});
