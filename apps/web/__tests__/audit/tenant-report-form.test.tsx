import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { TenantReportForm } from '@/app/report/[token]/TenantReportForm';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const property = { property_name: 'Test property', address: 'Test address' };
const response = (data: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => data,
});
it('offers retry for a server failure instead of declaring the link invalid', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response({}, 503))
    .mockResolvedValueOnce(response({ property }));
  vi.stubGlobal('fetch', fetcher);
  render(<TenantReportForm token='test' />);
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Test property')).toBeInTheDocument();
  expect(
    screen.queryByText('This reporting link is unavailable')
  ).not.toBeInTheDocument();
});
it('distinguishes a deactivated link from a temporary failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, 410)));
  render(<TenantReportForm token='test' />);
  expect(
    await screen.findByText('This reporting link is unavailable')
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Try again' })
  ).not.toBeInTheDocument();
});
it('submits urgency and shows the private receipt link and reference', async () => {
  const url = '/maintenance/reports/1234-abcd#' + 'a'.repeat(64);
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response({ property }))
    .mockResolvedValueOnce(
      response({ report_id: '1234-abcd', conversation_url: url }, 201)
    );
  vi.stubGlobal('fetch', fetcher);
  render(<TenantReportForm token='test' />);
  await screen.findByText('Test property');
  fireEvent.change(screen.getByLabelText(/Your name/), {
    target: { value: 'Test Tenant' },
  });
  fireEvent.change(screen.getByLabelText(/Describe the problem/), {
    target: { value: 'The kitchen tap is leaking.' },
  });
  fireEvent.click(screen.getByRole('radio', { name: /Emergency/ }));
  expect(screen.getByRole('alert')).toHaveTextContent('Do not wait');
  fireEvent.click(
    screen.getByRole('button', { name: 'Send maintenance report' })
  );
  expect(
    await screen.findByRole('link', { name: 'View report and replies' })
  ).toHaveAttribute('href', url);
  expect(screen.getByText('1234-abcd')).toBeInTheDocument();
  expect(JSON.parse(fetcher.mock.calls[1][1].body).urgency).toBe('emergency');
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'Your report has been received' })
    ).toHaveFocus()
  );
});
it('keeps entered details after a rejected submission', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(response({ property }))
      .mockResolvedValueOnce(response({}, 429))
  );
  render(<TenantReportForm token='test' />);
  await screen.findByText('Test property');
  fireEvent.change(screen.getByLabelText(/Your name/), {
    target: { value: 'Test Tenant' },
  });
  fireEvent.change(screen.getByLabelText(/Describe the problem/), {
    target: { value: 'The kitchen tap is leaking.' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Send maintenance report' })
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('wait a minute');
  expect(screen.getByLabelText(/Describe the problem/)).toHaveValue(
    'The kitchen tap is leaking.'
  );
});
