import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import VisitResponses from '@/app/appointments/response/page';
import { VisitDetail } from '@/components/scheduling/VisitDetail';
import { JobVisitHistory } from '@/components/scheduling/JobVisitHistory';
import { visitIsPast, type VisitRecord } from '@/lib/scheduling/visit-history';
import { readVisitRecords } from '@/lib/queries/visit-history';
import { MintEditorialJobTimeline } from '@/app/jobs/[id]/components/mint-editorial/MintEditorialJobTimeline';

const mock = vi.hoisted(() => ({
  refresh: vi.fn(),
  search: 'view=past',
  from: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mock.search),
  useRouter: () => ({ refresh: mock.refresh }),
}));
vi.mock('@/components/property-operations/OperationsPage', () => ({
  OperationsPage: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mock.from },
}));
vi.mock('@/lib/csrf-client', () => ({ getCsrfHeaders: async () => ({}) }));
vi.mock('@/lib/hooks/useJobRework', () => ({
  useJobRework: () => ({ requests: [] }),
}));

const id = '10000000-0000-4000-8000-000000000001';
const jobId = '10000000-0000-4000-8000-000000000002';
const slot = {
  date: '2026-11-19',
  start: '10:00:00',
  end: '15:00:00',
  status: 'rescheduled',
  response: 'confirmed',
  respondent: 'Sam Taylor',
};
const oldSlot = {
  ...slot,
  date: '2026-11-17',
  start: '09:00:00',
  end: '17:00:00',
};
const history: NonNullable<VisitRecord['history']> = [
  {
    id: 2,
    kind: 'response',
    previousSlot: null,
    slot,
    recordedAt: '2026-11-18T16:22:00Z',
  },
  {
    id: 1,
    kind: 'rescheduled',
    previousSlot: oldSlot,
    slot: { ...slot, response: 'pending' },
    recordedAt: '2026-11-18T13:15:00Z',
  },
];
const visit: VisitRecord = {
  id,
  title: 'Boiler visit',
  date: slot.date,
  time: slot.start,
  endTime: slot.end,
  status: 'rescheduled',
  clientResponse: 'confirmed',
  canRespond: true,
  client: { id: 'homeowner', name: 'Sam Taylor' },
  job: { id: jobId, title: 'Service boiler' },
  history,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  mock.from.mockReset();
  mock.refresh.mockReset();
  mock.search = 'view=past';
});

it('opens an elapsed scheduled visit read-only with its last response and a separate new-visit action', () => {
  render(
    <VisitDetail
      visit={{
        ...visit,
        status: 'scheduled',
        date: '2000-11-17',
        history: [],
      }}
      role='contractor'
    />
  );
  expect(
    screen.getByText(/Last homeowner response: Confirmed by Sam Taylor/)
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'View job' })).toHaveAttribute(
    'href',
    '/contractor/jobs/' + jobId
  );
  expect(
    screen.getByRole('link', { name: 'Create a new visit' })
  ).toHaveAttribute('href', expect.stringContaining('newVisit=true'));
  expect(
    screen.queryByRole('button', { name: 'Propose a new visit time' })
  ).toBeNull();
  expect(screen.queryByRole('button', { name: 'Confirm visit' })).toBeNull();
});

it.each(['homeowner', 'contractor'] as const)(
  'shows the same previous slot, replacement and confirming client for the %s',
  async (role) => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ appointments: [visit] }));
    vi.stubGlobal('fetch', fetcher);
    render(
      <>
        <VisitDetail visit={visit} role={role} />
        <JobVisitHistory jobId={jobId} role={role} />
      </>
    );
    const detail = screen.getByRole('region', { name: 'Visit history' });
    expect(within(detail).getByText('Previous time')).toBeVisible();
    expect(
      within(detail).getByText('17 November 2026 · 09:00–17:00 UK time')
    ).toBeVisible();
    expect(within(detail).getByText('Proposed time')).toBeVisible();
    expect(
      within(detail).getAllByText('19 November 2026 · 10:00–15:00 UK time')
        .length
    ).toBeGreaterThan(0);
    expect(
      within(detail).getByRole('heading', { name: 'Confirmed by Sam Taylor' })
    ).toBeVisible();
    expect(
      await screen.findByRole('link', { name: 'View visit', exact: true })
    ).toHaveAttribute(
      'href',
      `${role === 'contractor' ? '/contractor' : ''}/appointments/${id}`
    );
    expect(screen.queryByRole('button', { name: 'Confirm visit' })).toBeNull();
  }
);

