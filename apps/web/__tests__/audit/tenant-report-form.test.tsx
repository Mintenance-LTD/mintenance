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
  sessionStorage.clear();
  vi.unstubAllGlobals();
});
const property = { property_name: 'Test property', address: 'Test address' };
const reportId = '00000000-0000-4000-8000-000000000001';
const receiptUrl = `/maintenance/reports/${reportId}#` + 'a'.repeat(64);
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
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      response({ property, emergency_phone: '+442079460958' })
    )
    .mockResolvedValueOnce(
      response(
        {
          report_id: reportId,
          conversation_url: receiptUrl,
          acknowledgment: 'pending',
        },
        201
      )
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
  expect(
    screen.getByRole('link', { name: /Call the property emergency contact/ })
  ).toHaveAttribute('href', 'tel:+442079460958');
  fireEvent.click(
    screen.getByRole('button', { name: 'Send maintenance report' })
  );
  expect(
    await screen.findByRole('link', { name: 'View report and replies' })
  ).toHaveAttribute('href', receiptUrl);
  expect(screen.getByText(reportId)).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'awaiting human acknowledgment'
  );
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Do not wait for a reply'
  );
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

function fillReport() {
  fireEvent.change(screen.getByLabelText(/Your name/), {
    target: { value: 'Test Tenant' },
  });
  fireEvent.change(screen.getByLabelText(/Describe the problem/), {
    target: { value: 'The kitchen tap is leaking.' },
  });
}
const send = () =>
  fireEvent.click(
    screen.getByRole('button', { name: 'Send maintenance report' })
  );

it('reuses the attempt after losing a response without storing a private key by default', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response({ property }))
    .mockRejectedValueOnce(new TypeError('connection lost'))
    .mockResolvedValueOnce(
      response({ report_id: reportId, conversation_url: receiptUrl })
    );
  vi.stubGlobal('fetch', fetcher);
  render(<TenantReportForm token='test' />);
  await screen.findByText('Test property');
  fillReport();
  send();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Retry this attempt'
  );
  expect(sessionStorage.length).toBe(0);
  send();
  expect(
    await screen.findByRole('link', { name: 'View report and replies' })
  ).toHaveAttribute('href', receiptUrl);
  const [, first, retry] = fetcher.mock.calls;
  expect(first[1].headers['x-report-submission-key']).toMatch(/^[a-f0-9]{64}$/);
  expect(retry[1].headers).toEqual(first[1].headers);
  expect(retry[1].body).toEqual(first[1].body);
});

it('recovers after reload with explicit consent and can forget the temporary key', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response({ property }))
    .mockRejectedValueOnce(new TypeError('connection lost'))
    .mockResolvedValueOnce(response({ property }))
    .mockResolvedValueOnce(
      response({ report_id: reportId, conversation_url: receiptUrl })
    );
  vi.stubGlobal('fetch', fetcher);
  const initial = render(<TenantReportForm token='test' />);
  await screen.findByText('Test property');
  fireEvent.click(
    screen.getByRole('checkbox', { name: /Allow recovery in this tab/ })
  );
  fillReport();
  send();
  await screen.findByRole('alert');
  const stored = sessionStorage.getItem('mintenance:report-recovery:test')!;
  expect(Object.keys(JSON.parse(stored)).sort()).toEqual(['expiresAt', 'key']);
  expect(stored).not.toContain('Test Tenant');
  expect(stored).not.toContain('kitchen tap');
  initial.unmount();

  render(<TenantReportForm token='test' />);
  await screen.findByText('Test property');
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(screen.getByLabelText(/Describe the problem/)).toHaveValue('');
  fireEvent.click(
    screen.getByRole('button', { name: 'Recover a saved report' })
  );
  expect(
    await screen.findByRole('link', { name: 'View report and replies' })
  ).toHaveAttribute('href', receiptUrl);
  const r = fetcher.mock.calls[3][1];
  expect(r.body).toBe(JSON.stringify({ recover: true }));
  expect(r.headers['x-report-submission-key']).toBe(JSON.parse(stored).key);
  fireEvent.click(
    screen.getByRole('button', { name: 'Forget recovery in this tab' })
  );
  expect(sessionStorage.length).toBe(0);
});
