import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { LocationSharing } from '../LocationSharing';
const m = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: m.request }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ location: null }) }))
  );
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition: vi.fn(() => 1),
      clearWatch: vi.fn(),
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
it('does not begin GPS on mount', async () => {
  render(<LocationSharing jobId='job-1' contractorId='contractor-1' />);
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled();
  expect(m.request).not.toHaveBeenCalled();
});
it('starts GPS only after the explicit funded departure succeeds', async () => {
  m.request.mockResolvedValue({ ok: true });
  render(<LocationSharing jobId='job-1' contractorId='contractor-1' />);
  fireEvent.click(screen.getByRole('button', { name: /Going to site/i }));
  await waitFor(() =>
    expect(navigator.geolocation.watchPosition).toHaveBeenCalledTimes(1)
  );
  expect(m.request).toHaveBeenCalledWith(
    '/api/contractor/trips',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ jobId: 'job-1' }),
    })
  );
});
it('does not start GPS when funding is rejected', async () => {
  m.request.mockResolvedValue({
    ok: false,
    json: async () => ({ error: { message: 'Payment must be confirmed' } }),
  });
  render(<LocationSharing jobId='job-1' contractorId='contractor-1' />);
  fireEvent.click(screen.getByRole('button', { name: /Going to site/i }));
  await screen.findByText('Payment must be confirmed');
  expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled();
});
