import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ReportConversation } from '@/app/maintenance/reports/ReportConversation';
import CasePage from '@/app/maintenance/reports/[id]/page';
import { TenantReportsClient } from '@/app/landlord/reports/TenantReportsClient';
import { MintEditorialTenantReports } from '@/app/landlord/reports/MintEditorialTenantReports';
vi.mock('@/app/maintenance/reports/ReportExtras', () => ({
  ReportExtras: () => null,
}));
vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'x-csrf-token': 'test' }),
}));
const fetcher = vi.fn();
const historyData = (pageOffset = 0) => ({
  status: 'acknowledged',
  role: 'manager',
  pageOffset,
  hasMore: pageOffset < 50,
  summary: {
    category: 'plumbing',
    description: 'Original tap leak',
    created_at: '2026-07-01T23:30:00Z',
  },
  messages: [
    {
      id: 'message',
      author_role: 'system',
      body: 'Report status changed to acknowledged.',
      created_at: '2026-07-02T09:00:00Z',
    },
  ],
});
const response = (data: unknown) => ({ ok: true, json: async () => data });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', fetcher);
  fetcher.mockResolvedValue(response(historyData()));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
});
it('shows original context, recorded status history and UK dates', async () => {
  render(<ReportConversation reportId='first' />);
  await screen.findByText('Original tap leak');
  expect(screen.getByText(/Submitted 02\/07\/2026, 00:30/)).toBeInTheDocument();
  expect(screen.getByText('Status update')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Back to action queue' })
  ).toHaveAttribute('href', '/properties/work-queue');
});
it('shows the resident confirmed visit times and repair milestones without a job link', async () => {
  fetcher.mockResolvedValue(
    response({
      ...historyData(),
      role: 'resident',
      status: 'converted',
      repairProgress: {
        createdAt: '2026-11-24T12:00:00Z',
        confirmedVisit: {
          date: '2026-12-01',
          start: '09:00:00',
          end: '10:00:00',
        },
        startedAt: '2026-12-01T09:00:00Z',
        completedAt: '2026-12-01T10:00:00Z',
        visitUnavailable: false,
      },
    })
  );
  render(<ReportConversation reportId='first' />);
  const progress = await screen.findByRole('region', {
    name: 'Repair progress',
  });
  expect(progress).toHaveTextContent('Job created');
  expect(progress).toHaveTextContent(/1 December 2026.*09:00.*10:00 UK time/);
  expect(progress).toHaveTextContent('Work completed');
  expect(progress.querySelector('a')).toBeNull();
});
it.each([
  [
    'tenant-reports',
    'Back to tenant reports',
    '/landlord/reports?reportId=first',
  ],
  ['emergencies', 'Back to emergency reports', '/maintenance/emergencies'],
  [
    'https://elsewhere.invalid',
    'Back to action queue',
    '/properties/work-queue',
  ],
])(
  'returns staff to an approved list for source %s',
  async (from, label, href) => {
    render(
      await CasePage({
        params: Promise.resolve({ id: 'first' }),
        searchParams: Promise.resolve({ from }),
      })
    );
    expect(await screen.findByRole('link', { name: label })).toHaveAttribute(
      'href',
      href
    );
  }
);
it('shows residents a public next step for a new case without staff details', async () => {
  fetcher.mockResolvedValue(
    response({
      ...historyData(),
      status: 'new',
      role: 'resident',
      landlord_notes: 'Private landlord note',
      waiting_for: 'Private waiting reason',
      assignee_name: 'Private staff name',
      staffFollowup: {
        propertyId: 'property',
        assigneeName: 'Private staff name',
        canManage: true,
        needsReassignment: false,
      },
    })
  );
  render(<ReportConversation reportId='first' origin='tenant-reports' />);
  expect(
    await screen.findByRole('region', { name: 'Next step' })
  ).toHaveTextContent('Waiting for the property team to review.');
  expect(
    screen.queryByText(
      /Private landlord note|Private waiting reason|Private staff name/
    )
  ).toBeNull();
  expect(
    screen.queryByRole('link', { name: 'Back to tenant reports' })
  ).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledWith(
    expect.stringMatching(/^\/api\/report-conversation\?/),
    expect.objectContaining({ cache: 'no-store' })
  );
});
it('shows responsibility and the follow-up editor to the owner and restores the originating queue', async () => {
  fetcher
    .mockResolvedValueOnce(
      response({
        ...historyData(),
        status: 'new',
        staffFollowup: {
          propertyId: 'property',
          assigneeName: 'Alex Manager',
          canManage: true,
          needsReassignment: false,
        },
      })
    )
    .mockResolvedValueOnce(
      response({
        followup: {
          revision: 1,
          assigned_to: 'manager',
          due_at: null,
          waiting_for: 'manager',
        },
        people: [{ id: 'owner', first_name: 'Test', last_name: 'Owner' }],
        updates: [],
        hasEligibleManager: false,
        currentUserId: 'owner',
      })
    );
  render(
    await CasePage({
      params: Promise.resolve({ id: 'first' }),
      searchParams: Promise.resolve({
        from: 'action-queue',
        scope: 'unassigned',
        priority: '0',
        offset: '25',
      }),
    })
  );
  expect(await screen.findByText('Alex Manager')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Back to action queue' })
  ).toHaveAttribute(
    'href',
    '/properties/work-queue?scope=unassigned&priority=0&offset=25#queue-report-first'
  );
  fireEvent.click(screen.getByText('Manage follow-up'));
  expect(
    await screen.findByText('No eligible manager for this property')
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'People and access' })
  ).toHaveAttribute('href', '/properties/property?tab=manage&manage=people');
});
it('uses the returned latest page for subsequent older-page navigation', async () => {
  fetcher.mockImplementation((url: string) =>
    Promise.resolve(
      response(
        historyData(
          url.includes('latest=true') ? 50 : url.includes('offset=25') ? 25 : 0
        )
      )
    )
  );
  render(<ReportConversation reportId='first' />);
  fireEvent.click(await screen.findByText('Latest updates'));
  await screen.findByText('Page 3');
  fireEvent.click(screen.getByText('Older updates'));
  await screen.findByText('Page 2');
  expect(fetcher).toHaveBeenLastCalledWith(
    expect.stringContaining('offset=25&latest=false'),
    expect.anything()
  );
});
it('shows the assigned manager their next step without exposing the owner editor', async () => {
  fetcher.mockResolvedValue(
    response({
      ...historyData(),
      status: 'new',
      staffFollowup: {
        propertyId: 'property',
        assigneeName: 'You',
        canManage: false,
        needsReassignment: false,
        waitingFor: 'contractor',
        dueAt: '2026-12-01T12:00:00Z',
      },
    })
  );
  render(<ReportConversation reportId='first' queueSearch='scope=mine' />);
  expect(
    await screen.findByRole('region', { name: 'Property team follow-up' })
  ).toHaveTextContent('You');
  expect(screen.getByText('Contractor response')).toBeInTheDocument();
  expect(screen.getByText('Follow-up due')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Next step' })).toHaveTextContent(
    'Review the original report and share an update'
  );
  expect(screen.queryByText('Manage follow-up')).not.toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Back to action queue' })
  ).toHaveAttribute(
    'href',
    '/properties/work-queue?scope=mine#queue-report-first'
  );
});
it('clears the draft and ignores late history from a previous report', async () => {
  const view = render(<ReportConversation reportId='first' />);
  fireEvent.change(await screen.findByLabelText('Message'), {
    target: { value: 'Private draft' },
  });
  let finish!: (value: unknown) => void;
  fetcher.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  fireEvent.click(screen.getByText('Refresh updates'));
  fetcher.mockResolvedValue(
    response({
      ...historyData(),
      summary: { ...historyData().summary, description: 'Second report' },
    })
  );
  view.rerender(<ReportConversation reportId='second' />);
  await screen.findByText('Second report');
  await act(async () => finish(response(historyData())));
  expect(screen.queryByText('Original tap leak')).toBeNull();
  expect(screen.getByLabelText('Message')).toHaveValue('');
});
it('preserves an unconfirmed message and retries with the same identifier', async () => {
  let attempts = 0;
  fetcher.mockImplementation((url: string, options: RequestInit) => {
    if (options?.method === 'POST') {
      if (++attempts === 1) return Promise.reject(new Error('Response lost'));
      return Promise.resolve(
        response({ messageId: JSON.parse(options.body as string).messageId })
      );
    }
    return Promise.resolve(
      response(historyData(url.includes('latest=true') ? 50 : 0))
    );
  });
  render(<ReportConversation reportId='first' />);
  fireEvent.change(await screen.findByLabelText('Message'), {
    target: { value: 'Case update' },
  });
  fireEvent.click(screen.getByText('Send message'));
  fireEvent.click(await screen.findByText('Retry message'));
  await screen.findByText('Message sent. Showing latest updates.');
  await screen.findByText('Page 3');
  const writes = fetcher.mock.calls.filter(
    (call) => call[1]?.method === 'POST'
  );
  expect(writes).toHaveLength(2);
  expect(writes[0][1].body).toBe(writes[1][1].body);
});
it('rejects malformed history instead of claiming there are no updates', async () => {
  fetcher.mockResolvedValue(response({ messages: null }));
  render(<ReportConversation reportId='first' />);
  await screen.findByRole('alert');
  expect(screen.queryByText('No recorded updates on this page.')).toBeNull();
});
const report = {
  id: 'report-1',
  reporter_name: 'Resident',
  reporter_email: null,
  reporter_phone: null,
  reporter_unit: null,
  category: 'plumbing',
  description: 'Tap leaks in the kitchen.',
  urgency: 'high',
  status: 'new',
  landlord_notes: null,
  created_at: '2026-11-01T10:00:00Z',
  properties: {
    id: 'home',
    property_name: 'Test home',
    address: 'Synthetic address',
  },
};
it.each([
  ['standard', TenantReportsClient],
  ['editorial', MintEditorialTenantReports],
] as const)(
  'opens a targeted report and never marks it converted when opening job creation (%s)',
  async (_name, Component) => {
    render(<Component reports={[report]} initialReportId={report.id} />);
    const link = screen.getByRole('link', { name: /Create marketplace job/i });
    expect(link).toHaveAttribute(
      'href',
      '/jobs/create?tenant_report_id=report-1'
    );
    fireEvent.click(link);
    expect(fetcher).not.toHaveBeenCalled();
    const repair = screen.getByRole('link', { name: 'Open repair case' });
    expect(repair).toHaveAttribute(
      'href',
      '/maintenance/reports/report-1?from=tenant-reports'
    );
    fireEvent.click(repair);
    expect(fetcher).not.toHaveBeenCalled();
    expect(screen.getByText(/No marketplace job is needed/)).toBeVisible();
  }
);
it.each([
  ['standard', TenantReportsClient],
  ['editorial', MintEditorialTenantReports],
] as const)(
  'shows existing job/property links and no duplicate creation action (%s)',
  (_name, Component) => {
    render(
      <Component
        reports={[{ ...report, job_id: 'job-1', status: 'converted' }]}
        initialReportId={report.id}
      />
    );
    expect(
      screen.getByRole('link', { name: 'Open linked job' })
    ).toHaveAttribute('href', '/jobs/job-1');
    expect(screen.getByRole('link', { name: 'Open property' })).toHaveAttribute(
      'href',
      '/properties/home'
    );
    expect(
      screen.queryByRole('link', { name: /Create marketplace job/i })
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reopen' })).toBeNull();
  }
);
it.each([
  ['standard', TenantReportsClient],
  ['editorial', MintEditorialTenantReports],
] as const)(
  'offers explicit recovery for converted reports without a linked job (%s)',
  async (_name, Component) => {
    fetcher.mockResolvedValue(
      response({ report: { ...report, status: 'new' } })
    );
    render(
      <Component
        reports={[{ ...report, status: 'converted' }]}
        initialReportId={report.id}
      />
    );
    expect(screen.getByText('No linked job recorded.')).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        '/api/landlord/reports/report-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'new' }),
        })
      )
    );
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Reopen' })).toBeNull()
    );
  }
);