it('loads past visits as read-only with a link to the exact recorded slot', async () => {
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      appointments: [
        {
          ...visit,
          date: oldSlot.date,
          time: oldSlot.start,
          endTime: oldSlot.end,
          status: 'cancelled',
          history: undefined,
        },
      ],
    })
  );
  vi.stubGlobal('fetch', fetcher);
  render(<VisitResponses />);
  expect(
    await screen.findByText('17 November 2026 · 09:00–17:00 UK time')
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'Past visits' })).toHaveAttribute(
    'aria-current',
    'page'
  );
  expect(screen.getByRole('link', { name: 'View visit' })).toHaveAttribute(
    'href',
    `/appointments/${id}`
  );
  expect(screen.getByText('Visit cancelled')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Confirm visit' })).toBeNull();
  expect(fetcher.mock.calls[0][0]).toContain('view=past');
});

it('adds the reschedule and confirmation to the homeowner job timeline', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ appointments: [visit] }))
  );
  render(
    <MintEditorialJobTimeline
      job={{
        id: jobId,
        title: 'Service boiler',
        description: '',
        category: 'plumbing',
        status: 'in_progress',
        budget: 25,
        location: '',
        created_at: '2026-11-14T08:00:00Z',
      }}
      allBids={[]}
      beforePhotos={[]}
      afterPhotos={[]}
      lifecycle={{ completionConfirmed: false }}
    />
  );
  expect(
    await screen.findByRole('heading', {
      name: 'Boiler visit · Visit rescheduled',
    })
  ).toBeVisible();
  expect(
    screen.getByText('17 November 2026 · 09:00–17:00 UK time')
  ).toBeVisible();
  expect(
    screen.getByRole('heading', {
      name: 'Boiler visit · Confirmed by Sam Taylor',
    })
  ).toBeVisible();
  expect(
    screen
      .getAllByRole('link', { name: 'View visit' })
      .every((link) => link.getAttribute('href') === `/appointments/${id}`)
  ).toBe(true);
});

it('confirms the displayed replacement using its exact date and time', async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ success: true }));
  vi.stubGlobal('fetch', fetcher);
  render(
    <VisitDetail
      visit={{
        ...visit,
        date: '2099-11-20',
        clientResponse: 'pending',
        history: undefined,
      }}
      role='homeowner'
    />
  );
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Confirm visit' }))
  );
  await vi.waitFor(() => expect(mock.refresh).toHaveBeenCalledOnce());
  expect(fetcher.mock.calls[0][0]).toBe('/api/appointments/respond');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    id,
    date: '2099-11-20',
    start: '10:00:00',
    end: '15:00:00',
    response: 'confirmed',
  });
});

it('scopes history to a participant and resolves the recorded client on both accounts', async () => {
  function rows(data: unknown[]) {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
      then: (resolve: (value: unknown) => unknown) =>
        resolve({ data, error: null }),
    };
    for (const key of ['select', 'eq', 'in', 'order'] as const)
      query[key].mockReturnValue(query);
    return query;
  }
  const visitRows = rows([
    {
      id,
      title: visit.title,
      appointment_date: slot.date,
      start_time: slot.start,
      end_time: slot.end,
      status: 'rescheduled',
      client_response: 'confirmed',
      client_id: 'homeowner',
      contractor_id: 'contractor',
      client: { id: 'homeowner', first_name: 'Sam', last_name: 'Taylor' },
      contractor: null,
      job: {
        id: jobId,
        title: 'Service boiler',
        homeowner_id: 'homeowner',
        payer_user_id: 'payer',
      },
    },
  ]);
  const eventRows = rows([
    {
      id: 2,
      appointment_id: id,
      kind: 'response',
      previous_slot: null,
      slot: { ...slot, respondent: undefined, respondedBy: 'homeowner' },
      created_at: history[0].recordedAt,
    },
  ]);
  mock.from.mockImplementation((table: string) =>
    table === 'appointments' ? visitRows : eventRows
  );
  expect(
    await readVisitRecords({ id: 'other', role: 'homeowner' }, { id })
  ).toEqual([]);
  expect(mock.from).toHaveBeenCalledTimes(1);
  const [owner] = await readVisitRecords(
    { id: 'homeowner', role: 'homeowner' },
    { id }
  );
  const [contractor] = await readVisitRecords(
    { id: 'contractor', role: 'contractor' },
    { jobId }
  );
  expect(owner.canRespond).toBe(true);
  expect(contractor.canRespond).toBe(false);
  expect(owner.history).toEqual(contractor.history);
  expect(owner.history?.[0].slot.respondent).toBe('Sam Taylor');
  expect(owner.history?.[0].slot).not.toHaveProperty('respondedBy');
  expect(eventRows.in).toHaveBeenCalledWith('appointment_id', [id]);
});

it('uses the end of the UK slot to move a visit to Past visits', () => {
  const summer = { ...visit, date: '2027-07-15', endTime: '17:00' };
  expect(visitIsPast(summer, new Date('2027-07-15T15:59:59Z'))).toBe(false);
  expect(visitIsPast(summer, new Date('2027-07-15T16:00:00Z'))).toBe(true);
  expect(
    visitIsPast(
      { ...summer, status: 'cancelled' },
      new Date('2027-07-14T15:00:00Z')
    )
  ).toBe(true);
});
