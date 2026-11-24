import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { JobScheduling } from '@/app/jobs/[id]/components/JobScheduling';
const mocks = vi.hoisted(() => ({ csrf: vi.fn(), fetch: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({ getCsrfHeaders: mocks.csrf }));
const current = {
  scheduled_start_date: '2027-07-14T08:00:00Z',
  scheduled_end_date: null,
  scheduled_duration_hours: null,
};
const proposal = {
  id: 'pending',
  state: 'pending',
  startsAt: '2027-07-15T11:00:00Z',
  endsAt: null,
  durationHours: null,
  yourProposal: false,
  canRespond: true,
  awaitingRole: 'homeowner',
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.csrf.mockResolvedValue({ 'x-csrf-token': 'fresh-csrf-token' });
});
afterEach(() => vi.unstubAllGlobals());
const renderSchedule = (initialEditing = false) =>
  render(
    <JobScheduling
      jobId='garden'
      userRole='contractor'
      userId='contractor'
      contractStatus='accepted'
      initialEditing={initialEditing}
      currentSchedule={current}
    />
  );

it('submits the displayed UK time with CSRF and keeps the draft when the queue write fails', async () => {
  mocks.fetch.mockImplementation((_url, options) =>
    Promise.resolve(
      options.method === 'POST'
        ? Response.json({ error: 'Temporary failure. Retry.' }, { status: 503 })
        : Response.json({ ...current, active: true, proposal: null })
    )
  );
  renderSchedule(true);
  const getStart = () => screen.getByLabelText('Start date and time (UK)');
  expect(await screen.findByLabelText('Start date and time (UK)')).toHaveValue(
    '2027-07-14T09:00'
  );
  fireEvent.change(getStart(), { target: { value: '2027-07-15T12:00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send proposal' }));
  await waitFor(() =>
    expect(mocks.fetch).toHaveBeenCalledWith(
      '/api/jobs/garden/schedule',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-csrf-token': 'fresh-csrf-token',
        }),
        body: JSON.stringify({
          scheduled_start_date: '2027-07-15T11:00:00.000Z',
          scheduled_end_date: null,
        }),
      })
    )
  );
  expect(
    await screen.findByText('Temporary failure. Retry.')
  ).toBeInTheDocument();
  expect(getStart()).toHaveValue('2027-07-15T12:00');
});

it('shows the current window beside the proposal and displays the new date after accepting it', async () => {
  mocks.fetch
    .mockResolvedValueOnce(
      Response.json({ ...current, active: true, proposal })
    )
    .mockResolvedValueOnce(
      Response.json({ proposal: { id: 'pending', state: 'accepted' } })
    )
    .mockResolvedValueOnce(
      Response.json({
        ...current,
        scheduled_start_date: proposal.startsAt,
        active: true,
        proposal: { ...proposal, state: 'accepted' },
      })
    );
  renderSchedule();
  const button = await screen.findByRole('button', {
    name: 'Accept proposed dates',
  });
  const workWindow = within(
    screen.getByRole('region', { name: 'Current work window' })
  );
  expect(workWindow.getByText(/14 July 2027/)).toBeVisible();
  expect(workWindow.getByText(/15 July 2027/)).toBeVisible();
  expect(workWindow.getByText('Waiting for your response.')).toBeVisible();
  fireEvent.click(button);
  await waitFor(() =>
    expect(workWindow.queryByText(/14 July 2027/)).toBeNull()
  );
  expect(workWindow.getByText(/15 July 2027/)).toBeVisible();
});
