import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { EmergencyReportsClient } from '@/app/maintenance/emergencies/EmergencyReportsClient';
vi.mock('@/lib/hooks/useCSRF', () => ({
  useCSRF: () => ({
    csrfToken: 'csrf',
    getCsrfHeaders: () => ({ 'x-csrf-token': 'csrf' }),
  }),
}));
const report = {
  report_id: 'report',
  property_id: 'property',
  property_name: 'Test property',
  description: 'Synthetic emergency',
  assignee_name: 'Fallback manager',
  due_at: '2026-11-23T23:15:00Z',
  escalated_at: '2026-11-23T23:00:00Z',
  needs_attention: false,
  acknowledged_at: null,
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('keeps responsibility pending when acknowledgment fails and permits retry', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        incident: {
          report_id: 'report',
          acknowledged_at: '2026-11-23T23:01:00Z',
        },
      }),
    });
  vi.stubGlobal('fetch', fetcher);
  render(<EmergencyReportsClient initialReports={[report]} />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Acknowledge responsibility' })
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'could not be confirmed'
  );
  expect(screen.queryByText(/Acknowledged —/)).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Acknowledge responsibility' })
  );
  expect(await screen.findByRole('status')).toHaveTextContent('Acknowledged');
  expect(fetcher).toHaveBeenLastCalledWith(
    '/api/landlord/emergency-reports',
    expect.objectContaining({
      method: 'PATCH',
      headers: expect.objectContaining({ 'x-csrf-token': 'csrf' }),
      body: JSON.stringify({ report_id: 'report' }),
    })
  );
});
it('does not optimistically acknowledge while the server is pending', async () => {
  let resolve!: (response: unknown) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    )
  );
  render(<EmergencyReportsClient initialReports={[report]} />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Acknowledge responsibility' })
  );
  expect(screen.getByRole('button', { name: /Confirming/ })).toBeDisabled();
  expect(screen.getByText(/awaiting acknowledgment/)).toBeInTheDocument();
  resolve({ ok: false });
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Acknowledge responsibility' })
    ).toBeEnabled()
  );
});
it('exposes uncovered reports instead of claiming someone is responding', () => {
  render(
    <EmergencyReportsClient
      initialReports={[{ ...report, needs_attention: true }]}
    />
  );
  expect(screen.getByRole('alert')).toHaveTextContent(
    'no responder has acknowledged'
  );
  expect(screen.getByText(/not a response guarantee/)).toBeInTheDocument();
});
