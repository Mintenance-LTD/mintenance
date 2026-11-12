import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CertificateFormModal } from '@/app/properties/compliance/components/CertificateFormModal';
const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  success: vi.fn(),
  csrf: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: mocks.success } }));
vi.mock('@/lib/csrf-client', () => ({ getCsrfHeaders: () => mocks.csrf() }));
const props = {
  propertyId: 'property',
  propertyName: 'Test property',
  initialCertType: 'gas_safety',
  onClose: vi.fn(),
};
const response = (data: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => data,
});
const certificate = {
  id: 'certificate',
  property_id: 'property',
  cert_type: 'gas_safety',
  certificate_number: 'TEST-123',
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function fill() {
  fireEvent.change(screen.getByLabelText('Certificate number'), {
    target: { value: 'TEST-123' },
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.csrf.mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('locks duplicate submits, inputs, Escape, backdrop and close while saving', async () => {
  const pending = deferred<ReturnType<typeof response>>();
  const fetch = vi.fn().mockReturnValue(pending.promise);
  vi.stubGlobal('fetch', fetch);
  render(<CertificateFormModal {...props} />);
  fill();
  fireEvent.submit(screen.getByRole('form'));
  fireEvent.submit(screen.getByRole('form'));
  fireEvent.keyDown(document, { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: 'Close', exact: true }));
  fireEvent.click(screen.getByRole('dialog').parentElement!);
  expect(props.onClose).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Certificate number')).toBeDisabled();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  await act(async () => pending.resolve(response({ certificate })));
  expect(props.onClose).toHaveBeenCalledTimes(1);
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
  expect(mocks.success).toHaveBeenCalledWith('Certificate saved');
});

it('shows structured validation errors and retains fields for a corrected retry', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      response(
        {
          error: { message: 'Check the expiry' },
          errors: [
            { field: 'expiry_date', message: 'Expiry precedes issue' },
            null,
          ],
        },
        400
      )
    )
    .mockResolvedValueOnce(response({ certificate }));
  vi.stubGlobal('fetch', fetch);
  render(<CertificateFormModal {...props} />);
  fill();
  fireEvent.submit(screen.getByRole('form'));
  await screen.findByText('Check the expiry');
  expect(screen.getByText('Expiry precedes issue')).toBeTruthy();
  expect(screen.getByLabelText('Certificate number')).toHaveValue('TEST-123');
  fireEvent.submit(screen.getByRole('form'));
  await waitFor(() => expect(mocks.success).toHaveBeenCalledTimes(1));
});

it.each([
  {},
  { certificate: { ...certificate, property_id: 'other' } },
  { certificate: { ...certificate, certificate_number: 'OTHER' } },
])(
  'requires record review after an incomplete or mismatched success (%#)',
  async (body) => {
    const fetch = vi.fn().mockResolvedValue(response(body));
    vi.stubGlobal('fetch', fetch);
    render(<CertificateFormModal {...props} />);
    fill();
    fireEvent.submit(screen.getByRole('form'));
    await screen.findByText(/Certificate save could not be confirmed/);
    expect(screen.getByLabelText('Certificate number')).toHaveValue('TEST-123');
    expect(
      screen.getByRole('button', { name: 'Save certificate' })
    ).toBeDisabled();
    fireEvent.submit(screen.getByRole('form'));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mocks.success).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Close and review saved records' })
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  }
);

it('retains drafts after an uncertain network failure and does not replay automatically', async () => {
  const fetch = vi.fn().mockRejectedValue(new Error('response lost'));
  vi.stubGlobal('fetch', fetch);
  render(<CertificateFormModal {...props} />);
  fill();
  fireEvent.submit(screen.getByRole('form'));
  await screen.findByText(/Your draft is retained/);
  fireEvent.submit(screen.getByRole('form'));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(props.onClose).not.toHaveBeenCalled();
});

it('permits retry when CSRF preparation failed before a write was sent', async () => {
  mocks.csrf.mockRejectedValueOnce(new Error('offline'));
  const fetch = vi.fn().mockResolvedValue(response({ certificate }));
  vi.stubGlobal('fetch', fetch);
  render(<CertificateFormModal {...props} />);
  fill();
  fireEvent.submit(screen.getByRole('form'));
  await screen.findByText(/Could not start the save/);
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.submit(screen.getByRole('form'));
  await waitFor(() => expect(mocks.success).toHaveBeenCalled());
});

it('isolates properties/types and ignores an old save completing after navigation', async () => {
  const pending = deferred<ReturnType<typeof response>>();
  vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending.promise));
  const view = render(<CertificateFormModal {...props} />);
  fill();
  fireEvent.submit(screen.getByRole('form'));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  view.rerender(
    <CertificateFormModal
      {...props}
      propertyId='another'
      initialCertType='eicr'
    />
  );
  expect(screen.getByLabelText('Certificate number')).toHaveValue('');
  expect(screen.getByLabelText('Certificate type')).toHaveValue('eicr');
  fireEvent.change(screen.getByLabelText('Certificate number'), {
    target: { value: 'NEXT' },
  });
  await act(async () => pending.resolve(response({ certificate })));
  expect(screen.getByLabelText('Certificate number')).toHaveValue('NEXT');
  expect(props.onClose).not.toHaveBeenCalled();
  expect(mocks.success).not.toHaveBeenCalled();
});

it('turns a write timeout into explicit review recovery', async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(new DOMException('Timeout', 'AbortError'))
          );
        })
    )
  );
  render(<CertificateFormModal {...props} />);
  fill();
  fireEvent.submit(screen.getByRole('form'));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15000);
  });
  expect(
    screen.getByRole('button', { name: 'Save certificate' })
  ).toBeDisabled();
  expect(screen.getByText(/Your draft is retained/)).toBeTruthy();
});

it('keeps focus within the dialog and restores the opening control', () => {
  const opener = document.createElement('button');
  document.body.append(opener);
  opener.focus();
  const view = render(<CertificateFormModal {...props} />);
  expect(screen.getByLabelText('Certificate type')).toHaveFocus();
  screen.getByRole('button', { name: 'Save certificate' }).focus();
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(
    screen.getByRole('button', { name: 'Close', exact: true })
  ).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(
    screen.getByRole('button', { name: 'Save certificate' })
  ).toHaveFocus();
  view.unmount();
  expect(opener).toHaveFocus();
  opener.remove();
});

it('explains permission loss and blocks another submission until records are reviewed', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(response({ error: { message: 'Forbidden' } }, 403));
  vi.stubGlobal('fetch', fetch);
  render(<CertificateFormModal {...props} />);
  expect(
    screen.getByText(/Blank fields clear previously recorded details/)
  ).toBeTruthy();
  fill();
  fireEvent.submit(screen.getByRole('form'));
  await screen.findByText(/Access unavailable/);
  expect(
    screen.getByRole('button', { name: 'Save certificate' })
  ).toBeDisabled();
  expect(screen.getByLabelText('Certificate number')).toHaveValue('TEST-123');
  fireEvent.submit(screen.getByRole('form'));
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('releases a stalled CSRF preparation and never submits when its late response arrives', async () => {
  vi.useFakeTimers();
  const pending = deferred<Record<string, string>>();
  mocks.csrf.mockReturnValue(pending.promise);
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  render(<CertificateFormModal {...props} />);
  fill();
  fireEvent.submit(screen.getByRole('form'));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15000);
  });
  expect(screen.getByText(/Could not start the save/)).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Save certificate' })
  ).not.toBeDisabled();
  await act(async () => pending.resolve({ 'X-CSRF-Token': 'late' }));
  expect(fetch).not.toHaveBeenCalled();
});
