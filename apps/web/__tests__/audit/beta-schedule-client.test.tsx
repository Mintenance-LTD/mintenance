import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JobScheduling } from '@/app/jobs/[id]/components/JobScheduling';
const mocks = vi.hoisted(() => ({ csrf: vi.fn(), fetch: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({ getCsrfHeaders: mocks.csrf }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.csrf.mockResolvedValue({ 'x-csrf-token': 'fresh-csrf-token' });
  mocks.fetch.mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'Temporary failure. Retry.' }),
  });
});
afterEach(() => vi.unstubAllGlobals());
it('submits the displayed UK appointment with CSRF and keeps the edited draft on failure', async () => {
  render(
    <JobScheduling
      jobId='garden'
      userRole='contractor'
      userId='contractor'
      contractStatus='accepted'
      initialEditing
      currentSchedule={{
        scheduled_start_date: '2027-07-14T08:00:00Z',
        scheduled_end_date: null,
        scheduled_duration_hours: null,
      }}
    />
  );
  const input = screen.getByLabelText('Start Date & Time *');
  expect(input).toHaveValue('2027-07-14T09:00');
  fireEvent.change(input, { target: { value: '2027-07-15T12:00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Schedule' }));
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());
  expect(mocks.fetch).toHaveBeenCalledWith(
    '/api/jobs/garden/schedule',
    expect.objectContaining({
      headers: expect.objectContaining({ 'x-csrf-token': 'fresh-csrf-token' }),
      body: JSON.stringify({
        scheduled_start_date: '2027-07-15T11:00:00.000Z',
        scheduled_end_date: null,
      }),
    })
  );
  expect(
    await screen.findByText('Temporary failure. Retry.')
  ).toBeInTheDocument();
  expect(input).toHaveValue('2027-07-15T12:00');
});
